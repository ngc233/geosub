import test from "node:test";
import assert from "node:assert/strict";
import { buildBingGrowthSnapshot, fetchBingJson, parseBingDate } from "./growth-bing-shadow.mjs";

test("Bing date values are normalized to UTC calendar dates", () => {
  assert.equal(parseBingDate("/Date(1788134400000-0700)/"), "2026-08-31");
});

test("Bing shadow snapshot keeps source totals separate from page detail", () => {
  const snapshot = buildBingGrowthSnapshot({
    collectedAt: "2026-09-03T10:00:00.000Z",
    dailyRows: [
      { Date: "/Date(1788134400000-0700)/", Clicks: 4, Impressions: 20 },
      { Date: "/Date(1788048000000-0700)/", Clicks: 3, Impressions: 18 },
    ],
    pageRows: [
      { Query: "https://geosub.org/zh/ai-pricing/chatgpt/plus", Clicks: 4, Impressions: 20, AvgImpressionPosition: 6.2 },
      { Query: "https://geosub.org/zh/ai-pricing/chatgpt/plus/", Clicks: 1, Impressions: 10, AvgImpressionPosition: 8 },
      { Query: "https://other.example/secret", Clicks: 99, Impressions: 99 },
    ],
    queryRows: [{ Query: "raw query must not be returned", Clicks: 1, Impressions: 2 }],
  });
  assert.equal(snapshot.status, "partial");
  assert.deepEqual(snapshot.daily.map((row) => row.date), ["2026-08-30", "2026-08-31"]);
  assert.deepEqual(snapshot.pages.rows, [{ path: "/zh/ai-pricing/chatgpt/plus", clicks: 5, impressions: 30, averagePosition: 6.8 }]);
  assert.deepEqual(snapshot.querySummary, { availableRows: 1 });
  assert.equal(JSON.stringify(snapshot).includes("raw query"), false);
});

test("Bing JSON fetch uses bearer authorization and validates envelope", async () => {
  let seen;
  const rows = await fetchBingJson({
    accessToken: "test-token",
    siteUrl: "https://geosub.org/",
    method: "GetRankAndTrafficStats",
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return { ok: true, status: 200, json: async () => ({ d: [{ Clicks: 1 }] }) };
    },
  });
  assert.equal(rows.length, 1);
  assert.match(seen.url, /GetRankAndTrafficStats\?siteUrl=https%3A%2F%2Fgeosub\.org%2F/);
  assert.equal(seen.init.headers.Authorization, "Bearer test-token");
});
