import assert from "node:assert/strict";
import test from "node:test";
import { googleShadowSnapshotToGrowthEvidence } from "./growth-google-shadow-evidence.ts";

function snapshot() {
  return {
    schemaVersion: "growth-metrics.v1",
    source: "google_search_console",
    site: "https://geosub.org/",
    periodStart: "2026-08-30",
    periodEnd: "2026-08-31",
    settledThrough: null,
    sourceTimezone: "America/Los_Angeles",
    collectedAt: "2026-09-04T01:00:00Z",
    status: "partial",
    sampling: { kind: "provider_final", missingShare: null },
    contractVersion: "growth-metrics.v1",
    endpointKind: "search_analytics",
    daily: [
      { date: "2026-08-30", clicks: 2, impressions: 20 },
      { date: "2026-08-31", clicks: 3, impressions: 30 },
    ],
    pages: {
      availableRows: 1,
      rows: [{ path: "/en/ai-pricing/chatgpt", clicks: 2, impressions: 10, averagePosition: 4 }],
    },
    querySummary: { availableRows: null },
    limitations: ["Top rows only."],
  };
}

test("Google shadow snapshots become server API growth evidence", () => {
  const evidence = googleShadowSnapshotToGrowthEvidence(snapshot());
  assert.equal(evidence.engine, "google");
  assert.equal(evidence.method, "server_api");
  assert.equal(evidence.searchType, "web");
  assert.equal(evidence.sourceTimezone, "America/Los_Angeles");
});

test("Google shadow conversion rejects query-bearing contract drift", () => {
  const leaked = { ...snapshot(), querySummary: { availableRows: 3, rows: [{ query: "private" }] } };
  assert.throws(() => googleShadowSnapshotToGrowthEvidence(leaked), /unsupported field/);
  const wrongSite = { ...snapshot(), site: "sc-domain:geosub.org" };
  assert.throws(() => googleShadowSnapshotToGrowthEvidence(wrongSite), /Unsupported Google/);
});
