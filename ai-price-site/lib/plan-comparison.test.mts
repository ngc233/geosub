import assert from "node:assert/strict";
import test from "node:test";
import { getMonthlyAppStoreComparison, hasPlanComparison } from "./plan-comparison.ts";
import type { RegionPrice, SubscriptionProduct } from "./public-pricing-model.ts";

const region = (patch: Partial<RegionPrice> = {}): RegionPrice => ({ rank: 1, country: "United States", code: "US", priceUsd: 20, localPrice: "$20.00", localPriceValue: 20, currencyCode: "USD", tax: "Unknown", billingPlatform: "ios", dataQuality: "verified", lastCheckedAt: "2026-10-20", ...patch });
const product = (regions: RegionPrice[], billing: "monthly" | "yearly" = "monthly"): SubscriptionProduct => ({ slug: "chatgpt", category: "ai", name: "ChatGPT", brand: "OpenAI", description: "", defaultPlan: "plus", updatedAt: "2026-10-21", plans: [{ slug: "plus", name: "Canonical renamed plan", billing, priceStatus: "published", regions }] });

test("comparison follows published names and US local prices, excluding other channels", () => {
  const [row] = getMonthlyAppStoreComparison(product([region({ localPriceValue: 23, priceUsd: 22 }), region({ code: "PH", localPriceValue: 1000, currencyCode: "PHP", priceUsd: 17 }), region({ billingPlatform: "web", localPriceValue: 1, lastCheckedAt: "2026-10-21" })]));
  assert.equal(row.plan.name, "Canonical renamed plan");
  assert.equal(row.usPrice, 23);
  assert.equal(row.regionCount, 2);
  assert.equal(row.collectedAt, "2026-10-20");
  assert.equal(row.freshness.priceCollectedAt, "2026-10-20");
});

test("missing US or App Store and wrong currency never fall back to a regional minimum", () => {
  for (const regions of [[region({ code: "PH" })], [region({ billingPlatform: "web" })], [region({ currencyCode: "EUR" })], [region({ localPriceValue: undefined })], [region({ localPriceValue: NaN })], [region({ localPriceValue: 0 })]]) {
    const [row] = getMonthlyAppStoreComparison(product(regions));
    assert.equal(row.usPrice, undefined);
    assert.equal(row.collectedAt, undefined);
  }
});

test("yearly and unverified records cannot become monthly comparison prices", () => {
  assert.equal(getMonthlyAppStoreComparison(product([region()], "yearly"))[0].usPrice, undefined);
  for (const dataQuality of ["stale", "pending_review", "estimated", "unknown"] as const) {
    const [row] = getMonthlyAppStoreComparison(product([region({ dataQuality })]));
    assert.equal(row.usPrice, undefined);
    assert.equal(row.regionCount, 0);
  }
  const pending = product([region()]); pending.plans[0].priceStatus = "pending";
  assert.deepEqual(getMonthlyAppStoreComparison(pending), []);
  assert.deepEqual(getMonthlyAppStoreComparison(product([])), []);
});

test("comparison and contextual backlink are restricted to English ChatGPT", () => {
  assert.equal(hasPlanComparison("en", "chatgpt"), true);
  for (const locale of ["zh", "zh-tw", "ja", "de", "fr"] as const) assert.equal(hasPlanComparison(locale, "chatgpt"), false);
  assert.equal(hasPlanComparison("en", "gemini"), false);
});
