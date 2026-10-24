import {
  canonicalizeObservedSearchPath,
  type SeoSearchEngine,
  type SeoSearchPageObservation,
} from "./seo-search-performance-baseline.ts";

export const SEO_SEARCH_PAGE_IMPORT_SETTING_KEY =
  "seo.search_page_observation_imports.v1";
export const SEO_SEARCH_PAGE_IMPORT_HISTORY_LIMIT = 8;
export const SEO_SEARCH_PAGE_IMPORT_ROW_LIMIT = 500;
export const SEO_SEARCH_PAGE_IMPORT_TEXT_LIMIT = 250_000;

export type SeoSearchImportEvidence = {
  evidenceHash: string;
  method: "browser_observation" | "server_api";
  searchType: "web";
  sourceTimezone: string;
  coverage: "selected_rows";
  availableRows: number;
  capturedRows: number;
  excludedRoundedRows: number;
};

export type SeoSearchPageImportBatch = {
  id: string;
  engine: SeoSearchEngine;
  periodStart: string;
  periodEnd: string;
  importedAt: string;
  actorLabel: string;
  observations: SeoSearchPageObservation[];
  evidence?: SeoSearchImportEvidence;
};

export type SeoSearchPageImportState = {
  version: 1;
  batches: SeoSearchPageImportBatch[];
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PUBLIC_PATH_PATTERN =
  /^\/(?:zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)(?:\/|$)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
}

