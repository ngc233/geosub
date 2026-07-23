import assert from "node:assert/strict";
import test from "node:test";
import {
  getPreparedSiteLocaleDefinition,
  getSiteLocaleFromPath,
  isPreparedSiteLocale,
  isSiteLocale,
  preparedSiteLocales,
  replaceSiteLocaleInPath,
  supportedSiteLocales,
} from "./site-locale.ts";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  getLocalizedRegionName,
} from "./locale-format.ts";

test("v2.1 registers eleven prepared locales and launches completed locales", () => {
  assert.deepEqual(preparedSiteLocales, [
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
  ]);
  assert.deepEqual(supportedSiteLocales, [
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
  ]);
  assert.equal(isPreparedSiteLocale("ja"), true);
  assert.equal(isPreparedSiteLocale("AR"), true);
  assert.equal(isSiteLocale("ja"), true);
  assert.equal(isSiteLocale("ko"), true);
  assert.equal(isSiteLocale("es"), true);
  assert.equal(isSiteLocale("tr"), true);
  assert.equal(isSiteLocale("ar"), true);
  assert.equal(isSiteLocale("fr"), true);
  assert.equal(isSiteLocale("it"), true);
  assert.equal(isSiteLocale("de"), true);
  assert.equal(isSiteLocale("pt"), true);
  assert.equal(isSiteLocale("en"), true);
});

test("prepared locale definitions carry native labels and document direction", () => {
  assert.equal(getPreparedSiteLocaleDefinition("ja").label, "日本語");
  assert.equal(getPreparedSiteLocaleDefinition("ko").label, "한국어");
  assert.equal(getPreparedSiteLocaleDefinition("es").label, "Español");
  assert.equal(getPreparedSiteLocaleDefinition("tr").label, "Türkçe");
  assert.equal(getPreparedSiteLocaleDefinition("ar").label, "العربية");
  assert.equal(getPreparedSiteLocaleDefinition("ar").direction, "rtl");
  assert.equal(getPreparedSiteLocaleDefinition("fr").label, "Français");
  assert.equal(getPreparedSiteLocaleDefinition("it").label, "Italiano");
  assert.equal(getPreparedSiteLocaleDefinition("de").label, "Deutsch");
  assert.equal(getPreparedSiteLocaleDefinition("pt").label, "Português");
  assert.equal(getPreparedSiteLocaleDefinition("es").direction, "ltr");
});

test("launched locales route publicly and switch consistently", () => {
  assert.equal(getSiteLocaleFromPath("/ja/ai-pricing"), "ja");
  assert.equal(getSiteLocaleFromPath("/ko/ai-pricing"), "ko");
  assert.equal(getSiteLocaleFromPath("/es/ai-pricing"), "es");
  assert.equal(getSiteLocaleFromPath("/tr/ai-pricing"), "tr");
  assert.equal(getSiteLocaleFromPath("/ar/ai-pricing"), "ar");
  assert.equal(getSiteLocaleFromPath("/fr/ai-pricing"), "fr");
  assert.equal(getSiteLocaleFromPath("/it/ai-pricing"), "it");
  assert.equal(getSiteLocaleFromPath("/de/ai-pricing"), "de");
  assert.equal(getSiteLocaleFromPath("/pt/ai-pricing"), "pt");
  assert.equal(
    replaceSiteLocaleInPath("/zh/ai-pricing/chatgpt", "en"),
    "/en/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/en/ai-pricing/chatgpt", "ja"),
    "/ja/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/ja/ai-pricing/chatgpt", "ko"),
    "/ko/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/ko/ai-pricing/chatgpt", "es"),
    "/es/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/es/ai-pricing/chatgpt", "tr"),
    "/tr/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/tr/ai-pricing/chatgpt", "ar"),
    "/ar/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/ar/ai-pricing/chatgpt", "fr"),
    "/fr/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/fr/ai-pricing/chatgpt", "it"),
    "/it/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/it/ai-pricing/chatgpt", "de"),
    "/de/ai-pricing/chatgpt",
  );
  assert.equal(
    replaceSiteLocaleInPath("/de/ai-pricing/chatgpt", "pt"),
    "/pt/ai-pricing/chatgpt",
  );
});

test("shared Intl formatting supports every v2.1 locale", () => {
  assert.match(formatLocalizedCurrency(19.99, "USD", "en"), /\$19\.99/);
  assert.match(
    formatLocalizedCurrency(19.99, "USD", "ja"),
    /\$19\.99|US\$19\.99/,
  );
  assert.match(formatLocalizedCurrency(19.99, "USD", "ar"), /19\.99|١٩٫٩٩/);
  assert.ok(formatLocalizedDate("2026-07-23T00:00:00Z", "ko").includes("2026"));
  assert.ok(formatLocalizedDate("2026-07-23T00:00:00Z", "fr").includes("2026"));
  assert.ok(formatLocalizedDate("2026-07-23T00:00:00Z", "de").includes("2026"));
  assert.equal(getLocalizedRegionName("JP", "ja"), "日本");
  assert.equal(getLocalizedRegionName("KR", "ko"), "대한민국");
  assert.equal(getLocalizedRegionName("ES", "es"), "España");
  assert.equal(getLocalizedRegionName("TR", "tr"), "Türkiye");
  assert.equal(getLocalizedRegionName("FR", "fr"), "France");
  assert.equal(getLocalizedRegionName("IT", "it"), "Italia");
  assert.equal(getLocalizedRegionName("DE", "de"), "Deutschland");
  assert.equal(getLocalizedRegionName("PT", "pt"), "Portugal");
});
