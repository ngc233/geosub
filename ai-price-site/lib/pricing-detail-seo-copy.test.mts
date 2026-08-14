import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const libDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(libDir, "pricing-detail-seo-copy.ts"),
  "utf8",
);
const detailPage = readFileSync(
  resolve(libDir, "..", "components", "PricingDetailPage.tsx"),
  "utf8",
);

test("pricing detail SEO copy covers every active locale", () => {
  for (const locale of [
    "zh",
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
  ]) {
    assert.match(source, new RegExp(`\\n  ${locale}: \\{`));
  }

  assert.match(source, /withTraditionalChinese/);
  assert.match(
    source,
    /Record<Exclude<SiteLocale, "zh-tw">, SeoTemplate>/,
  );
});

test("pricing detail SEO copy uses search intent and live plan facts", () => {
  assert.match(source, /getPlanDisplayName\(productName, planName\)/);
  assert.match(source, /regionCount/);
  assert.match(source, /stats\.minRegion\.country/);
  assert.match(source, /formatUsd\(stats\.minRegion\.priceUsd\)/);
  assert.match(source, /new Date\(\)\.getFullYear\(\)/);
  assert.match(source, /Price by Country/);
  assert.match(source, /多少钱？各地区价格对比/);
  assert.match(source, /starts at about/);
  assert.doesNotMatch(source, /Cheapest Regions/);
});

test("English plan titles leave room for the site-name suffix", () => {
  assert.match(
    source,
    /title: \(name, year\) => `\$\{name\} Price by Country \(\$\{year\}\)`/,
  );
  assert.ok("ChatGPT Pro 20x Price by Country (2026) - GeoSub".length <= 60);
});

test("pricing detail metadata uses the dedicated SEO copy", () => {
  assert.match(detailPage, /getPricingDetailSeoCopy/);
  assert.match(detailPage, /const seoCopy = getPricingDetailSeoCopy/);
  assert.match(detailPage, /: seoCopy\.title/);
  assert.match(
    detailPage,
    /searchIntentCopy\?\.description \|\| seoCopy\.description/,
  );
  assert.match(
    detailPage,
    /searchIntentCopy\?\.description \|\| pageDescription/,
  );
});

test("priority Chinese product overviews are not overridden by stale database SEO", () => {
  assert.match(detailPage, /const hasOverviewEditorial = publishedPlans\.some/);
  assert.match(detailPage, /configuredTitle && !hasOverviewEditorial/);
  assert.match(
    detailPage,
    /hasChineseText\(seoMeta\?\.description\) &&\s*!hasOverviewEditorial/,
  );
});
