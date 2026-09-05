import { canonicalGrowthHash } from "./growth-intelligence.ts";
import type { SeoSearchPageImportBatch } from "./seo-search-observation-import.ts";

export const GROWTH_SEARCH_EVIDENCE_VERSION = "growth-search-evidence.v1" as const;
export type SearchDay = { date: string; clicks: number; impressions: number };
export type SearchPage = {
  path: string;
  clicks: number;
  impressions: number | null;
  impressionsDisplay?: string;
  averagePosition?: number;
};
export type GrowthSearchEvidence = {
  schemaVersion: typeof GROWTH_SEARCH_EVIDENCE_VERSION;
  site: "https://geosub.org";
  engine: "google" | "bing";
  searchType: "web" | "web_and_chat";
  sourceTimezone: string;
  method: "browser_observation" | "server_api";
  collectedAt: string;
  periodStart: string;
  periodEnd: string;
  settledThrough: null;
  days: SearchDay[];
  pages: {
    searchType: "web";
    coverage: "selected_rows";
    availableRows: number;
    rows: SearchPage[];
  };
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Expected an evidence object.");
  }
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new TypeError("Unexpected evidence field; raw queries and credentials are not accepted.");
  }
}
export function growthIsoDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new TypeError("Expected a real ISO calendar date.");
  }
  return value;
}
export function growthDateOffset(date: string, offset: number) {
  return new Date(Date.parse(growthIsoDate(date)) + offset * 86_400_000).toISOString().slice(0, 10);
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Counts must be exact nonnegative safe integers, not rounded display strings.");
  }
  return value;
}
function counts(value: Record<string, unknown>) {
  const clicks = count(value.clicks);
  const impressions = count(value.impressions);
  if (clicks > impressions) throw new TypeError("Clicks exceed impressions.");
  return { clicks, impressions };
}

