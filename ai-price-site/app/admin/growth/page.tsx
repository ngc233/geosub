import AdminLink from "@/components/admin/AdminLink";
import { AdminCard, AdminPageHeader, AdminStatCard } from "../../../components/admin/AdminCard";
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
} from "../../../components/admin/AdminTable";
import {
  GROWTH_INTELLIGENCE_WINDOW_DAYS,
  getGrowthIntelligenceOverview,
  parseGrowthIntelligenceWindowDays,
  type GrowthIntelligenceOverview,
} from "../../../lib/growth-intelligence-read-model";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function statusLabel(status: "complete" | "partial" | "unavailable") {
  if (status === "complete") return "完整";
  if (status === "partial") return "部分可用";
  return "不可用";
}

function statusClass(status: "complete" | "partial" | "unavailable") {
  if (status === "complete") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  return "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
}

function sourceModeLabel(source: GrowthIntelligenceOverview["sources"]["bingWebmaster"]) {
  if (source.evidence?.method === "server_api") return "服务器 API 快照";
  if (source.mode === "manual_import") return "手动导入";
  return "历史基线";
}

function SourceCard({
  label,
  source,
}: {
  label: string;
  source: GrowthIntelligenceOverview["sources"]["bingWebmaster"];
}) {
  return (
    <AdminCard className="dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{label}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {sourceModeLabel(source)}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(source.status)}`}>
          {statusLabel(source.status)}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">点击</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-slate-950 dark:text-slate-50">{formatNumber(source.totals.clicks)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400">展示</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-slate-950 dark:text-slate-50">{formatNumber(source.totals.impressions)}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {source.periodStart && source.periodEnd ? `${source.periodStart} 至 ${source.periodEnd}` : "暂无有效观察期"}
      </p>
      <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {source.limitations.slice(0, 2).map((limitation) => <li key={limitation}>· {limitation}</li>)}
      </ul>
    </AdminCard>
  );
}

export default async function AdminGrowthPage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const days = parseGrowthIntelligenceWindowDays(params.days) ?? 30;
  const overview = await getGrowthIntelligenceOverview(days);
  const firstParty = overview.sources.firstPartyPageViews;
  const behavior = overview.sources.firstPartyBehavior.searchDemand;
  const totalViews = firstParty.daily.reduce((total, row) => total + row.views, 0);
  const noResultRate = behavior.totalSearches > 0
    ? (behavior.totalNoResults / behavior.totalSearches) * 100
    : 0;
  const visibleOpportunities = overview.opportunities.onsiteSearch;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Growth"
        title="增长周报"
        description="把站内行为、搜索需求和搜索平台观察放在同一个只读视图里，先确认数据是否完整，再决定是否安排发布或实验。"
        action={(
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {GROWTH_INTELLIGENCE_WINDOW_DAYS.map((range) => (
              <AdminLink
                key={range}
                href={`/admin/growth?days=${range}`}
                aria-current={days === range ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-bold transition ${days === range ? "bg-blue-700 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}
              >
                {range} 天
              </AdminLink>
            ))}
          </div>
        )}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="站内 PV" value={formatNumber(totalViews)} helper={`最近 ${days} 天 · cookieless_page_views`} />
        <AdminStatCard label="站内搜索" value={formatNumber(behavior.totalSearches)} helper={`${formatNumber(behavior.uniqueTerms)} 个关键词`} />
        <AdminStatCard label="无结果率" value={formatPercent(noResultRate)} helper={`${formatNumber(behavior.totalNoResults)} 次没有匹配内容`} />
        <AdminStatCard label="可见机会" value={formatNumber(visibleOpportunities.length)} helper="达到展示门槛并通过敏感文本过滤" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <SourceCard label="Bing Webmaster" source={overview.sources.bingWebmaster} />
        <SourceCard label="Google Search Console" source={overview.sources.googleSearchConsole} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <AdminTableShell
          title="站内 PV 逐日记录"
          description={`${overview.window.periodStart} 至 ${overview.window.periodEnd} · 当前 UTC 日为部分数据`}
        >
          <AdminTable>
            <AdminTableHead>
              <tr><AdminTh>日期</AdminTh><AdminTh align="right">PV</AdminTh><AdminTh>完整性</AdminTh></tr>
            </AdminTableHead>
            <AdminTableBody>
              {firstParty.daily.length === 0 ? (
                <AdminTr><td colSpan={3} className="px-6 py-5 text-slate-500 dark:text-slate-400">当前窗口没有站内记录。</td></AdminTr>
              ) : firstParty.daily.map((row) => (
                <AdminTr key={row.date}>
                  <AdminTd>{row.date}</AdminTd>
                  <AdminTd align="right"><span className="font-bold tabular-nums">{formatNumber(row.views)}</span></AdminTd>
                  <AdminTd><span className={`rounded-full border px-2 py-1 text-xs font-bold ${row.complete ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>{row.complete ? "完整日" : "进行中"}</span></AdminTd>
                </AdminTr>
              ))}
            </AdminTableBody>
          </AdminTable>
        </AdminTableShell>

        <AdminTableShell
          title="站内搜索机会"
          description="只显示满足最小样本量且通过安全过滤的关键词"
        >
          <AdminTable>
            <AdminTableHead>
              <tr><AdminTh>关键词</AdminTh><AdminTh align="right">搜索</AdminTh><AdminTh>阶段</AdminTh></tr>
            </AdminTableHead>
            <AdminTableBody>
              {visibleOpportunities.length === 0 ? (
                <AdminTr><td colSpan={3} className="px-6 py-5 text-slate-500 dark:text-slate-400">当前窗口没有达到展示门槛的机会。</td></AdminTr>
              ) : visibleOpportunities.slice(0, 8).map((item) => (
                <AdminTr key={`${item.query}-${item.locales.join(",")}`}>
                  <AdminTd><span className="font-semibold text-slate-950 dark:text-slate-50">{item.query}</span><span className="mt-1 block text-xs text-slate-400">{item.locales.join("、")}</span></AdminTd>
                  <AdminTd align="right"><span className="font-bold tabular-nums">{formatNumber(item.searchCount)}</span></AdminTd>
                  <AdminTd>{item.stage}</AdminTd>
                </AdminTr>
              ))}
            </AdminTableBody>
          </AdminTable>
        </AdminTableShell>
      </div>

      <AdminCard className="dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-slate-50">当前证据边界</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">本页只读展示证据，不会自动执行内容发布、采集或实验解锁。</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">过渡读模型</span>
        </div>
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          {overview.limitations.map((limitation) => <li key={limitation}>· {limitation}</li>)}
        </ul>
        <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">生成时间：{new Date(overview.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p>
      </AdminCard>
    </div>
  );
}
