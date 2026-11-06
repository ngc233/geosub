import assert from "node:assert/strict";
import test from "node:test";
import { HOMEPAGE_REPRESENTATIVE_PLANS } from "./homepage-representative-plans.ts";
import { getHomepageRepresentatives } from "./homepage-representatives.ts";
import { getComparablePriceRows, type CountryHubPrice } from "./country-hubs.ts";

// Entirely fictional unit-test prices; never copied from production or seeded into a database.
function rows(count = 10, planSlug = "chosen") {
  const countries = ["US", "PH", "JP", "TR", "IN", "GB", "DE", "FR", "BR", "CA", "AU"];
  return getComparablePriceRows(countries.slice(0, count).map((countryCode): CountryHubPrice => ({
    productSlug: "fictional", productName: "Fictional", category: "ai", planSlug, planName: planSlug,
    countryCode, amount: 20.123, currency: "USD", platform: "ios", billingCycle: "monthly", priceType: "list_price",
    quality: "verified", confidence: 90, checkedAt: "2026-11-05T00:00:00Z",
    sourceUrl: `https://apps.apple.com/${countryCode.toLowerCase()}/app/id1`, observationId: null,
  })), {}, new Date("2026-11-06T03:00:00Z"));
}
const configuration = { fictional: "chosen" };

test("approved configuration contains 34 individual tiers and excludes Boomplay", () => {
  assert.equal(Object.keys(HOMEPAGE_REPRESENTATIVE_PLANS).length, 34);
  assert.equal(HOMEPAGE_REPRESENTATIVE_PLANS.boomplay, undefined);
  // Approved choices that differ from greatest-coverage or cheapest-tier suggestions.
  for (const [product, plan] of Object.entries({ chatgpt: "plus", crunchyroll: "mega-fan", gemini: "pro", grok: "super", "hbo-max": "standard", netflix: "standard", poe: "basic", "x-premium": "premium" })) {
    assert.equal(HOMEPAGE_REPRESENTATIVE_PLANS[product], plan);
  }
  assert.equal(Object.isFrozen(HOMEPAGE_REPRESENTATIVE_PLANS), true);
});

test("ten distinct regions qualifies; nine or duplicates do not; raw USD remains unrounded", () => {
  const nine = rows(9);
  assert.equal(getHomepageRepresentatives([...nine, nine[0]], configuration).representatives.length, 0);
  assert.equal(getHomepageRepresentatives(nine, configuration).issues[0].reason, "insufficient-regions");
  const input = rows();
  const before = JSON.stringify(input);
  const result = getHomepageRepresentatives(input, configuration);
  assert.equal(result.representatives[0].usPrice, 20.123);
  assert.equal(result.representatives[0].regionCount, 10);
  assert.deepEqual(result.issues, []);
  assert.equal(JSON.stringify(input), before, "D1's canonical collection stays intact");
});

test("missing or invalid US price hides the configured plan even when another plan qualifies", () => {
  for (const usd of [0, NaN, Infinity]) {
    const invalid = rows(11).map(row => row.countryCode === "US" ? { ...row, usd } : row);
    const result = getHomepageRepresentatives([...invalid, ...rows(11, "alternative")], configuration);
    assert.equal(result.representatives.length, 0);
    assert.equal(result.issues[0].reason, "missing-us-price");
  }
  const result = getHomepageRepresentatives([...rows(11).filter(row => row.countryCode !== "US"), ...rows(11, "alternative")], configuration);
  assert.equal(result.representatives.length, 0);
  assert.equal(result.issues[0].regionCount, 10);
});

test("disappeared and insufficient configured plans never fall back; recovery restores exactly that plan", () => {
  for (const input of [rows(11, "alternative"), [...rows(9), ...rows(11, "alternative")]]) {
    assert.equal(getHomepageRepresentatives(input, configuration).representatives.length, 0);
  }
  assert.equal(getHomepageRepresentatives(rows(11, "alternative"), configuration).issues[0].reason, "missing-plan");
  const recovered = getHomepageRepresentatives([...rows(), ...rows(11, "alternative")], configuration);
  assert.deepEqual(recovered.representatives.map(row => row.planSlug), ["chosen"]);
});
