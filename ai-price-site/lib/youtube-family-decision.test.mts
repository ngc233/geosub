import assert from "node:assert/strict";
import test from "node:test";
import { hasYouTubeFamilyDecision } from "./youtube-family-decision.ts";
import { getPurchaseEligibility } from "./purchase-eligibility.ts";
import { getMonthlyAppStoreComparison } from "./plan-comparison.ts";
import type { ProductPlan, SubscriptionProduct } from "./public-pricing-model.ts";

const plan = (patch: Partial<ProductPlan> = {}): ProductPlan => ({ slug: "family", name: "Published household plan", billing: "monthly", priceStatus: "published", regions: [{ rank: 1, country: "United States", code: "US", priceUsd: 29.99, localPrice: "$29.99", localPriceValue: 29.99, currencyCode: "USD", billingPlatform: "ios", dataQuality: "verified", tax: "Unknown", lastCheckedAt: "2026-10-22" }], ...patch });

test("Family guidance is restricted to the approved English plan and leaves metadata scope intact", () => {
  assert.equal(hasYouTubeFamilyDecision("en", "youtube-premium", "family"), true);
  assert.equal(getPurchaseEligibility("en", "youtube-premium", [plan()])?.priceScope, undefined);
  for (const [locale, product, slug] of [["zh", "youtube-premium", "family"], ["en", "youtube-premium", "individual"], ["en", "youtube-premium", "lite"], ["zh", "chatgpt", "plus"], ["en", "spotify", "family"]] as const) {
    assert.equal(hasYouTubeFamilyDecision(locale, product, slug), false);
    assert.equal(getPurchaseEligibility(locale, product, [plan({ slug })]), null);
  }
  for (const plans of [[plan({ billing: "yearly" })], [plan({ regions: [] })], [plan(), plan({ slug: "individual" })]]) assert.equal(getPurchaseEligibility("en", "youtube-premium", plans), null);
  const web = plan(); web.regions[0].billingPlatform = "web";
  assert.equal(getPurchaseEligibility("en", "youtube-premium", [web]), null);
});

test("household comparison keeps the full bill and follows renamed plans and new canonical prices", () => {
  const family = plan(); family.name = "Renamed published Family"; family.regions[0].localPriceValue = 31.99;
  family.regions.push({ ...family.regions[0], billingPlatform: "web", localPriceValue: 0.99 });
  const product: SubscriptionProduct = { slug: "youtube-premium", name: "YouTube Premium", category: "streaming", brand: "Google", defaultPlan: "individual", description: "", updatedAt: "2026-10-23", plans: [family] };
  const [row] = getMonthlyAppStoreComparison(product);
  assert.equal(row.plan.name, family.name);
  assert.equal(row.usPrice, 31.99);
  assert.equal(row.regionCount, 1);
  assert.equal(row.collectedAt, "2026-10-22");
  family.regions[0].dataQuality = "pending_review";
  assert.equal(getMonthlyAppStoreComparison(product)[0].usPrice, undefined);
  family.priceStatus = "pending";
  assert.deepEqual(getMonthlyAppStoreComparison(product), []);
});
