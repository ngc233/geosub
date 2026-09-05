import assert from "node:assert/strict";
import test from "node:test";
import { bingShadowSnapshotToGrowthEvidence } from "./growth-bing-shadow-evidence.ts";

function snapshot() {
  return {
    schemaVersion: "growth-metrics.v1",
    source: "bing_webmaster",
    site: "https://geosub.org/",
    periodStart: "2026-08-30",
    periodEnd: "2026-08-31",
    settledThrough: null,
    sourceTimezone: "unknown",
    collectedAt: "2026-09-03T11:55:32Z",
    status: "partial",
    sampling: { kind: "provider_reporting", missingShare: null },
    contractVersion: "growth-metrics.v1",
    endpointKind: "legacy_json",
    daily: [
      { date: "2026-08-30", clicks: 4, impressions: 40 },
      { date: "2026-08-31", clicks: 5, impressions: 50 },
    ],
    pages: {
      availableRows: 1,
      rows: [{ path: "/zh/ai-pricing/chatgpt", clicks: 2, impressions: 12, averagePosition: 4.5 }],
    },
    querySummary: { availableRows: 7 },
    limitations: ["Provider settlement is not asserted."],
  };
}

test("Bing shadow snapshots become server API growth evidence", () => {
  const evidence = bingShadowSnapshotToGrowthEvidence(snapshot());
  assert.equal(evidence.engine, "bing");
  assert.equal(evidence.method, "server_api");
  assert.equal(evidence.searchType, "web_and_chat");
  assert.equal(evidence.pages.rows[0].path, "/zh/ai-pricing/chatgpt");
  assert.equal(evidence.days.length, 2);
});

test("Bing shadow conversion rejects contract drift and raw query fields", () => {
  const unsupported = { ...snapshot(), unexpected: true };
  assert.throws(() => bingShadowSnapshotToGrowthEvidence(unsupported), /unsupported field/);
  const queryLeak = { ...snapshot(), querySummary: { availableRows: 7, rows: ["private"] } };
  assert.throws(() => bingShadowSnapshotToGrowthEvidence(queryLeak), /unsupported field/);
});
