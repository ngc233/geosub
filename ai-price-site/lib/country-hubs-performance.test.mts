import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { getCountryHubRows, getVerifiedPriceRows, type CountryHubPrice, type HubRate } from "./country-hubs.ts";
import * as before from "./test-fixtures/country-hubs-before-map.ts";
import { makeVerifiedPriceScale, scaleNow } from "./test-fixtures/verified-price-scale.ts";

// Preserve the original 50 combinations as CI regression coverage, in addition
// to the external comparison against the original main function at 1c04928.
test("50 country/FX/US-presence combinations stay field-for-field identical", () => {
  const prices: CountryHubPrice[] = [];
  for (const code of ["US", "PH", "JP", "TR", "IN"]) for (let i = 0; i < 12; i++) prices.push({
    productSlug: `fixture-${i % 3}`, productName: `Fixture ${i % 3}`, category: "ai", planSlug: `p${i}`, planName: `P ${i}`,
    countryCode: code, amount: 20 + i, currency: code === "US" ? "USD" : "PHP", platform: i === 11 ? "web" : "ios",
    billingCycle: i === 10 ? "yearly" : "monthly", priceType: "list_price", quality: i === 9 ? "pending_review" : "verified",
    confidence: 90, checkedAt: i === 8 ? "2026-09-01" : "2026-11-05", sourceUrl: i === 7 ? null : `https://apps.apple.com/${code.toLowerCase()}/app/id1?x=1`, observationId: null,
  });
  const rate = { rate: 50, source: "fixture", rateDate: "2026-11-06", fetchedAt: "2026-11-06T02:00:00Z", isFallback: false };
  let cases = 0;
  const rateCases: Record<string, HubRate>[] = [{}, { PHP: rate }, { PHP: { ...rate, fetchedAt: "2026-11-01" } }, { PHP: { ...rate, fetchedAt: "2026-11-07" } }, { PHP: { ...rate, isFallback: true } }];
  for (const rates of rateCases) {
    for (const code of ["US", "PH", "JP", "TR", "IN"]) for (const input of [prices, prices.filter(row => row.countryCode !== "US")]) {
      assert.deepEqual(getCountryHubRows(input, code, rates, scaleNow), before.getCountryHubRows(input, code, rates, scaleNow));
      cases++;
    }
  }
  assert.equal(cases, 50);
});

test("Map preserves first-valid-US semantics, missing FX, tuple identity and row order", () => {
  const { prices, rates } = makeVerifiedPriceScale(78);
  const us = prices.find(row => row.countryCode === "US")!;
  const variants = [
    [{ ...us, amount: 0 }, ...prices, { ...us, amount: 777 }],
    [{ ...us, currency: "JPY" }, ...prices], // First valid US exists but cannot convert; do not skip to a later US.
    [{ ...us, productSlug: "a:b", planSlug: "c" }, { ...us, productSlug: "a", planSlug: "b:c", amount: 999 }, ...prices],
    prices.toReversed(),
  ];
  for (const input of variants) {
    const snapshot = structuredClone(input);
    assert.deepEqual(getVerifiedPriceRows(input, rates, scaleNow), before.getVerifiedPriceRows(input, rates, scaleNow));
    assert.deepEqual(input, snapshot);
  }
});

test("3000 fictional rows: record projection durations without a timing gate", t => {
  const { prices, rates } = makeVerifiedPriceScale();
  const run = (fn: typeof getVerifiedPriceRows) => {
    const start = performance.now();
    const result = fn(prices, rates, scaleNow);
    return { result, ms: performance.now() - start };
  };
  assert.equal(prices.length, 3000);
  // Warm up both implementations, then alternate to reduce order bias.
  run(before.getVerifiedPriceRows); run(getVerifiedPriceRows);
  const oldMs: number[] = [], mapMs: number[] = [];
  for (let i = 0; i < 5; i++) {
    const old = run(before.getVerifiedPriceRows), current = run(getVerifiedPriceRows);
    oldMs.push(old.ms); mapMs.push(current.ms);
    assert.deepEqual(current.result, old.result);
  }
  t.diagnostic(JSON.stringify({ rows: 3000, beforeMs: oldMs, mapMs, timingThreshold: null }));
});
