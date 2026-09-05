import { validateGrowthSearchEvidence, type GrowthSearchEvidence } from "./growth-search-evidence.ts";

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

/** Convert one validated Google shadow snapshot into the report evidence contract. */
export function googleShadowSnapshotToGrowthEvidence(input: unknown): GrowthSearchEvidence {
  const snapshot = record(input, "Google shadow snapshot");
  exactKeys(snapshot, [
    "schemaVersion", "source", "site", "periodStart", "periodEnd", "settledThrough",
    "sourceTimezone", "collectedAt", "status", "sampling", "contractVersion", "endpointKind",
    "daily", "pages", "querySummary", "limitations",
  ], "Google shadow snapshot");
  if (snapshot.schemaVersion !== "growth-metrics.v1" || snapshot.contractVersion !== "growth-metrics.v1"
    || snapshot.source !== "google_search_console" || !["https://geosub.org/", "sc-domain:geosub.org"].includes(String(snapshot.site))
    || snapshot.settledThrough !== null || snapshot.status !== "partial"
    || snapshot.endpointKind !== "search_analytics") {
    throw new TypeError("Unsupported Google shadow snapshot contract.");
  }
  const sampling = record(snapshot.sampling, "Google sampling");
  exactKeys(sampling, ["kind", "missingShare"], "Google sampling");
  const querySummary = record(snapshot.querySummary, "Google query summary");
  exactKeys(querySummary, ["availableRows"], "Google query summary");
  if (querySummary.availableRows !== null) integer(querySummary.availableRows, "Google query rows");
  if (!Array.isArray(snapshot.limitations) || snapshot.limitations.some((item) => typeof item !== "string")) {
    throw new TypeError("Google limitations must be strings.");
  }

  if (!Array.isArray(snapshot.daily)) throw new TypeError("Google daily rows must be an array.");
  const daily = snapshot.daily.map((item) => {
    const row = record(item, "Google daily row");
    exactKeys(row, ["date", "clicks", "impressions"], "Google daily row");
    return { date: row.date, clicks: integer(row.clicks, "Google clicks"), impressions: integer(row.impressions, "Google impressions") };
  });

  const pages = record(snapshot.pages, "Google pages");
  exactKeys(pages, ["availableRows", "rows"], "Google pages");
  integer(pages.availableRows, "Google available page rows");
  if (!Array.isArray(pages.rows)) throw new TypeError("Google page rows must be an array.");
  const rows = pages.rows.map((item) => {
    const row = record(item, "Google page row");
    exactKeys(row, ["path", "clicks", "impressions", "averagePosition"], "Google page row");
    return {
      path: row.path,
      clicks: integer(row.clicks, "Google page clicks"),
      impressions: integer(row.impressions, "Google page impressions"),
      ...(row.averagePosition === undefined ? {} : { averagePosition: row.averagePosition }),
    };
  });

  return validateGrowthSearchEvidence({
    schemaVersion: "growth-search-evidence.v1",
    site: "https://geosub.org",
    engine: "google",
    searchType: "web",
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
