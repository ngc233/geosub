import assert from "node:assert/strict";
import test from "node:test";
import { hasClaudeOverviewDecision } from "./claude-overview-decision.ts";
import { getPurchaseEligibility } from "./purchase-eligibility.ts";
import { getMonthlyAppStoreComparison } from "./plan-comparison.ts";
import type { ProductPlan, RegionPrice, SubscriptionProduct } from "./public-pricing-model.ts";

const region = (patch: Partial<RegionPrice> = {}): RegionPrice => ({ rank: 1, country: "United States", code: "US", priceUsd: 20, localPrice: "$20.00", localPriceValue: 20, currencyCode: "USD", tax: "Unknown", billingPlatform: "ios", dataQuality: "verified", lastCheckedAt: "2026-10-22", ...patch });
const plan = (slug: string, regions: RegionPrice[], patch: Partial<ProductPlan> = {}): ProductPlan => ({ slug, name: "Published " + slug, billing: "monthly", priceStatus: "published", regions, ...patch });
const product = (plans: ProductPlan[]): SubscriptionProduct => ({ slug: "claude", name: "Claude", category: "ai", brand: "Anthropic", description: "", defaultPlan: "pro", updatedAt: "2026-10-23", plans });

test("Claude overview qualification does not spill into plan pages, other languages or the Plus experiment", () => {
  const plans = [plan("pro", [region()])];
  assert.equal(hasClaudeOverviewDecision("en", "claude"), true);
  assert.ok(getPurchaseEligibility("en", "claude", plans, "overview"));
  assert.equal(getPurchaseEligibility("en", "claude", plans, "overview")!.priceScope, undefined);
  assert.equal(getPurchaseEligibility("en", "claude", plans), null);
  for (const [locale, slug] of [["zh", "claude"], ["zh", "chatgpt"], ["en", "chatgpt"], ["en", "spotify"]] as const) {
    assert.equal(hasClaudeOverviewDecision(locale, slug), false);
    assert.equal(getPurchaseEligibility(locale, slug, plans, "overview"), null);
  }
  for (const ps of [[], [plan("pro", [region({ billingPlatform: "web" })])], [plan("pro", [region()], { billing: "yearly" })]]) assert.equal(getPurchaseEligibility("en", "claude", ps, "overview"), null);
});

test("each plan minimum retains its own name, local amount, USD conversion and collection date", () => {
  const plans = ["pro", "max-5x", "max-20x"].map((slug, i) => plan(slug, [region({ localPriceValue: [20,100,200][i], priceUsd: [20,100,200][i] }), region({ country: ["Pakistan", "India", "Japan"][i], code: ["PK", "IN", "JP"][i], priceUsd: [17,85,165][i], localPriceValue: [4900,7900,25000][i], localPrice: ["PKR 4,900", "₹7,900", "¥25,000"][i], currencyCode: ["PKR", "INR", "JPY"][i], lastCheckedAt: "2026-10-21" }), region({ billingPlatform: "web", priceUsd: 1 })]));
  plans[1].name = "Renamed published Max";
  const rows = getMonthlyAppStoreComparison(product(plans));
  assert.deepEqual(rows.map(x => x.lowest?.code), ["PK", "IN", "JP"]);
  assert.deepEqual(rows.map(x => x.lowest?.priceUsd), [17,85,165]);
  assert.deepEqual(rows.map(x => x.lowest?.localPriceValue), [4900,7900,25000]);
  assert.deepEqual(rows.map(x => x.usPrice), [20,100,200]);
  assert.equal(rows[1].plan.name, plans[1].name);
  assert.equal(rows[1].lowest?.lastCheckedAt, "2026-10-21");
  assert.equal(rows[1].regionCount, 2);
  plans[0].regions[1].priceUsd = 18;
  assert.equal(getMonthlyAppStoreComparison(product(plans))[0].lowest?.priceUsd, 18);
});

test("US comparison never falls back to the country's or another plan's minimum", () => {
  const [row] = getMonthlyAppStoreComparison(product([plan("pro", [region({ code: "PK", country: "Pakistan", localPriceValue: 4900, currencyCode: "PKR", priceUsd: 17 })])]));
  assert.equal(row.usPrice, undefined);
  assert.equal(row.lowest?.code, "PK");
});

test("unverified, wrong-period, wrong-channel and incomplete prices cannot supply a lowest quote", () => {
  for (const dataQuality of ["pending_review", "stale", "estimated", "unknown"] as const) {
    assert.equal(getMonthlyAppStoreComparison(product([plan("pro", [region({ dataQuality })])]))[0].lowest, undefined);
  }
  for (const patch of [{ billingPlatform: "web" }, { currencyCode: undefined }, { localPriceValue: undefined }, { localPriceValue: 0 }, { priceUsd: NaN }, { priceUsd: 0 }, { lastCheckedAt: undefined }, { lastCheckedAt: "invalid" }] as Partial<RegionPrice>[]) {
    assert.equal(getMonthlyAppStoreComparison(product([plan("pro", [region(patch)])]))[0].lowest, undefined);
  }
  assert.equal(getMonthlyAppStoreComparison(product([plan("pro", [region()], { billing: "yearly" })]))[0].lowest, undefined);
  assert.deepEqual(getMonthlyAppStoreComparison(product([plan("pro", [region()], { priceStatus: "pending" })])), []);
  assert.deepEqual(getMonthlyAppStoreComparison(product([plan("pro", [])])), []);
});
