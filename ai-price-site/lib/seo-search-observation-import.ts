import {
  canonicalizeObservedSearchPath,
  type SeoSearchEngine,
  type SeoSearchPageObservation,
} from "./seo-search-performance-baseline.ts";

export const SEO_SEARCH_PAGE_IMPORT_SETTING_KEY =
  "seo.search_page_observation_imports.v1";
export const SEO_SEARCH_PAGE_IMPORT_HISTORY_LIMIT = 8;
export const SEO_SEARCH_PAGE_IMPORT_ROW_LIMIT = 500;

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
  return Number(normalized);
}

function parsePosition(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1000
    ? Math.round(parsed * 100) / 100
    : Number.NaN;
}

export function parseSeoSearchPageObservationRows({
  engine,
  periodStart,
  periodEnd,
  text,
}: {
  engine: SeoSearchEngine;
  periodStart: string;
  periodEnd: string;
  text: string;
}): SeoSearchPageObservation[] {
  if (
    !isIsoDate(periodStart)
    || !isIsoDate(periodEnd)
    || periodStart > periodEnd
  ) {
    throw new Error("Invalid observation period.");
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("No observation rows found.");

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter);
  const pathIndex = headerIndex(headers, HEADER_ALIASES.path);
  const clicksIndex = headerIndex(headers, HEADER_ALIASES.clicks);
  const impressionsIndex = headerIndex(headers, HEADER_ALIASES.impressions);
  const positionIndex = headerIndex(headers, HEADER_ALIASES.position);
  if (pathIndex < 0 || clicksIndex < 0 || impressionsIndex < 0) {
    throw new Error("Required headers are missing.");
  }

  const grouped = new Map<string, SeoSearchPageObservation>();
  for (const line of lines.slice(1)) {
    const cells = parseDelimitedLine(line, delimiter);
    const path = normalizePublicPath(cells[pathIndex] || "");
    const clicks = parseCount(cells[clicksIndex] || "");
    const impressions = parseCount(cells[impressionsIndex] || "");
    const averagePosition = positionIndex >= 0
      ? parsePosition(cells[positionIndex] || "")
      : undefined;

    if (
      !path
      || !Number.isInteger(clicks)
      || !Number.isInteger(impressions)
      || clicks < 0
      || impressions < 0
      || clicks > impressions
      || (averagePosition !== undefined && Number.isNaN(averagePosition))
    ) {
      continue;
    }

    const current = grouped.get(path);
    if (!current) {
      grouped.set(path, {
        engine,
        periodStart,
        periodEnd,
        path,
        clicks,
        impressions,
        ...(averagePosition === undefined ? {} : { averagePosition }),
      });
      continue;
    }

    const nextImpressions = current.impressions + impressions;
    const weightedPosition =
      current.averagePosition !== undefined && averagePosition !== undefined
        ? (
          current.averagePosition * current.impressions
          + averagePosition * impressions
        ) / Math.max(1, nextImpressions)
        : current.averagePosition ?? averagePosition;
    grouped.set(path, {
      ...current,
      clicks: current.clicks + clicks,
      impressions: nextImpressions,
      ...(weightedPosition === undefined
        ? {}
        : { averagePosition: Math.round(weightedPosition * 100) / 100 }),
    });
  }

  const observations = [...grouped.values()]
    .sort((left, right) =>
      right.impressions - left.impressions || left.path.localeCompare(right.path)
    )
    .slice(0, SEO_SEARCH_PAGE_IMPORT_ROW_LIMIT);
  if (observations.length === 0) throw new Error("No valid observation rows found.");
  return observations;
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
    || !Number.isInteger(clicks)
    || !Number.isInteger(impressions)
    || clicks < 0
    || impressions < 0
    || clicks > impressions
    || (averagePosition !== undefined && !Number.isFinite(averagePosition))
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
      .filter((item) => item.engine === engine)
      .slice(0, SEO_SEARCH_PAGE_IMPORT_ROW_LIMIT)
    : [];
  if (
    !id
    || !engine
    || !isIsoDate(periodStart)
    || !isIsoDate(periodEnd)
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
  return [...state.batches].reverse().find((batch) => batch.engine === engine) || null;
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
