import { buildDailyGrowthSnapshot, buildWeeklyGrowthReport, canonicalGrowthHash,
  type GrowthExperimentLockV1, type GrowthSourceSnapshotV1 } from "./growth-intelligence.ts";
import { growthDateOffset, growthIsoDate, validateGrowthSearchEvidence } from "./growth-search-evidence.ts";

export type GrowthFirstPartyEvidence = {
  metric: "cookieless_page_views";
  sourceTimezone: "UTC";
  databaseSnapshotAt: string;
  collectedAt: string;
  days: { date: string; value: number }[];
};

function validateFirstParty(value: GrowthFirstPartyEvidence) {
  if (value.metric !== "cookieless_page_views" || value.sourceTimezone !== "UTC"
    || !Number.isFinite(Date.parse(value.databaseSnapshotAt)) || !Number.isFinite(Date.parse(value.collectedAt))
    || value.databaseSnapshotAt > value.collectedAt) throw new TypeError("Invalid first-party provenance.");
  const days = value.days.map((row) => {
    growthIsoDate(row.date);
    if (!Number.isSafeInteger(row.value) || row.value < 0 || row.date > value.databaseSnapshotAt.slice(0, 10)) {
      throw new TypeError("Invalid first-party daily count.");
    }
    return { date: row.date, value: row.value };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(days.map((row) => row.date)).size !== days.length) throw new TypeError("Duplicate first-party date.");
  return { metric: value.metric, sourceTimezone: value.sourceTimezone,
    databaseSnapshotAt: value.databaseSnapshotAt, collectedAt: value.collectedAt, days };
}

function week(dates: string[], rows: { date: string; value: number }[]) {
  const missingDates = dates.filter((date) => !rows.some((row) => row.date === date));
  const observedTotal = rows.filter((row) => dates.includes(row.date)).reduce((sum, row) => sum + row.value, 0);
  if (!Number.isSafeInteger(observedTotal)) throw new TypeError("Weekly sum exceeds safe integer range.");
  return { periodStart: dates[0], periodEnd: dates[6], observedTotal,
    total: missingDates.length === 0 ? observedTotal : null, daysPresent: 7 - missingDates.length, missingDates };
}
function metricRow(source: string, scope: string, metric: string, dates: string[], rows: { date: string; value: number }[]) {
  const previous = week(dates.slice(0, 7), rows);
  const current = week(dates.slice(7), rows);
  const delta = previous.total !== null && current.total !== null ? current.total - previous.total : null;
  return { source, scope, metric, previous, current,
    observedDelta: delta,
    observedPercentChange: delta !== null && previous.total !== 0 ? delta / previous.total! * 100 : null };
}

export function buildGrowthWeeklyReadout({ evidence: inputs, firstParty: firstPartyInput, endDate, generatedAt, experimentLocks }: {
  evidence: unknown[]; firstParty: GrowthFirstPartyEvidence; endDate: string; generatedAt: string;
  experimentLocks: readonly GrowthExperimentLockV1[];
}) {
  growthIsoDate(endDate);
  const evidence = inputs.map(validateGrowthSearchEvidence).sort((a, b) => a.engine.localeCompare(b.engine));
  if (evidence.length !== 2 || new Set(evidence.map((item) => item.engine)).size !== 2) {
    throw new TypeError("One Google and one Bing evidence file are required; missing providers must stay explicit.");
  }
  const firstParty = validateFirstParty(firstPartyInput);
  const dates = Array.from({ length: 14 }, (_, i) => growthDateOffset(endDate, i - 13));
  const metrics = evidence.flatMap((source) => ["clicks", "impressions"].map((metric) => metricRow(
    source.engine, source.searchType, metric, dates,
    source.days.map((day) => ({ date: day.date, value: day[metric as "clicks" | "impressions"] })),
  )));
  metrics.push(metricRow("first_party", "global_daily_stats_UTC", "cookieless_page_views", dates, firstParty.days));
  const dailySnapshots = dates.map((date) => {
    const sources: GrowthSourceSnapshotV1[] = evidence.map((source) => {
      const day = source.days.find((row) => row.date === date);
      return { source: source.engine === "google" ? "google_search_console" : "bing_webmaster",
        periodStart: date, periodEnd: date, settledThrough: null, sourceTimezone: source.sourceTimezone,
        collectedAt: source.collectedAt, status: day ? "partial" : "unavailable",
        sampling: { kind: "browser_observation", missingShare: null },
        contractVersion: `${source.schemaVersion}:${source.searchType}:site_daily`,
        facts: day ? { clicks: day.clicks, impressions: day.impressions, searchType: source.searchType } : null,
        limitations: ["Provider settlement was not supplied; daily values are observations, not finalized growth evidence."] };
    });
    const stat = firstParty.days.find((row) => row.date === date);
    sources.push({ source: "first_party_daily_stats", periodStart: date, periodEnd: date, settledThrough: null,
      sourceTimezone: "UTC", collectedAt: firstParty.collectedAt, status: stat ? "partial" : "unavailable",
      sampling: { kind: "local_restored_database", missingShare: null }, contractVersion: "cookieless_page_views.global.v1",
      facts: stat ? { pageViews: stat.value, databaseSnapshotAt: firstParty.databaseSnapshotAt } : null,
      limitations: ["Request-based page-view counters are not visitors; filtering and finalization have not been audited."] });
    return buildDailyGrowthSnapshot({ date, generatedAt, comparisonKey: "geosub:source-separated:v1", sources });
  });
  const gate = buildWeeklyGrowthReport({ days: dailySnapshots.slice(7), recommendations: [], experimentLocks, generatedAt });
  const payload = {
    schemaVersion: "growth-weekly-readout.v1", periodStart: dates[7], periodEnd: endDate,
    comparisonStart: dates[0], comparisonEnd: dates[6], status: gate.status,
    comparisonReady: gate.comparisonReady, actionable: gate.actionable, metrics,
    sourceEvidence: evidence.map((source) => ({ engine: source.engine, evidenceHash: canonicalGrowthHash(source),
      method: source.method, collectedAt: source.collectedAt, sourceTimezone: source.sourceTimezone,
      periodStart: source.periodStart, periodEnd: source.periodEnd, searchType: source.searchType,
      settledThrough: source.settledThrough, pageScope: source.pages.searchType, pageCoverage: source.pages.coverage,
      availablePageRows: source.pages.availableRows, capturedPageRows: source.pages.rows.length,
      roundedPageRows: source.pages.rows.filter((row) => row.impressions === null).length })),
    firstParty: { evidenceHash: canonicalGrowthHash(firstParty), databaseSnapshotAt: firstParty.databaseSnapshotAt,
      collectedAt: firstParty.collectedAt, metric: firstParty.metric, sourceTimezone: firstParty.sourceTimezone },
    pageObservations: evidence.map((source) => ({ engine: source.engine, periodStart: source.periodStart,
      periodEnd: source.periodEnd, searchType: source.pages.searchType, rows: source.pages.rows })),
    experimentLocks: [...experimentLocks].sort((a, b) => a.experimentId.localeCompare(b.experimentId)),
    snapshotHashes: dailySnapshots.map((day) => day.snapshotHash),
    limitations: [
      "浏览器观察没有提供最终结算标记；本报告记录已见数值，不能据此认定发布改善或解锁实验。",
      "Google Web、Bing Web and Chat 和站内 PV 分别展示，不相加、不计算跨来源转化率。",
      "页面表是另一个维度、另一个覆盖范围；两周页面数据不用于解释单周变化，也不冒充全站总数。",
      "站内 PV 的缺失日期保持缺失；未审计机器人/内部流量过滤，因此不能当作用户数。",
      "尚无事先定义的增长目标、同口径页面周对比或实验归因证据，故不判定达标或因果改善。",
    ],
  };
  return { ...payload, reportHash: canonicalGrowthHash(payload), generatedAt, dailySnapshots };
}

export type GrowthWeeklyReadout = ReturnType<typeof buildGrowthWeeklyReadout>;
export function renderGrowthWeeklyMarkdown(report: GrowthWeeklyReadout) {
  const number = (value: number | null) => value === null ? "缺失/不可比" : value.toLocaleString("en-US");
  const names: Record<string, string> = { google: "Google", bing: "Bing", first_party: "站内", clicks: "点击", impressions: "展示", cookieless_page_views: "PV" };
  const lines = ["# GeoSub 首份增长周报：先建立可复核的观察基线", "",
    `本期 ${report.periodStart} — ${report.periodEnd}；比较期 ${report.comparisonStart} — ${report.comparisonEnd}。`, "",
    "状态：partial；结算状态未知。下表的变化是已观察数值之差，不是发布效果结论。", "",
    "| 来源 / 范围 | 指标 | 上期 | 本期 | 观察变化 |", "|---|---|---:|---:|---:|",
    ...report.metrics.map((m) => `| ${names[m.source]} / ${m.scope} | ${names[m.metric]} | ${number(m.previous.total)} (${m.previous.daysPresent}/7 天) | ${number(m.current.total)} (${m.current.daysPresent}/7 天) | ${number(m.observedDelta)}${m.observedPercentChange === null ? "" : ` (${m.observedPercentChange.toFixed(1)}%)`} |`),
    "", "## 可以据此做什么", "",
    "本次解决的问题是：判断下一步开发方向时，过去只有旧基线和不完整的统计入口。现在两家搜索引擎的逐日观察与站内计数已有独立口径、校验、输入哈希和可重跑报告。", "",
    "下一步先补齐服务端数据授权、结算标记和连续观察期，再用同一页面与同一来源的前后窗口评估发布。暂不把本周波动归因给任何功能，也不依据两周页面排行榜改动冻结页。", "",
    "每次发布记录：用户问题 → 具体改动 → 主指标及来源/分母 → 基线窗口 → 验收窗口 → 护栏与回滚条件 → 观察结果及限制。", "",
    "## 数据边界", "", ...report.limitations.map((item) => `- ${item}`), "",
    "## 保持生效的实验锁", "", ...report.experimentLocks.filter((lock) => lock.active).map((lock) => `- ${lock.target.canonicalPath}：${lock.experimentId}；达到日期不自动解锁。`), "",
    "## 来源与复核", "", ...report.sourceEvidence.map((source) => `- ${source.engine}：${source.periodStart} 至 ${source.periodEnd}，${source.searchType}；${source.method}；采集 ${source.collectedAt}；页面 ${source.capturedPageRows}/${source.availablePageRows} 行，其中 ${source.roundedPageRows} 行仅有缩写展示量。输入 ${source.evidenceHash}。`),
    `- 站内：本地恢复库 daily_stats / global / cookieless_page_views / UTC；数据库快照 ${report.firstParty.databaseSnapshotAt}；输入 ${report.firstParty.evidenceHash}。`,
    `- 报告 ${report.reportHash}；生成 ${report.generatedAt}。`, "",
  ];
  return lines.join("\n");
}
