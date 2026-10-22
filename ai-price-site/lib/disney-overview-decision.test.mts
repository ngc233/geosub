import assert from "node:assert/strict";
import test from "node:test";
import { hasDisneyOverviewDecision } from "./disney-overview-decision.ts";
import { getMonthlyAppStoreComparison, getMonthlyAppStoreReferenceQuote } from "./plan-comparison.ts";
import { getPurchaseEligibility } from "./purchase-eligibility.ts";
import type { ProductPlan, RegionPrice, SubscriptionProduct } from "./public-pricing-model.ts";

const region = (patch: Partial<RegionPrice> = {}): RegionPrice => ({ rank: 1, country: "United Kingdom", code: "GB", priceUsd: 9, localPrice: "£7.00", localPriceValue: 7, currencyCode: "GBP", tax: "Unknown", billingPlatform: "ios", dataQuality: "verified", lastCheckedAt: "2026-10-22", ...patch });
const plan = (regions: RegionPrice[], patch: Partial<ProductPlan> = {}): ProductPlan => ({ slug: "standard", name: "Published name", billing: "monthly", priceStatus: "published", regions, ...patch });

test("same-market comparison follows canonical price/name changes, independently of US and cheaper Web quotes", () => {
  const gb = region();
  const p = plan([region({ code: "US", currencyCode: "USD", localPriceValue: 22 }), region({ billingPlatform: "web", localPriceValue: 1 }), gb]);
  assert.equal(getMonthlyAppStoreReferenceQuote(p, "GB", "GBP"), gb);
  gb.localPriceValue = 8; gb.localPrice = "£8.00"; gb.priceUsd = 10;
  p.name = "Renamed published tier";
  const product: SubscriptionProduct = { slug: "disney", name: "Disney+", category: "streaming", brand: "Disney", description: "", defaultPlan: "standard", updatedAt: "2026-10-23", plans: [p] };
  const [row] = getMonthlyAppStoreComparison(product);
  assert.equal(row.plan.name, p.name);
  assert.equal(getMonthlyAppStoreReferenceQuote(row.plan, "GB", "GBP")?.localPrice, "£8.00");
  assert.equal(row.usPrice, 22);
  p.regions = [gb];
  assert.equal(getMonthlyAppStoreComparison(product)[0].usPrice, undefined);
  assert.equal(getMonthlyAppStoreReferenceQuote(p, "GB", "GBP"), gb);
  p.regions = [region({ code: "US", currencyCode: "USD" })];
  assert.equal(getMonthlyAppStoreReferenceQuote(p, "GB", "GBP"), undefined);
});

test("missing, ambiguous or invalid UK evidence never acquires another currency, channel or billing period", () => {
  for (const patch of [{ code: "US" }, { currencyCode: "USD" }, { billingPlatform: "web" }, { dataQuality: "stale" }, { dataQuality: "pending_review" }, { localPriceValue: NaN }, { localPriceValue: 0 }, { localPrice: "" }, { priceUsd: Infinity }, { lastCheckedAt: "invalid" }, { lastCheckedAt: undefined }] as Partial<RegionPrice>[]) {
    assert.equal(getMonthlyAppStoreReferenceQuote(plan([region(patch)]), "GB", "GBP"), undefined);
  }
  for (const patch of [{ billing: "yearly" }, { billing: "weekly" }, { priceStatus: "pending" }, { priceStatus: "empty" }] as Partial<ProductPlan>[]) assert.equal(getMonthlyAppStoreReferenceQuote(plan([region()], patch), "GB", "GBP"), undefined);
  assert.equal(getMonthlyAppStoreReferenceQuote(plan([]), "GB", "GBP"), undefined);
  assert.equal(getMonthlyAppStoreReferenceQuote(plan([region(), region()]), "GB", "GBP"), undefined);
});

test("Apple renewal guidance is scoped to the English Disney overview without changing metadata scope or Plus", () => {
  const plans = [plan([region()])];
  assert.ok(hasDisneyOverviewDecision("en", "disney"));
  const note = getPurchaseEligibility("en", "disney", plans, "overview")!;
  assert.match(note.description, /no longer accepts new or returning/);
  assert.equal(note.priceScope, undefined);
  assert.equal(getPurchaseEligibility("en", "disney", plans), null);
  for (const [locale, slug] of [["zh", "disney"], ["zh", "chatgpt"], ["en", "spotify"]] as const) assert.equal(getPurchaseEligibility(locale, slug, plans, "overview"), null);
  assert.equal(getPurchaseEligibility("en", "disney", [plan([region({ billingPlatform: "web" })])], "overview"), null);
});
