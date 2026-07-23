import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(appDir, "..");
const locales = [
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
] as const;

function readSiteFile(...segments: string[]) {
  return readFileSync(resolve(siteDir, ...segments), "utf8");
}

test("currency converter is available in every launched locale", () => {
  for (const locale of locales) {
    const pagePath = resolve(
      appDir,
      locale,
      "tools",
      "currency-converter",
      "page.tsx",
    );
    assert.ok(existsSync(pagePath), locale);
    const source = readFileSync(pagePath, "utf8");
    assert.match(source, new RegExp(`locale="${locale}"`), locale);
    assert.match(
      source,
      new RegExp(`getCurrencyConverterMetadata\\("${locale}"\\)`),
      locale,
    );
  }
});

test("converter uses shared localized copy and locale currency defaults", () => {
  const converter = readSiteFile(
    "components",
    "SubscriptionCurrencyConverter.tsx",
  );
  const copy = readSiteFile("lib", "currency-converter-copy.ts");
  const page = readSiteFile("components", "CurrencyConverterPage.tsx");

  for (const locale of ["zh", "en", "ja", "ko", "es", "tr", "ar", "fr", "it", "de", "pt"]) {
    assert.match(copy, new RegExp(`\\n    ${locale}:`), locale);
  }

  assert.match(converter, /localeDefinition\.defaultCurrency/);
  assert.match(converter, /new Intl\.DisplayNames/);
  assert.match(converter, /getNumberSeparators\(locale\)/);
  assert.match(converter, /document\.addEventListener\("pointerdown"/);
  assert.match(converter, /event\.key === "Escape"/);
  assert.match(page, /"@type": "WebApplication"/);
  assert.match(page, /"@type": "FAQPage"/);
  assert.match(page, /isAccessibleForFree: true/);
  assert.doesNotMatch(copy, /\uFFFD/);
});

test("converter is indexable, mirrored, and present in the sitemap", () => {
  const page = readSiteFile("components", "CurrencyConverterPage.tsx");
  const footer = readSiteFile("components", "Footer.tsx");
  const routes = readSiteFile("lib", "public-launch-routes.ts");
  const sitemap = readSiteFile("app", "sitemap.ts");

  assert.match(page, /index: true/);
  assert.match(page, /follow: true/);
  assert.match(routes, /"\/tools\/currency-converter"/);
  assert.match(sitemap, /tools\/currency-converter/);
  assert.match(sitemap, /supportedSiteLocales\.map/);
  assert.match(sitemap, /getFeaturedCurrencyPairs\(locale\)/);
  assert.match(
    footer,
    /withSiteLocale\(\s*"\/tools\/currency-converter",\s*currentLocale/,
  );
});

test("curated currency-pair pages exist for every launched locale", () => {
  const pairs = readSiteFile("lib", "currency-pairs.ts");
  const routePage = readSiteFile(
    "components",
    "CurrencyPairRoutePage.tsx",
  );

  for (const locale of locales) {
    const pagePath = resolve(
      appDir,
      locale,
      "tools",
      "currency-converter",
      "[pair]",
      "page.tsx",
    );
    assert.ok(existsSync(pagePath), locale);
    assert.match(
      readFileSync(pagePath, "utf8"),
      new RegExp(`"${locale}"`),
      locale,
    );
  }

  assert.match(pairs, /featuredPairsByLocale/);
  assert.match(pairs, /pair\("USD", "GBP"\)/);
  assert.match(pairs, /pair\("USD", "BRL"\)/);
  assert.match(pairs, /pair\("EUR", "CHF"\)/);
  assert.match(pairs, /getCurrencyPairLocales/);
  assert.match(routePage, /if \(!pair\) notFound\(\)/);
  assert.doesNotMatch(pairs, /\uFFFD/);
});

test("pair metadata only links to locales where the same pair exists", () => {
  const page = readSiteFile("components", "CurrencyConverterPage.tsx");

  assert.match(page, /getCurrencyPairLocales\(pair\.slug\)/);
  assert.match(page, /siteLocaleDefinitions\[pairLocale\]\.htmlLang/);
  assert.match(page, /"x-default"/);
  assert.match(page, /alternates:/);
});

test("converter reads all display rates in one database round trip", () => {
  const currencies = readSiteFile("lib", "display-currency.ts");
  const rates = readSiteFile("lib", "exchange-rates.ts");
  const page = readSiteFile("components", "CurrencyConverterPage.tsx");

  for (const currency of [
    "GBP",
    "CHF",
    "INR",
    "BRL",
    "MXN",
    "AED",
    "NZD",
    "ZAR",
  ]) {
    assert.match(currencies, new RegExp(`"${currency}"`), currency);
  }

  assert.match(rates, /getLatestUsdExchangeRates/);
  assert.match(rates, /Prisma\.join\(quotes\)/);
  assert.match(rates, /SELECT DISTINCT ON \(quote_currency\)/);
  assert.match(page, /getLatestUsdExchangeRates/);
  assert.doesNotMatch(page, /getLatestExchangeRate\("USD", currency\)/);
});

test("stale or missing exchange rates cannot produce a conversion", () => {
  const converter = readSiteFile(
    "components",
    "SubscriptionCurrencyConverter.tsx",
  );

  assert.match(converter, /!rate \|\| rate\.rate <= 0 \|\| rate\.isStale/);
  assert.match(converter, /rateMap\.get\(from\)\?\.rate \|\| 0/);
  assert.match(converter, /if \(fromRate <= 0 \|\| toRate <= 0\) return null/);
  assert.match(converter, /pairIsStale/);
});

test("shared language menu uses logical positioning on RTL pages", () => {
  const header = readSiteFile("components", "Header.tsx");

  assert.match(header, /"absolute end-0 top-\[46px\]/);
  assert.doesNotMatch(header, /"absolute right-0 top-\[46px\]/);
});
