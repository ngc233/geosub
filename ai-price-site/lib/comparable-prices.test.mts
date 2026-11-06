import assert from "node:assert/strict";
import test from "node:test";
import { getRepresentativePlanCandidates } from "./comparable-price-candidates.ts";
import { getComparablePriceRows, getCountryHubRows, getVerifiedPriceRows, type CountryHubPrice, type HubRate } from "./country-hubs.ts";

const now = new Date("2026-11-06T03:00:00Z");
const rate: HubRate = { rate: 50, source: "unit-test", rateDate: "2026-11-06", fetchedAt: "2026-11-06T02:00:00Z", isFallback: false };
function price(countryCode: string, overrides: Partial<CountryHubPrice> = {}): CountryHubPrice {
  return { productSlug: "test", productName: "Test", category: "ai", planSlug: "monthly", planName: "Monthly", countryCode,
    amount: 999, currency: countryCode === "US" ? "USD" : "PHP", platform: "ios", billingCycle: "monthly", priceType: "list_price",
    quality: "verified", confidence: 90, checkedAt: "2026-11-05T00:00:00Z", sourceUrl: `https://apps.apple.com/${countryCode.toLowerCase()}/app/id1`, observationId: null, ...overrides };
}

test("country rows retain local prices while the shared comparable collection rejects unavailable FX", () => {
  const prices = [price("US", { amount: 20 }), price("PH"), price("JP", { currency: "JPY" })];
  for (const invalid of [undefined, { ...rate, isStale: true }, { ...rate, isExpired: true }, { ...rate, isFallback: true },
    { ...rate, fetchedAt: "invalid" }, { ...rate, fetchedAt: "2026-11-07" }, { ...rate, fetchedAt: "2026-11-05" },
    { ...rate, source: null }, { ...rate, rateDate: null }, { ...rate, rate: 0 }, { ...rate, rate: Infinity }]) {
    const rates: Record<string, HubRate> = invalid ? { PHP: invalid } : {};
    const country = getCountryHubRows(prices, "PH", rates, now);
    assert.equal(country.length, 1);
    assert.equal(country[0].amount, 999);
    assert.equal(country[0].usd, null);
    assert.equal(country[0].difference, null);
    assert.deepEqual(getComparablePriceRows(prices, rates, now).map(row => row.countryCode), ["US"]);
  }
});

test("valid USD rows do not require US baseline; never substitute another tier or rounded values", () => {
  const rows = getComparablePriceRows([price("PH"), price("US", { planSlug: "different", amount: 20 })], { PHP: rate }, now);
  const local = rows.find(row => row.countryCode === "PH")!;
  assert.equal(local.usd, 19.98);
  assert.equal(local.usPrice, null);
  const same = getComparablePriceRows([price("PH"), price("US", { amount: 20 })], { PHP: rate }, now).find(row => row.countryCode === "PH")!;
  assert.equal(same.usd, 19.98);
  assert.equal(same.usPrice, 20);
  assert.equal(same.difference, 0); // Legacy display stays rounded; consumers have raw USD.
});

test("projections recheck exact freshness boundaries against the current time, even for a cached snapshot", () => {
  const prices = [price("PH", { checkedAt: new Date(now.getTime() - 14 * 86400_000).toISOString() })];
  const rates = { PHP: { ...rate, fetchedAt: new Date(now.getTime() - 18 * 3600_000).toISOString() } };
  assert.equal(getComparablePriceRows(prices, rates, now).length, 1);
  assert.equal(getComparablePriceRows(prices, rates, new Date(now.getTime() + 1)).length, 0);
  const freshPrice = [price("PH")];
  assert.equal(getCountryHubRows(freshPrice, "PH", rates, new Date(now.getTime() + 1))[0].usd, null);
});

test("all-country rows preserve per-country ordering and source normalization without mutating the shared snapshot", () => {
  const prices = [price("PH", { planSlug: "other", planName: "Other", amount: 500 }), price("US", { amount: 20 }),
    price("PH", { sourceUrl: "https://apps.apple.com/ph/app/id1?tracking=test#ignored" }), price("JP", { currency: "USD", amount: 10 })];
  const before = JSON.stringify(prices);
  const rows = getVerifiedPriceRows(prices, { PHP: rate }, now);
  for (const code of ["PH", "US", "JP", "TR"]) assert.deepEqual(getCountryHubRows(prices, code, { PHP: rate }, now), rows.filter(row => row.countryCode === code));
  const ph = getCountryHubRows(prices, "PH", { PHP: rate }, now);
  assert.deepEqual(ph.map(row => row.planSlug), ["monthly", "other"]);
  assert.equal(ph[0].sourceUrl, "https://apps.apple.com/ph/app/id1");
  assert.equal(JSON.stringify(prices), before);
});

test("wrong quality, platform, cycle, source, amount or timestamp cannot enter either projection", () => {
  for (const extra of [{ quality: "pending_review" }, { quality: "stale" }, { confidence: 79 }, { platform: "web" },
    { billingCycle: "yearly" }, { priceType: "sale_price" }, { sourceUrl: "https://example.com/ph" },
    { sourceUrl: "https://apps.apple.com/us/app/id1" }, { amount: 0 }, { amount: NaN }, { checkedAt: "invalid" }, { checkedAt: "2026-11-07" }]) {
    assert.deepEqual(getComparablePriceRows([price("PH", extra)], { PHP: rate }, now), []);
    assert.deepEqual(getCountryHubRows([price("PH", extra)], "PH", { PHP: rate }, now), []);
  }
});

test("representatives require a US row and ten distinct regions, and mark only the configured plan, regardless of coverage", () => {
  const countries = ["US", "PH", "JP", "TR", "IN", "GB", "DE", "FR", "BR", "CA"];
  const prices = countries.flatMap(code => [price(code, { currency: "USD", planSlug: "a" }), price(code, { currency: "USD", planSlug: "b" })]);
  const rows = getComparablePriceRows(prices, {}, now);
  const result = getRepresentativePlanCandidates(rows, { test: "b" });
  assert.deepEqual(result.map(row => [row.planSlug, row.regionCount, row.recommended]), [["a", 10, false], ["b", 10, true]]);
  assert.deepEqual(getRepresentativePlanCandidates(rows.filter(row => row.countryCode !== "US")), []);
  assert.deepEqual(getRepresentativePlanCandidates(rows.filter(row => row.countryCode !== "CA")), []);
  assert.deepEqual(getRepresentativePlanCandidates([...rows, rows[0]], { test: "b" }), result, "duplicate rows do not create extra regions");
});
