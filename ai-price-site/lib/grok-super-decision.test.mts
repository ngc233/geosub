import assert from "node:assert/strict";
import test from "node:test";
import { hasGrokSuperDecision, hasGrokSuperAppStoreDecision } from "./grok-super-decision.ts";
import { getPurchaseEligibility } from "./purchase-eligibility.ts";
import { getProductEditorialContent } from "./product-editorial-content.ts";
import { getMonthlyAppStoreComparison } from "./plan-comparison.ts";
import type { ProductPlan, SubscriptionProduct } from "./public-pricing-model.ts";

const plan = (patch: Partial<ProductPlan> = {}): ProductPlan => ({ slug: "super", name: "Canonical app plan", billing: "monthly", priceStatus: "published", regions: [{ rank: 1, country: "United States", code: "US", priceUsd: 30, localPrice: "$30.00", localPriceValue: 30, currencyCode: "USD", billingPlatform: "ios", dataQuality: "verified", tax: "Unknown", lastCheckedAt: "2026-10-22" }], ...patch });

test("Grok qualification is scoped to the approved English monthly App Store plan without changing SEO price scope", () => {
  assert.equal(hasGrokSuperDecision("en", "grok", "super"), true);
  assert.equal(getPurchaseEligibility("en", "grok", [plan()])?.priceScope, undefined);
  for (const [locale, product, slug] of [["zh", "grok", "super"], ["en", "grok", "super-lite"], ["en", "grok", "super-heavy"], ["zh", "chatgpt", "plus"], ["en", "spotify", "super"]] as const) {
    assert.equal(hasGrokSuperDecision(locale, product, slug), false);
    assert.equal(getPurchaseEligibility(locale, product, [plan({ slug })]), null);
  }
  for (const plans of [[plan({ billing: "yearly" })], [plan({ regions: [] })], [plan(), plan({ slug: "super-heavy" })]]) {
    assert.equal(getPurchaseEligibility("en", "grok", plans), null);
    assert.equal(hasGrokSuperAppStoreDecision("en", "grok", plans), false);
  }
  const web = plan(); web.regions[0].billingPlatform = "web";
  assert.equal(getPurchaseEligibility("en", "grok", [web]), null);
  assert.equal(hasGrokSuperAppStoreDecision("en", "grok", [web]), false);
});

test("new website identities do not replace published app names or amounts", () => {
  const app = plan(); app.name = "Renamed canonical App Store plan"; app.regions[0].localPriceValue = 32;
  app.regions.push({ ...app.regions[0], billingPlatform: "web", localPriceValue: 100 });
  const product: SubscriptionProduct = { slug: "grok", name: "Grok", category: "ai", brand: "xAI", defaultPlan: "super", description: "", updatedAt: "2026-10-23", plans: [app] };
  const [row] = getMonthlyAppStoreComparison(product);
  assert.equal(row.plan.name, app.name); assert.equal(row.usPrice, 32); assert.equal(row.regionCount, 1); assert.equal(row.collectedAt, "2026-10-22");
  app.regions[0].dataQuality = "pending_review";
  assert.equal(getMonthlyAppStoreComparison(product)[0].usPrice, undefined);
  app.priceStatus = "pending"; assert.deepEqual(getMonthlyAppStoreComparison(product), []);
});

test("English plan-fit text qualifies the collected identity while Chinese content remains independent", () => {
  assert.match(getProductEditorialContent("en", "grok", "super")!.plan.bestFor, /Existing SuperGrok members/);
  assert.match(getProductEditorialContent("en", "grok", "super")!.plan.availabilityNote!, /does not establish new-purchase availability/);
  assert.doesNotMatch(getProductEditorialContent("zh", "grok", "super")!.plan.bestFor, /Existing SuperGrok/);
});
