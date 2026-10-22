import assert from "node:assert/strict";
import test from "node:test";
import { hasChatGPTPro100Decision } from "./chatgpt-pro100-decision.ts";
import { getPurchaseEligibility } from "./purchase-eligibility.ts";
import { getMonthlyAppStoreComparison } from "./plan-comparison.ts";
import type { ProductPlan, SubscriptionProduct } from "./public-pricing-model.ts";

const plan = (slug = "pro-5x"): ProductPlan => ({ slug, name: "Canonical published name", billing: "monthly", priceStatus: "published", regions: [{ rank: 1, country: "United States", code: "US", priceUsd: 100, localPrice: "$100", localPriceValue: 100, currencyCode: "USD", billingPlatform: "ios", dataQuality: "verified", tax: "Unknown", lastCheckedAt: "2026-10-23" }] });

test("the historical Pro route gets guidance only on the English monthly iOS plan page", () => {
  assert.equal(hasChatGPTPro100Decision("en", "chatgpt", "pro-5x"), true);
  assert.equal(getPurchaseEligibility("en", "chatgpt", [plan()])?.priceScope, undefined);
  assert.equal(getPurchaseEligibility("en", "chatgpt", [plan()], "overview"), null);
  for (const [locale, product, slug] of [["zh", "chatgpt", "plus"], ["zh", "chatgpt", "pro-5x"], ["en", "chatgpt", "plus"], ["en", "chatgpt", "pro"], ["en", "claude", "pro-5x"]] as const) {
    assert.equal(hasChatGPTPro100Decision(locale, product, slug), false);
    assert.equal(getPurchaseEligibility(locale, product, [plan(slug)]), null);
  }
  for (const patch of [{ billing: "yearly" }, { regions: [] }] as Partial<ProductPlan>[]) assert.equal(getPurchaseEligibility("en", "chatgpt", [{ ...plan(), ...patch }]), null);
  const web = plan(); web.regions[0].billingPlatform = "web";
  assert.equal(getPurchaseEligibility("en", "chatgpt", [web]), null);
  assert.equal(getPurchaseEligibility("en", "chatgpt", [plan(), plan("plus")]), null);
});

test("all three displayed comparison identities and amounts track their own published data", () => {
  const plans = ["plus", "pro-5x", "pro"].map((slug, i) => { const p = plan(slug); p.name = `Published tier ${i}`; p.regions[0].localPriceValue = [22, 105, 205][i]; p.regions.push({ ...p.regions[0], billingPlatform: "web", localPriceValue: 1 }); return p; });
  const product: SubscriptionProduct = { slug: "chatgpt", name: "ChatGPT", category: "ai", brand: "OpenAI", defaultPlan: "plus", description: "", updatedAt: "2026-10-23", plans };
  assert.deepEqual(getMonthlyAppStoreComparison(product).map(x => [x.plan.name, x.usPrice, x.regionCount]), [["Published tier 0", 22, 1], ["Published tier 1", 105, 1], ["Published tier 2", 205, 1]]);
  plans[1].regions[0].code = "CA"; plans[1].regions[0].currencyCode = "CAD";
  assert.equal(getMonthlyAppStoreComparison(product)[1].usPrice, undefined);
  plans[2].priceStatus = "pending";
  assert.deepEqual(getMonthlyAppStoreComparison(product).map(x => x.plan.slug), ["plus", "pro-5x"]);
});
