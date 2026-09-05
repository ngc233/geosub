import { validateGrowthSearchEvidence, type GrowthSearchEvidence } from "./growth-search-evidence.ts";

const BING_SNAPSHOT_SCHEMA = "growth-metrics.v1";

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string) {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new TypeError(`${label} contains an unsupported field.`);
  }
}

function integer(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a nonnegative integer.`);
  }
  return value;
}

/** Convert one validated server shadow snapshot into the report evidence contract. */
export function bingShadowSnapshotToGrowthEvidence(input: unknown): GrowthSearchEvidence {
  const snapshot = record(input, "Bing shadow snapshot");
  exactKeys(snapshot, [
    "schemaVersion", "source", "site", "periodStart", "periodEnd", "settledThrough",
    "sourceTimezone", "collectedAt", "status", "sampling", "contractVersion", "endpointKind",
    "daily", "pages", "querySummary", "limitations",
  ], "Bing shadow snapshot");
  if (snapshot.schemaVersion !== BING_SNAPSHOT_SCHEMA || snapshot.contractVersion !== BING_SNAPSHOT_SCHEMA
    || snapshot.source !== "bing_webmaster" || snapshot.site !== "https://geosub.org/"
    || snapshot.settledThrough !== null || !["partial", "complete"].includes(String(snapshot.status))
    || snapshot.endpointKind !== "legacy_json") {
    throw new TypeError("Unsupported Bing shadow snapshot contract.");
  }
  const sampling = record(snapshot.sampling, "Bing sampling");
  exactKeys(sampling, ["kind", "missingShare"], "Bing sampling");
  const querySummary = record(snapshot.querySummary, "Bing query summary");
  exactKeys(querySummary, ["availableRows"], "Bing query summary");
  integer(querySummary.availableRows, "Bing query rows");
  if (!Array.isArray(snapshot.limitations) || snapshot.limitations.some((item) => typeof item !== "string")) {
    throw new TypeError("Bing limitations must be strings.");
  }

  if (!Array.isArray(snapshot.daily)) throw new TypeError("Bing daily rows must be an array.");
  const daily = snapshot.daily.map((item) => {
    const row = record(item, "Bing daily row");
    exactKeys(row, ["date", "clicks", "impressions"], "Bing daily row");
    return { date: row.date, clicks: integer(row.clicks, "Bing clicks"), impressions: integer(row.impressions, "Bing impressions") };
  });

  const pages = record(snapshot.pages, "Bing pages");
  exactKeys(pages, ["availableRows", "rows"], "Bing pages");
  integer(pages.availableRows, "Bing available page rows");
  if (!Array.isArray(pages.rows)) throw new TypeError("Bing page rows must be an array.");
  const rows = pages.rows.map((item) => {
    const row = record(item, "Bing page row");
    exactKeys(row, ["path", "clicks", "impressions", "averagePosition"], "Bing page row");
    return {
      path: row.path,
      clicks: integer(row.clicks, "Bing page clicks"),
      impressions: integer(row.impressions, "Bing page impressions"),
      ...(row.averagePosition === undefined ? {} : { averagePosition: row.averagePosition }),
    };
  });

  return validateGrowthSearchEvidence({
    schemaVersion: "growth-search-evidence.v1",
    site: "https://geosub.org",
    engine: "bing",
    searchType: "web_and_chat",
    sourceTimezone: snapshot.sourceTimezone,
    method: "server_api",
    collectedAt: snapshot.collectedAt,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    settledThrough: null,
    days: daily,
    pages: { searchType: "web", coverage: "selected_rows", availableRows: pages.availableRows, rows },
  });
}
