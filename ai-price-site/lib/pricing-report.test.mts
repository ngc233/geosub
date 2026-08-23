import assert from "node:assert/strict";
import test from "node:test";
import { buildPricingReportDataset } from "./pricing-report.ts";

const product = {
  slug: "chatgpt",
  category: "ai" as const,
  name: "ChatGPT",
  brand: "OpenAI",
  description: "Test",
  defaultPlan: "plus",
  updatedAt: "2026-08-23",
  plans: [{
    slug: "plus",
    name: "Plus",
    billing: "monthly" as const,
    regions: [
      { rank: 1, country: "United States", code: "US", priceUsd: 20, localPrice: "$20", localPriceValue: 20, currencyCode: "USD", tax: "Tax varies", lastCheckedAt: "2026-08-23", sourceName: "OpenAI", sourceUrl: "https://openai.com/chatgpt/pricing/", dataQuality: "verified" as const },
      { rank: 2, country: "Japan", code: "JP", priceUsd: 18, localPrice: "JPY 3000", localPriceValue: 3000, currencyCode: "JPY", tax: "Tax included", lastCheckedAt: "2026-08-22", fxRateDate: "2026-08-22", sourceName: "App Store", sourceUrl: "https://apps.apple.com/jp/app/id1", dataQuality: "verified" as const },
    ],
  }],
};

test("pricing report dataset is deterministic and keeps source provenance", () => {
  const generatedAt = new Date("2026-08-23T10:00:00Z");
  const first = buildPricingReportDataset({ product, exchangeRates: {}, generatedAt });
  const second = buildPricingReportDataset({ product, exchangeRates: {}, generatedAt });
  assert.equal(first.snapshotId, second.snapshotId);
  assert.equal(first.rows[1].differenceVsUsPercent, -10);
  assert.equal(first.rows[0].sourceStatus, "official");
  assert.equal(first.canonicalReportUrl, "https://geosub.org/reports/en/chatgpt-global-pricing.pdf");
  assert.match(first.citation, /GeoSub\. ChatGPT Global Pricing Report/);
});

test("localized reports share the same canonical price snapshot", () => {
  const generatedAt = new Date("2026-08-23T10:00:00Z");
  const english = buildPricingReportDataset({ product, exchangeRates: {}, generatedAt, locale: "en" });
  const chineseProduct = structuredClone(product);
  chineseProduct.plans[0].regions[0].country = "美国";
  chineseProduct.plans[0].regions[1].country = "日本";
  const chinese = buildPricingReportDataset({ product: chineseProduct, exchangeRates: {}, generatedAt, locale: "zh" });
  assert.equal(chinese.snapshotId, english.snapshotId);
  assert.equal(chinese.datasetVersion, english.datasetVersion);
  assert.match(chinese.reportTitle, /全球价格报告/);
  assert.equal(chinese.canonicalReportUrl, "https://geosub.org/reports/zh/chatgpt-global-pricing.pdf");
});

test("snapshot changes when canonical price data changes", () => {
  const generatedAt = new Date("2026-08-23T10:00:00Z");
  const first = buildPricingReportDataset({ product, exchangeRates: {}, generatedAt });
  const changed = structuredClone(product);
  changed.plans[0].regions[1].priceUsd = 19;
  const second = buildPricingReportDataset({ product: changed, exchangeRates: {}, generatedAt });
  assert.notEqual(first.snapshotId, second.snapshotId);
});
