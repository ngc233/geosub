import assert from "node:assert/strict";
import test from "node:test";
import { getCountryHubRows, getPriorityCountry, priorityCountries, type CountryHubPrice } from "./country-hubs.ts";
const now = new Date("2026-10-25T12:00:00Z");
const rate = { rate: 50, source: "fixture", rateDate: "2026-10-25", fetchedAt: "2026-10-25T11:00:00Z", isFallback: false };
function row(extra: Partial<CountryHubPrice> = {}): CountryHubPrice {
  return { productSlug: "chatgpt", productName: "ChatGPT", category: "ai", planSlug: "plus", planName: "Plus", countryCode: "PH", amount: 999, currency: "PHP", platform: "ios", billingCycle: "monthly", priceType: "list_price", quality: "verified", confidence: 90, checkedAt: "2026-10-24", sourceUrl: "https://apps.apple.com/ph/app/id1", observationId: null, ...extra };
}
const us = row({ countryCode: "US", currency: "USD", amount: 20, sourceUrl: "https://apps.apple.com/us/app/id1" });
test("four approved country hubs only, not arbitrary country route expansion", () => {
  assert.equal(priorityCountries.length, 4);
  assert.equal(getPriorityCountry("japan")!.code, "JP");
  assert.equal(getPriorityCountry("../../admin"), undefined);
});
test("compare the same monthly iOS plan using current FX, never a different tier", () => {
  const rows = getCountryHubRows([row(), us, row({ countryCode: "US", amount: 1, planSlug: "go" })], "PH", { PHP: rate }, now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].usd, 19.98);
  assert.equal(rows[0].usPrice, 20);
  assert.equal(rows[0].difference, 0);
  assert.equal(getCountryHubRows([row(), { ...us, planSlug: "go" }], "PH", { PHP: rate }, now)[0].difference, null);
});
test("stale, unverified, mixed-platform and wrong-period rows cannot enter the country list", () => {
  for (const extra of [{ platform: "web" }, { billingCycle: "yearly" }, { quality: "estimated" }, { quality: "pending_review" }, { quality: "stale" }, { confidence: 79 }, { checkedAt: "2026-09-01" }, { checkedAt: "invalid" }, { checkedAt: "2026-10-26" }, { amount: NaN }, { sourceUrl: null }, { priceType: "sale_price" }]) assert.deepEqual(getCountryHubRows([row(extra)], "PH", { PHP: rate }, now), []);
});
test("missing, stale, invalid and future FX remain unknown, preserving local price", () => {
  for (const rates of [Object.create(null) as Record<string, typeof rate>, { PHP: { ...rate, isStale: true } }, { PHP: { ...rate, fetchedAt: "invalid" } }, { PHP: { ...rate, fetchedAt: "2026-10-26" } }, { PHP: { ...rate, fetchedAt: "2026-10-23" } }]) {
    const rows = getCountryHubRows([row(), us], "PH", rates, now);
    assert.equal(rows[0].usd, null);
    assert.equal(rows[0].difference, null);
    assert.equal(rows[0].amount, 999);
  }
});
test("local USD pricing needs no invented FX, but missing US baselines remain unknown", () => {
  const rows = getCountryHubRows([row({ currency: "USD", amount: 10 }), us], "PH", {}, now);
  assert.equal(rows[0].difference, -50);
  assert.equal(getCountryHubRows([row({ currency: "USD", amount: 10 })], "PH", {}, now)[0].difference, null);
});
