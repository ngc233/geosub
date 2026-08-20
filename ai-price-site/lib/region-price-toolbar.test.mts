import assert from "node:assert/strict";
import test from "node:test";
import type { RegionPrice } from "./public-pricing-model.ts";
import {
  filterRegionPrices,
  getRegionPriceToolbarCopy,
  matchesRegionPriceQuickFilter,
} from "./region-price-toolbar.ts";

const regions: RegionPrice[] = [
  {
    rank: 1,
    country: "Philippines",
    code: "PH",
    priceUsd: 16,
    localPrice: "PHP 999",
    currencyCode: "PHP",
    tax: "12% VAT included",
    taxConfidence: "high",
    taxReviewStatus: "verified",
    sourceUrl: "https://apps.apple.com/ph/app/example",
    lastCheckedAt: "2026-08-18",
  },
  {
    rank: 2,
    country: "United States",
    code: "US",
    priceUsd: 20,
    localPrice: "USD 20",
    currencyCode: "USD",
    tax: "Varies by state",
    taxConfidence: "medium",
    taxReviewStatus: "needs_review",
    sourceUrl: "https://apps.apple.com/us/app/example",
    lastCheckedAt: "2026-08-18",
  },
  {
    rank: 3,
    country: "Japan",
    code: "JP",
    priceUsd: 18,
    localPrice: "JPY 3000",
    currencyCode: "JPY",
    tax: "10% consumption tax included",
    taxConfidence: "high",
    taxReviewStatus: "verified",
  },
];

test("region search matches localized names, country codes and currencies", () => {
  assert.deepEqual(
    filterRegionPrices({
      regions,
      query: "菲律宾",
      filter: "all",
      referencePrice: 20,
      locale: "zh",
    }).map((region) => region.code),
    ["PH"],
  );
  assert.equal(
    filterRegionPrices({
      regions,
      query: "jpy",
      filter: "all",
      referencePrice: 20,
      locale: "en",
    })[0]?.code,
    "JP",
  );
});

test("quick filters only use explicit price and evidence fields", () => {
  assert.equal(matchesRegionPriceQuickFilter(regions[0], "belowReference", 20), true);
  assert.equal(matchesRegionPriceQuickFilter(regions[1], "belowReference", 20), false);
  assert.equal(matchesRegionPriceQuickFilter(regions[0], "trustedTax", 20), true);
  assert.equal(matchesRegionPriceQuickFilter(regions[1], "trustedTax", 20), false);
  assert.equal(matchesRegionPriceQuickFilter(regions[0], "traceableSource", 20), true);
  assert.equal(matchesRegionPriceQuickFilter(regions[2], "traceableSource", 20), false);
});

test("every prepared locale has complete toolbar copy", () => {
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
    const copy = getRegionPriceToolbarCopy(locale);
    assert.ok(copy.searchPlaceholder.length > 0);
    assert.ok(copy.filterLabels.traceableSource.length > 0);
    assert.ok(copy.resultCount(1, 2).length > 0);
  }
});
