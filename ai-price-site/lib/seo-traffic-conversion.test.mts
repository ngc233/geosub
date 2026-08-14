import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  classifySearchEngineReferrer,
  getSeoConversionRate,
  isPlanPricingPath,
  isPricingSearchLandingPath,
  PLAN_ENGAGEMENT_EVENT_KEYS,
} from "./seo-traffic-conversion.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const adminQuery = readFileSync(
  resolve(testDir, "admin-seo-conversion.ts"),
  "utf8",
);

test("search engine referrers distinguish Google and Bing", () => {
  assert.equal(
    classifySearchEngineReferrer("https://www.google.com/search?q=chatgpt"),
    "google",
  );
  assert.equal(
    classifySearchEngineReferrer("https://www.google.co.jp/search?q=chatgpt"),
    "google",
  );
  assert.equal(
    classifySearchEngineReferrer("https://cn.bing.com/search?q=chatgpt"),
    "bing",
  );
  assert.equal(classifySearchEngineReferrer("https://example.com/"), null);
  assert.equal(classifySearchEngineReferrer("not-a-url"), null);
});

test("SEO conversion accepts product and plan landings but not list pages", () => {
  assert.equal(isPricingSearchLandingPath("/zh/ai-pricing/chatgpt"), true);
  assert.equal(isPricingSearchLandingPath("/en/streaming-pricing/netflix/premium?currency=USD"), true);
  assert.equal(isPricingSearchLandingPath("/zh/ai-pricing"), false);
  assert.equal(isPricingSearchLandingPath("/admin/seo"), false);
  assert.equal(isPlanPricingPath("/zh/ai-pricing/chatgpt/plus"), true);
  assert.equal(isPlanPricingPath("/zh/ai-pricing/chatgpt"), false);
});

test("SEO conversion rates and plan event vocabulary stay stable", () => {
  assert.equal(getSeoConversionRate(1, 4), 25);
  assert.equal(getSeoConversionRate(0, 0), 0);
  assert.deepEqual(PLAN_ENGAGEMENT_EVENT_KEYS, [
    "select_plan",
    "click_product_overview",
    "click_related_plan",
  ]);
});

test("SEO conversion query follows public search landings into pricing and excludes admin traffic", () => {
  assert.match(adminQuery, /event\.created_at >= \$\{sinceDate\}/);
  assert.match(adminQuery, /NOT LIKE '\/admin%'/);
  assert.match(adminQuery, /SEO_CONVERSION_SESSION_MINUTES/);
  assert.match(adminQuery, /pricing_at/);
  assert.match(adminQuery, /plan_page_at/);
  assert.match(adminQuery, /completed_at/);
  assert.match(adminQuery, /click_official/);
  assert.match(adminQuery, /readAdminReadModel/);
});