function normalizePublicPath(value: string) {
  let path = value.trim().replace(/^\uFEFF/, "");
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      if (hostname !== "geosub.org") return null;
      path = `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }

  if (!path.startsWith("/") || path.startsWith("/admin")) return null;
  const canonical = canonicalizeObservedSearchPath(path.split("#", 1)[0]);
  if (!PUBLIC_PATH_PATTERN.test(canonical)) return null;
  return canonical.length > 1 ? canonical.replace(/\/$/, "") : canonical;
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  if (quoted) throw new Error("Unclosed quoted cell.");
  return cells;
}

function detectDelimiter(header: string) {
  const candidates = ["\t", ",", ";"];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: parseDelimitedLine(header, delimiter).length,
    }))
    .sort((left, right) => right.count - left.count)[0].delimiter;
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES = {
  path: new Set([
    "page", "pages", "url", "path", "toppages", "网页", "页面", "热门网页", "网址",
  ]),
  clicks: new Set(["click", "clicks", "点击", "点击次数"]),
  impressions: new Set(["impression", "impressions", "展示", "展示次数"]),
  position: new Set([
    "position", "averageposition", "avgposition", "排名", "平均排名",
  ]),
};

// Bing's Chinese CSV uses "impression count" instead of Search Console's
// "display count" for the same metric.
HEADER_ALIASES.impressions.add("\u5370\u8c61\u6570");

function headerIndex(headers: string[], aliases: Set<string>) {
  return headers.findIndex((header) => aliases.has(normalizeHeader(header)));
}

function parseCount(value: string) {
  const normalized = value.replace(/[\s,]/g, "");
  if (!/^\d+$/.test(normalized)) return Number.NaN;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

function parsePosition(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1000
    ? Math.round(parsed * 100) / 100
    : Number.NaN;
}

export type SeoSearchImportInput = {
  engine: SeoSearchEngine; periodStart: string; periodEnd: string; text: string;
};
// Multipart form encoding normalizes textarea newlines to CRLF. Hash the same
// logical input in the browser and server without trimming or rounding values.
export function seoSearchImportPreflightPayload(input: SeoSearchImportInput) {
  return JSON.stringify([input.engine, input.periodStart, input.periodEnd, input.text.replace(/\r\n?/g, "\n")]);
}
export type SeoSearchImportIssue = {
  line: number; value: string; reason: string;
};
export type SeoSearchImportPreflight = {
  canImport: boolean; errors: string[]; inputRows: number; acceptedRows: number;
  mergedRows: number; excluded: SeoSearchImportIssue[];
  observations: SeoSearchPageObservation[];
};

/** Pure preview: no database, audit, platform connection or silent truncation. */
export function preflightSeoSearchPageObservationRows({
  engine, periodStart, periodEnd, text,
}: SeoSearchImportInput): SeoSearchImportPreflight {
  const result: SeoSearchImportPreflight = {
    canImport: false, errors: [], inputRows: 0, acceptedRows: 0,
    mergedRows: 0, excluded: [], observations: [],
  };
  if (!['google', 'bing'].includes(engine)) result.errors.push("搜索引擎无效。");
  if (!isIsoDate(periodStart) || !isIsoDate(periodEnd) || periodStart > periodEnd) {
    result.errors.push("观察窗口日期无效，请使用真实开始、结束日期。");
  }
  if (text.length > SEO_SEARCH_PAGE_IMPORT_TEXT_LIMIT) result.errors.push("报表超过 250000 字符，不会截取导入。");
  if (result.errors.length) return result;
  const lines = text.split(/\r\n?|\n/).map((value, index) => ({ value: value.trim(), line: index + 1 })).filter(item => item.value);
  result.inputRows = Math.max(0, lines.length - 1);
  if (lines.length < 2) { result.errors.push("没有报表数据行。"); return result; }
  let delimiter: string, headers: string[];
  try { delimiter = detectDelimiter(lines[0].value); headers = parseDelimitedLine(lines[0].value, delimiter); }
  catch { result.errors.push("表头引号未闭合，请重新导出报表。"); return result; }
  const pathIndex = headerIndex(headers, HEADER_ALIASES.path);
  const clicksIndex = headerIndex(headers, HEADER_ALIASES.clicks);
  const impressionsIndex = headerIndex(headers, HEADER_ALIASES.impressions);
  const positionIndex = headerIndex(headers, HEADER_ALIASES.position);
  if (pathIndex < 0 || clicksIndex < 0 || impressionsIndex < 0) {
    const keyword = headers.some(value => /^(query|queries|keyword|keywords|查询|热门查询|关键字|关键词)$/.test(normalizeHeader(value)));
    result.errors.push(keyword ? "这是查询/关键词报表，请切换到页面报表；不会把查询当作 URL。" : "缺少页面、点击或展示表头。");
    return result;
  }
  if ([HEADER_ALIASES.path, HEADER_ALIASES.clicks, HEADER_ALIASES.impressions, HEADER_ALIASES.position].some(aliases => headers.filter(value => aliases.has(normalizeHeader(value))).length > 1)) {
    result.errors.push("存在重复指标表头，无法确定列口径。"); return result;
  }
  const grouped = new Map<string, SeoSearchPageObservation>();
  const positionWeights = new Map<string, number>();
  for (const { value, line } of lines.slice(1)) {
    let cells: string[];
    const exclude = (reason: string) => result.excluded.push({ line, value, reason });
    try { cells = parseDelimitedLine(value, delimiter); }
    catch { exclude("引号未闭合；不支持跨行单元格"); continue; }
    if (cells.length !== headers.length) { exclude("列数与表头不一致"); continue; }
    const path = normalizePublicPath(cells[pathIndex] || "");
    const clicks = parseCount(cells[clicksIndex] || "");
    const impressions = parseCount(cells[impressionsIndex] || "");
    const averagePosition = positionIndex >= 0 ? parsePosition(cells[positionIndex] || "") : undefined;
    if (!path) { exclude("不属于支持的 geosub.org 公开语言页面（含报告或后台路径）"); continue; }
    if (!Number.isSafeInteger(clicks) || !Number.isSafeInteger(impressions)) { exclude("点击/展示必须是精确非负整数，不能使用 K/M 等约数"); continue; }
    if (clicks > impressions) { exclude("点击大于展示，无法确认指标口径"); continue; }
    if (averagePosition !== undefined && Number.isNaN(averagePosition)) { exclude("平均排名必须在 0–1000 之间"); continue; }
    const current = grouped.get(path);
    const nextClicks = (current?.clicks ?? 0) + clicks;
    const nextImpressions = (current?.impressions ?? 0) + impressions;
    if (!Number.isSafeInteger(nextClicks) || !Number.isSafeInteger(nextImpressions)) {
      result.errors.push("合并后的计数超出精确整数范围。"); continue;
    }
    const weight = positionWeights.get(path) ?? 0;
    const nextWeight = weight + (averagePosition === undefined ? 0 : impressions);
    const weightedPosition = nextWeight > 0
      ? ((current?.averagePosition ?? 0) * weight + (averagePosition ?? 0) * impressions) / nextWeight
      : current?.averagePosition ?? averagePosition;
    positionWeights.set(path, nextWeight);
    grouped.set(path, { engine, periodStart, periodEnd, path, clicks: nextClicks, impressions: nextImpressions,
      ...(weightedPosition === undefined ? {} : { averagePosition: weightedPosition }) });
    result.acceptedRows += 1;
  }
  result.observations = [...grouped.values()].map(item => ({ ...item,
    ...(item.averagePosition === undefined ? {} : { averagePosition: Math.round(item.averagePosition * 100) / 100 }),
  })).sort((a, b) => b.impressions - a.impressions || a.path.localeCompare(b.path));
  result.mergedRows = result.acceptedRows - result.observations.length;
  if (!result.observations.length) result.errors.push("没有可导入的有效页面。");
  if (result.observations.length > SEO_SEARCH_PAGE_IMPORT_ROW_LIMIT) result.errors.push(`有效页面共 ${result.observations.length} 个，超过 500 页上限；不会截取导入，请明确缩小报表范围。`);
  result.canImport = result.errors.length === 0;
  return result;
}

export function parseSeoSearchPageObservationRows(input: SeoSearchImportInput): SeoSearchPageObservation[] {
  const result = preflightSeoSearchPageObservationRows(input);
  if (!result.canImport) throw new Error(result.errors.join(" "));
  return result.observations;
}

function parseObservation(value: unknown): SeoSearchPageObservation | null {
  if (!isRecord(value)) return null;
  const engine = value.engine === "bing" ? "bing" : value.engine === "google" ? "google" : null;
  const periodStart = typeof value.periodStart === "string" ? value.periodStart : "";
  const periodEnd = typeof value.periodEnd === "string" ? value.periodEnd : "";
  const path = typeof value.path === "string" ? normalizePublicPath(value.path) : null;
  const clicks = Number(value.clicks);
  const impressions = Number(value.impressions);
  const averagePosition = value.averagePosition === undefined
    ? undefined
    : Number(value.averagePosition);
  if (
    !engine
    || !path
    || !isIsoDate(periodStart)
    || !isIsoDate(periodEnd)
    || periodStart > periodEnd
    || !Number.isSafeInteger(clicks)
    || !Number.isSafeInteger(impressions)
    || clicks < 0
    || impressions < 0
    || clicks > impressions
    || (averagePosition !== undefined && (!Number.isFinite(averagePosition) || averagePosition < 0 || averagePosition > 1000))
  ) return null;
  return {
    engine,
    periodStart,
    periodEnd,
    path,
    clicks,
    impressions,
    ...(averagePosition === undefined ? {} : { averagePosition }),
  };
}

function parseBatch(value: unknown): SeoSearchPageImportBatch | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const engine = value.engine === "bing" ? "bing" : value.engine === "google" ? "google" : null;
  const periodStart = typeof value.periodStart === "string" ? value.periodStart : "";
  const periodEnd = typeof value.periodEnd === "string" ? value.periodEnd : "";
  const importedAt = typeof value.importedAt === "string" ? value.importedAt : "";
  const actorLabel = typeof value.actorLabel === "string" ? value.actorLabel : "";
  const observations = Array.isArray(value.observations)
    ? value.observations
      .map(parseObservation)
      .filter((item): item is SeoSearchPageObservation => Boolean(item))
      .filter((item) => item.engine === engine && item.periodStart === periodStart && item.periodEnd === periodEnd)
      .slice(0, SEO_SEARCH_PAGE_IMPORT_ROW_LIMIT)
    : [];
  if (
    !id
    || !engine
    || !isIsoDate(periodStart)
    || !isIsoDate(periodEnd)
    || periodStart > periodEnd
    || !Number.isFinite(Date.parse(importedAt))
    || !importedAt
    || !actorLabel
    || observations.length === 0
  ) return null;
  const e = value.evidence;
  const evidence: SeoSearchImportEvidence | undefined = isRecord(e)
    && typeof e.evidenceHash === "string" && /^sha256:[a-f0-9]{64}$/.test(e.evidenceHash)
    && ["browser_observation", "server_api"].includes(String(e.method)) && e.searchType === "web" && e.coverage === "selected_rows"
    && typeof e.sourceTimezone === "string" && /^[a-zA-Z0-9_+:/-]{1,80}$/.test(e.sourceTimezone)
    && [e.availableRows, e.capturedRows, e.excludedRoundedRows].every((n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0)
    && Number(e.availableRows) >= Number(e.capturedRows)
    && Number(e.capturedRows) - Number(e.excludedRoundedRows) === observations.length
    ? { evidenceHash: e.evidenceHash, method: e.method as "browser_observation" | "server_api", searchType: "web",
      sourceTimezone: e.sourceTimezone, coverage: "selected_rows", availableRows: Number(e.availableRows),
      capturedRows: Number(e.capturedRows), excludedRoundedRows: Number(e.excludedRoundedRows) }
    : undefined;
  return { id, engine, periodStart, periodEnd, importedAt, actorLabel, observations, ...(evidence ? { evidence } : {}) };
}

export function parseSeoSearchPageImportState(
  value: string | null | undefined,
): SeoSearchPageImportState {
  if (!value) return { version: 1, batches: [] };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.batches)) {
      return { version: 1, batches: [] };
    }
    return {
      version: 1,
      batches: parsed.batches
        .map(parseBatch)
        .filter((item): item is SeoSearchPageImportBatch => Boolean(item))
        .slice(-SEO_SEARCH_PAGE_IMPORT_HISTORY_LIMIT),
    };
  } catch {
    return { version: 1, batches: [] };
  }
}

export function appendSeoSearchPageImportBatch(
  state: SeoSearchPageImportState,
  batch: SeoSearchPageImportBatch,
): SeoSearchPageImportState {
  return {
    version: 1,
    batches: [
      ...state.batches.filter((item) => !(
        item.engine === batch.engine
        && item.periodStart === batch.periodStart
        && item.periodEnd === batch.periodEnd
      )),
      batch,
    ].slice(-SEO_SEARCH_PAGE_IMPORT_HISTORY_LIMIT),
  };
}

export function rollbackLatestSeoSearchPageImport(
  state: SeoSearchPageImportState,
  engine: SeoSearchEngine,
) {
  const index = state.batches.findLastIndex((batch) => batch.engine === engine);
  if (index < 0) throw new Error("No imported batch is available to roll back.");
  return {
    version: 1 as const,
    batches: state.batches.filter((_, batchIndex) => batchIndex !== index),
  };
}

export function getLatestSeoSearchPageImportBatch(
  state: SeoSearchPageImportState,
  engine: SeoSearchEngine,
) {
  // Observation time determines freshness, not the order an operator imports files.
  // For an equal end date prefer the later start, then the newer import of that window.
  return state.batches.filter((batch) => batch.engine === engine).sort((a, b) =>
    b.periodEnd.localeCompare(a.periodEnd)
    || b.periodStart.localeCompare(a.periodStart)
    || b.importedAt.localeCompare(a.importedAt)
    || state.batches.indexOf(b) - state.batches.indexOf(a),
  )[0] ?? null;
}

export function getEffectiveSeoSearchPageObservations({
  baseline,
  state,
}: {
  baseline: SeoSearchPageObservation[];
  state: SeoSearchPageImportState;
}) {
  return (["google", "bing"] as const).flatMap((engine) => {
    const latest = getLatestSeoSearchPageImportBatch(state, engine);
    return latest
      ? latest.observations
      : baseline.filter((observation) => observation.engine === engine);
  });
}