/** Accepts browser observations and server shadow adapters; validation cannot certify settlement. */
export function validateGrowthSearchEvidence(input: unknown): GrowthSearchEvidence {
  const v = record(input);
  exactKeys(v, ["schemaVersion", "site", "engine", "searchType", "sourceTimezone", "method", "collectedAt", "periodStart", "periodEnd", "settledThrough", "days", "pages"]);
  if (v.schemaVersion !== GROWTH_SEARCH_EVIDENCE_VERSION || v.site !== "https://geosub.org"
    || !["google", "bing"].includes(String(v.engine))
    || !["browser_observation", "server_api"].includes(String(v.method))
    || v.settledThrough !== null || !["web", "web_and_chat"].includes(String(v.searchType))
    || (v.engine === "google" && v.searchType !== "web")) {
    throw new TypeError("Unsupported site, search scope, method, or settlement claim.");
  }
  if (typeof v.sourceTimezone !== "string" || !/^[a-zA-Z0-9_+:/-]{1,80}$/.test(v.sourceTimezone)) {
    throw new TypeError("A provider date timezone or explicit unknown marker is required.");
  }
  if (typeof v.collectedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v.collectedAt)
    || !Number.isFinite(Date.parse(v.collectedAt))) throw new TypeError("collectedAt must be UTC ISO timestamp.");
  const periodStart = growthIsoDate(v.periodStart);
  const periodEnd = growthIsoDate(v.periodEnd);
  if (periodStart > periodEnd || periodEnd > v.collectedAt.slice(0, 10)
    || Date.parse(periodEnd) - Date.parse(periodStart) > 90 * 86_400_000) {
    throw new TypeError("Invalid or oversized evidence period.");
  }
  if (!Array.isArray(v.days) || v.days.length === 0 || v.days.length > 91) throw new TypeError("Invalid daily rows.");
  const days = v.days.map((item) => {
    const row = record(item);
    exactKeys(row, ["date", "clicks", "impressions"]);
    const date = growthIsoDate(row.date);
    if (date < periodStart || date > periodEnd) throw new TypeError("Daily row outside evidence period.");
    return { date, ...counts(row) };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(days.map((row) => row.date)).size !== days.length) throw new TypeError("Duplicate daily date.");
  const p = record(v.pages);
  exactKeys(p, ["searchType", "coverage", "availableRows", "rows"]);
  if (p.searchType !== "web" || p.coverage !== "selected_rows" || !Array.isArray(p.rows)
    || p.rows.length > 500 || count(p.availableRows) < p.rows.length) throw new TypeError("Invalid page coverage.");
  const rows = p.rows.map((item): SearchPage => {
    const row = record(item);
    exactKeys(row, ["path", "clicks", "impressions", "impressionsDisplay", "averagePosition"]);
    if (typeof row.path !== "string" || !/^\/(?:zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)(?:\/[a-z0-9-]+)*$/.test(row.path)) {
      throw new TypeError("Expected a canonical public GeoSub path, without queries or fragments.");
    }
    const clicks = count(row.clicks);
    const impressions = row.impressions === null ? null : counts(row).impressions;
    if (impressions === null && (typeof row.impressionsDisplay !== "string"
      || !/^\d+(?:\.\d+)?[KM]$/.test(row.impressionsDisplay))) {
      throw new TypeError("Unknown page impressions require the rounded provider display.");
    }
    if (impressions !== null && row.impressionsDisplay !== undefined) throw new TypeError("Exact counts cannot also be rounded.");
    if (row.averagePosition !== undefined && (typeof row.averagePosition !== "number"
      || !Number.isFinite(row.averagePosition) || row.averagePosition < 0 || row.averagePosition > 1000)) {
      throw new TypeError("Invalid average position.");
    }
    return { path: row.path, clicks, impressions,
      ...(impressions === null ? { impressionsDisplay: row.impressionsDisplay as string } : {}),
      ...(row.averagePosition === undefined ? {} : { averagePosition: row.averagePosition as number }) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  if (new Set(rows.map((row) => row.path)).size !== rows.length) throw new TypeError("Duplicate page path.");
  return { schemaVersion: GROWTH_SEARCH_EVIDENCE_VERSION, site: "https://geosub.org",
    engine: v.engine as "google" | "bing", searchType: v.searchType as "web" | "web_and_chat",
    sourceTimezone: v.sourceTimezone, method: v.method as "browser_observation" | "server_api", collectedAt: v.collectedAt,
    periodStart, periodEnd, settledThrough: null, days,
    pages: { searchType: "web", coverage: "selected_rows", availableRows: p.availableRows as number, rows } };
}

export function growthSearchImportBatch(input: unknown): SeoSearchPageImportBatch {
  const evidence = validateGrowthSearchEvidence(input);
  const evidenceHash = canonicalGrowthHash(evidence);
  const observations = evidence.pages.rows.flatMap((row) => row.impressions === null ? [] : [{
    engine: evidence.engine, periodStart: evidence.periodStart, periodEnd: evidence.periodEnd,
    path: row.path, clicks: row.clicks, impressions: row.impressions,
    ...(row.averagePosition === undefined ? {} : { averagePosition: row.averagePosition }),
  }]);
  if (observations.length === 0) throw new TypeError("No exact page rows available to import.");
  return {
    id: `growth:${evidence.engine}:${evidenceHash.slice(7)}`, engine: evidence.engine,
    periodStart: evidence.periodStart, periodEnd: evidence.periodEnd, importedAt: evidence.collectedAt,
    actorLabel: "local-growth-evidence", observations,
    evidence: {
      evidenceHash, method: evidence.method, searchType: "web", sourceTimezone: evidence.sourceTimezone,
      coverage: "selected_rows", availableRows: evidence.pages.availableRows,
      capturedRows: evidence.pages.rows.length, excludedRoundedRows: evidence.pages.rows.length - observations.length,
    },
  };
}

export function assertGrowthLocalDatabase(connectionString: string | undefined) {
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    || !/^\/geosub_[a-z0-9_]+$/.test(url.pathname) || [...url.searchParams.keys()].some((key) => !["schema"].includes(key))) {
    throw new Error("This command only accepts a local geosub_* database without connection overrides.");
  }
  return url;
}
