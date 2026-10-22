import assert from "node:assert/strict";
import test from "node:test";
import { hasGeminiUltraDecision } from "./gemini-plan-decision.ts";
import { getPurchaseEligibility } from "./purchase-eligibility.ts";
import { getMonthlyAppStoreComparison } from "./plan-comparison.ts";
import type { ProductPlan, SubscriptionProduct } from "./public-pricing-model.ts";

const plan = (slug = "ultra", patch: Partial<ProductPlan> = {}): ProductPlan => ({ slug, name: `Published ${slug}`, billing: "monthly", priceStatus: "published", regions: [{ rank: 1, country: "United States", code: "US", priceUsd: 199.99, localPrice: "$199.99", localPriceValue: 199.99, currencyCode: "USD", billingPlatform: "ios", dataQuality: "verified", tax: "Unknown", lastCheckedAt: "2026-10-22" }], ...patch });

test("Gemini decision and purchase guidance exclude locked locale and unrelated plans", () => {
  assert.equal(hasGeminiUltraDecision("en", "gemini", "ultra"), true);
  for (const [locale, product, slug] of [["zh", "gemini", "ultra"], ["en", "gemini", "pro"], ["zh", "chatgpt", "plus"], ["en", "chatgpt", "ultra"]] as const) {
    assert.equal(hasGeminiUltraDecision(locale, product, slug), false);
    assert.equal(getPurchaseEligibility(locale, product, [plan(slug)]), null);
  }
  assert.equal(getPurchaseEligibility("en", "gemini", [plan("pro"), plan()]), null);
  assert.equal(getPurchaseEligibility("en", "gemini", [plan("ultra", { billing: "yearly" })]), null);
  assert.equal(getPurchaseEligibility("en", "gemini", [plan("ultra", { regions: [] })]), null);
  const web = plan(); web.regions[0].billingPlatform = "web";
  assert.equal(getPurchaseEligibility("en", "gemini", [web]), null);
  assert.equal(getPurchaseEligibility("en", "gemini", [plan()])?.priceScope, undefined);
});

test("Gemini comparison uses changing published plan identity and comparable price, never the website quote", () => {
  const pro = plan("pro"); pro.name = "Published Pro rename"; pro.regions[0].localPriceValue = 21.99;
  pro.regions.push({ ...pro.regions[0], billingPlatform: "web", localPriceValue: 1 });
  const product: SubscriptionProduct = { slug: "gemini", name: "Gemini", category: "ai", brand: "Google", defaultPlan: "ultra", description: "", updatedAt: "2026-10-22", plans: [pro, plan()] };
  const rows = getMonthlyAppStoreComparison(product);
  assert.equal(rows[0].plan.name, "Published Pro rename");
  assert.equal(rows[0].usPrice, 21.99);
  assert.equal(rows[0].regionCount, 1);
  pro.regions[0].dataQuality = "stale";
  assert.equal(getMonthlyAppStoreComparison(product)[0].usPrice, undefined);
  product.plans[1].priceStatus = "pending";
  assert.equal(getMonthlyAppStoreComparison(product).some(({plan}) => plan.slug === "ultra"), false);
});
