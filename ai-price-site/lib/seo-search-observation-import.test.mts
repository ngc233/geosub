import assert from "node:assert/strict";
import test from "node:test";
import {
  appendSeoSearchPageImportBatch,
  getEffectiveSeoSearchPageObservations,
  parseSeoSearchPageImportState,
  parseSeoSearchPageObservationRows,
  rollbackLatestSeoSearchPageImport,
} from "./seo-search-observation-import.ts";

test("page observation import accepts exported URLs and canonicalizes plan queries", () => {
  const rows = parseSeoSearchPageObservationRows({
    engine: "google",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-14",
    text: [
      "热门网页,点击次数,展示次数,平均排名",
      "https://geosub.org/zh/ai-pricing/chatgpt?plan=plus,12,540,5.8",
      "https://example.com/zh/ai-pricing/chatgpt,9,90,2",
      "https://geosub.org/admin/seo,1,2,1",
    ].join("\n"),
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].path, "/zh/ai-pricing/chatgpt/plus");
  assert.equal(rows[0].clicks, 12);
  assert.equal(rows[0].impressions, 540);
  assert.equal(rows[0].averagePosition, 5.8);
});

test("page observation import accepts the official Bing Chinese CSV headers", () => {
  const rows = parseSeoSearchPageObservationRows({
    engine: "bing",
    periodStart: "2026-05-14",
    periodEnd: "2026-08-13",
    text: [
      "\u9875\u9762,\u5370\u8c61\u6570,\u70b9\u51fb\u6b21\u6570,\u70b9\u51fb\u7387,\u5e73\u5747\u6392\u540d",
      "https://geosub.org/zh/ai-pricing/chatgpt/plus,2488,88,3.54%,6.65",
    ].join("\n"),
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].path, "/zh/ai-pricing/chatgpt/plus");
  assert.equal(rows[0].clicks, 88);
  assert.equal(rows[0].impressions, 2488);
  assert.equal(rows[0].averagePosition, 6.65);
});

test("duplicate rows are merged without double-counting across imported batches", () => {
  const observations = parseSeoSearchPageObservationRows({
    engine: "bing",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-14",
    text: [
      "Page\tClicks\tImpressions\tAverage position",
      "/en/ai-pricing/poe/pro\t2\t40\t5",
      "/en/ai-pricing/poe/pro\t1\t20\t8",
    ].join("\n"),
  });
  assert.equal(observations.length, 1);
  assert.equal(observations[0].clicks, 3);
  assert.equal(observations[0].impressions, 60);
  assert.equal(observations[0].averagePosition, 6);

  const state = appendSeoSearchPageImportBatch(
    { version: 1, batches: [] },
    {
      id: "batch-1",
      engine: "bing",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-14",
      importedAt: "2026-08-14T10:00:00.000Z",
      actorLabel: "admin@geosub.local",
      observations,
    },
  );
  const effective = getEffectiveSeoSearchPageObservations({
    baseline: [
      {
        engine: "google",
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        path: "/en/ai-pricing/chatgpt",
        clicks: 1,
        impressions: 10,
      },
      {
        engine: "bing",
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        path: "/en/ai-pricing/chatgpt",
        clicks: 1,
        impressions: 10,
      },
    ],
    state,
  });
  assert.equal(effective.length, 2);
  assert.ok(effective.some((item) => item.engine === "google"));
  assert.ok(effective.some((item) => item.path === "/en/ai-pricing/poe/pro"));
  assert.ok(!effective.some(
    (item) => item.engine === "bing" && item.path.includes("chatgpt"),
  ));
});

test("latest import can be rolled back to the previous batch or code baseline", () => {
  const state = parseSeoSearchPageImportState(JSON.stringify({
    version: 1,
    batches: [
      {
        id: "google-1",
        engine: "google",
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        importedAt: "2026-08-01T00:00:00.000Z",
        actorLabel: "admin@geosub.local",
        observations: [{
          engine: "google",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
          path: "/en/ai-pricing/chatgpt",
          clicks: 1,
          impressions: 10,
        }],
      },
      {
        id: "google-2",
        engine: "google",
        periodStart: "2026-08-01",
        periodEnd: "2026-08-14",
        importedAt: "2026-08-14T00:00:00.000Z",
        actorLabel: "admin@geosub.local",
        observations: [{
          engine: "google",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-14",
          path: "/en/ai-pricing/claude",
          clicks: 2,
          impressions: 20,
        }],
      },
    ],
  }));
  const rolledBack = rollbackLatestSeoSearchPageImport(state, "google");
  assert.equal(rolledBack.batches.length, 1);
  assert.equal(rolledBack.batches[0].id, "google-1");
});
