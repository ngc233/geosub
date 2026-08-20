import assert from "node:assert/strict";
import test from "node:test";
import type { RegionPrice } from "./public-pricing-model.ts";
import {
  getRegionComparisonKey,
  getRegionPriceDecisionCopy,
  REGION_COMPARISON_LIMIT,
  toggleRegionComparison,
} from "./region-price-decision.ts";

const region: RegionPrice = {
  rank: 1,
  country: "Japan",
  code: "JP",
  priceUsd: 18,
  localPrice: "JPY 3000",
  currencyCode: "JPY",
  billingPlatform: "ios",
  tax: "10% consumption tax included",
};

test("comparison keys distinguish platform and listed price", () => {
  const key = getRegionComparisonKey(region);
  assert.equal(key, "JP::ios::JPY::JPY 3000");
  assert.notEqual(
    key,
    getRegionComparisonKey({ ...region, billingPlatform: "android" }),
  );
});

test("comparison selection toggles and never exceeds its limit", () => {
  let selected: string[] = [];
  selected = toggleRegionComparison(selected, "one");
  selected = toggleRegionComparison(selected, "two");
  selected = toggleRegionComparison(selected, "three");
  selected = toggleRegionComparison(selected, "four");
  assert.equal(selected.length, REGION_COMPARISON_LIMIT);
  assert.deepEqual(selected, ["one", "two", "three"]);
  assert.deepEqual(toggleRegionComparison(selected, "two"), ["one", "three"]);
});

test("every prepared locale has complete decision copy", () => {
  for (const locale of [
    "zh",
    "zh-tw",
    "en",
    "ja",
    "ko",
    "es",
    "tr",
    "ar",
    "fr",
    "it",
    "de",
    "pt",
  ] as const) {
    const copy = getRegionPriceDecisionCopy(locale);
    assert.ok(copy.comparisonTitle.length > 0);
    assert.ok(copy.evidenceTitle("Japan").includes("Japan"));
    assert.ok(copy.selected(2).length > 0);
  }
});
