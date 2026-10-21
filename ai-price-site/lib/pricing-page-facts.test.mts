import assert from "node:assert/strict";
import test from "node:test";
import { getPricingPagePlan, getCountryPricingPlans } from "./pricing-page-facts.ts";
import { getDefaultPlanRegions, getPlanStats, type ProductPlan, type RegionPrice } from "./public-pricing-model.ts";
import { getCountryPagePilot, getCountryPageCopy } from "./country-page-pilot.ts";
import { getPlanSearchIntentCopy } from "./plan-search-intent.ts";
import { getProductEditorialContent } from "./product-editorial-content.ts";
import { getPurchaseEligibility } from "./purchase-eligibility.ts";

function row(code: string, billingPlatform = "ios", priceUsd = 20): RegionPrice {
  return { code, country: code, billingPlatform, priceUsd, localPrice: `$${priceUsd}`, tax: "Unknown", rank: 1 };
}
function plan(regions: RegionPrice[], name = "Plus"): ProductPlan {
  return { slug: "plus", name, billing: "monthly", regions };
}

test("49 source rows yield the same 39 iOS rows in copy, stats and table", () => {
  const source = plan([...Array.from({ length: 39 }, (_, i) => row(`I${i}`)), ...Array.from({ length: 10 }, (_, i) => row(`W${i}`, "web", 1))]);
  const view = getPricingPagePlan(source, "/en/ai-pricing/chatgpt/plus");
  assert.equal(view.regions.length, 39);
  assert.deepEqual(view.regions.map((r) => r.code), getDefaultPlanRegions(source).map((r) => r.code));
  assert.equal(getPlanStats(view).minRegion.priceUsd, 20);
  const copy = getPlanSearchIntentCopy({ locale: "en", displayName: "ChatGPT Plus", productName: "ChatGPT", regionCount: view.regions.length, lowestCountry: "I0", lowestPrice: "$20.00", content: getProductEditorialContent("en", "chatgpt", "plus") });
  assert.match(copy!.description, /39 reviewed App Store regions/);
  assert.doesNotMatch(copy!.description, /49|\$1\.00/);
  assert.equal(source.regions.length, 49);
});

test("the active Chinese Plus experiment retains its original copy input", () => {
  const source = plan([row("US"), row("US", "web", 1)]);
  assert.equal(getPricingPagePlan(source, "/zh/ai-pricing/chatgpt/plus"), source);
  assert.equal(getPricingPagePlan(source, "/zh/ai-pricing/chatgpt/pro").regions.length, 1);
});

test("default platform fallback and empty prices remain honest", () => {
  for (const source of [plan([]), plan([row("US", "web")]), plan([row("US", "google_play")])]) {
    assert.deepEqual(getPricingPagePlan(source, "/en/ai-pricing/chatgpt/plus").regions, getDefaultPlanRegions(source));
  }
});

test("regional names and counts follow displayed monthly iOS rows as plans change", () => {
  const pilot = getCountryPagePilot("chatgpt", "philippines", "ai")!;
  const source = [plan([row("PH", "web", 1), row("PH")], "Pro 100"), { ...plan([row("PH")], "Pro 200"), slug: "pro" }, { ...plan([row("PH")], "Annual"), billing: "yearly" as const }, plan([row("US")], "Unavailable here")];
  const rows = getCountryPricingPlans(source, "PH");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].region!.priceUsd, 20);
  assert.equal(rows[0].region!.rank, 1);
  for (const locale of ["zh", "en"] as const) {
    const copy = getCountryPageCopy(pilot, locale, rows);
    assert.match(copy.description, /2/);
    assert.match(copy.description, /Pro 100/);
    assert.match(copy.decisionSummary, /Pro 200/);
    assert.doesNotMatch(JSON.stringify(copy), /5x|20x|搜索需求|search interest|Annual/);
    const changed = getCountryPageCopy(pilot, locale, [{ ...rows[0], name: "Renamed tier" }]);
    assert.match(changed.description, /1/);
    assert.match(changed.description, /Renamed tier/);
    assert.doesNotMatch(changed.description, /Pro 100|Pro 200/);
  }
  assert.equal(getCountryPricingPlans([plan([row("PH", "web")])], "PH").length, 0);
});

test("Netflix eligibility is shared by all iOS tiers, with separate evidence date", () => {
  for (const slug of ["basic", "standard", "premium"]) {
    const note = getPurchaseEligibility("en", "netflix", [{ ...plan([row("US")]), slug }]);
    assert.match(note!.description, /unavailable to new or rejoining/);
    assert.match(note!.title, /renewal/);
    assert.equal(note!.url, "https://help.netflix.com/en/node/25097");
    assert.equal(note!.checkedAt, "2026-10-21");
  }
  assert.equal(getPurchaseEligibility("en", "netflix", [plan([row("US", "web")])]), null);
  assert.equal(getPurchaseEligibility("en", "netflix", [plan([])]), null);
  assert.equal(getPurchaseEligibility("zh", "chatgpt", [plan([row("US")])]), null);
});

test("intent copy uses billing period and renewal scope instead of assuming monthly signup", () => {
  const base = { locale: "en" as const, displayName: "Netflix Standard", productName: "Netflix", regionCount: 2, lowestCountry: "US", lowestPrice: "$20.00", content: getProductEditorialContent("en", "netflix", "standard") };
  const copy = getPlanSearchIntentCopy({ ...base, priceScope: "App Store renewal prices", billing: "yearly" });
  assert.match(copy!.description, /renewal prices/);
  assert.match(copy!.description, /per year/);
  assert.doesNotMatch(copy!.description, /per month/);
  assert.ok(copy!.description.length <= 160);
});

test("freshness and source labels use the selected price rows, not another channel", () => {
  const source = plan([
    { ...row("US"), lastCheckedAt: "2026-10-19", sourceName: "Apple", confidenceScore: 100, dataQuality: "verified" },
    { ...row("US", "web"), lastCheckedAt: "2026-10-21", sourceName: "Website", confidenceScore: 100, dataQuality: "verified" },
  ]);
  const view = getPricingPagePlan(source, "/en/ai-pricing/chatgpt/plus");
  assert.equal(view.freshness?.priceCollectedAt, "2026-10-19");
  assert.equal(view.freshness?.sourceLabel, "Apple");
  assert.equal(getPricingPagePlan(plan([]), "/en/ai-pricing/chatgpt/plus").freshness?.trustStatus, "needs_review");
});

test("regional rank is recalculated after platform filtering", () => {
  const source = plan([{ ...row("US", "web", 1), rank: 1 }, { ...row("PH", "ios", 20), rank: 3 }, { ...row("US", "ios", 19), rank: 2 }]);
  const regional = getCountryPricingPlans([source], "PH")[0];
  assert.equal(regional.region!.rank, 2);
  assert.equal(regional.regions.length, 2);
  assert.deepEqual(getPricingPagePlan(source, "/en/ai-pricing/chatgpt/plus").regions.map((r) => r.rank), [1, 2]);
});
