import assert from "node:assert/strict";
import test from "node:test";
import {
  getUtcStatDate,
  normalizeAggregatePagePath,
} from "./aggregate-page-views.ts";

test("cookieless page aggregation accepts only bounded public locale paths", () => {
  assert.equal(normalizeAggregatePagePath("/zh"), "/zh");
  assert.equal(
    normalizeAggregatePagePath("/en/ai-pricing/chatgpt/plus/"),
    "/en/ai-pricing/chatgpt/plus",
  );
  assert.equal(normalizeAggregatePagePath("/admin"), null);
  assert.equal(normalizeAggregatePagePath("/api/health"), null);
  assert.equal(normalizeAggregatePagePath("/zh/tracking-test"), null);
  assert.equal(normalizeAggregatePagePath("/zh?campaign=test"), null);
  assert.equal(normalizeAggregatePagePath(`/${"x".repeat(400)}`), null);
});

test("cookieless page aggregation uses a UTC date bucket", () => {
  assert.equal(
    getUtcStatDate(new Date("2026-08-21T23:59:59.000Z")).toISOString(),
    "2026-08-21T00:00:00.000Z",
  );
});
