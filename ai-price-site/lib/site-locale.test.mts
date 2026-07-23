import assert from "node:assert/strict";
import test from "node:test";
import {
  getPreparedSiteLocaleDefinition,
  getSiteLocaleDefinition,
  getSiteLocaleFromPath,
  isPreparedSiteLocale,
  isSiteLocale,
  preparedSiteLocales,
  replaceSiteLocaleInPath,
  supportedSiteLocales,
  withSiteLocale,
} from "./site-locale.ts";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  getLocalizedRegionName,
} from "./locale-format.ts";
import { supportedDisplayCurrencies } from "./display-currency.ts";
import {
  toTraditionalChinese,
  toTraditionalChineseText,
} from "./traditional-chinese.ts";

test("v2.1 registers twelve prepared locales and launches completed locales", () => {
  assert.deepEqual(preparedSiteLocales, [
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
  ]);
  assert.deepEqual(supportedSiteLocales, [
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
  ]);
  assert.equal(isPreparedSiteLocale("ja"), true);
  assert.equal(isPreparedSiteLocale("zh-tw"), true);
  assert.equal(isPreparedSiteLocale("AR"), true);
  assert.equal(isSiteLocale("ja"), true);
  assert.equal(isSiteLocale("zh-tw"), true);
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
  assert.equal(getPreparedSiteLocaleDefinition("zh-tw").label, "繁體中文");
  assert.equal(getPreparedSiteLocaleDefinition("zh-tw").htmlLang, "zh-TW");
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

test("display currencies follow locale markets with a shared Eurozone rule", () => {
  assert.deepEqual(supportedDisplayCurrencies, [
    "USD",
    "CNY",
    "TWD",
    "HKD",
    "SGD",
    "EUR",
    "JPY",
    "KRW",
    "AUD",
    "CAD",
    "MYR",
    "IDR",
    "THB",
    "PHP",
    "VND",
    "TRY",
    "SAR",
  ]);
  assert.equal(getSiteLocaleDefinition("zh").defaultCurrency, "CNY");
  assert.equal(getSiteLocaleDefinition("zh-tw").defaultCurrency, "TWD");
  assert.equal(getSiteLocaleDefinition("en").defaultCurrency, "USD");
  assert.equal(getSiteLocaleDefinition("ja").defaultCurrency, "JPY");
  assert.equal(getSiteLocaleDefinition("ko").defaultCurrency, "KRW");
  assert.equal(getSiteLocaleDefinition("tr").defaultCurrency, "TRY");
  assert.equal(getSiteLocaleDefinition("ar").defaultCurrency, "SAR");

  for (const locale of ["es", "fr", "it", "de", "pt"] as const) {
    assert.equal(getSiteLocaleDefinition(locale).defaultCurrency, "EUR");
  }
});

test("launched locales route publicly and switch consistently", () => {
  assert.equal(getSiteLocaleFromPath("/zh-tw/ai-pricing"), "zh-tw");
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
    replaceSiteLocaleInPath("/zh/ai-pricing/chatgpt", "zh-tw"),
    "/zh-tw/ai-pricing/chatgpt",
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

test("localized public paths use the canonical no-trailing-slash form", () => {
  for (const locale of supportedSiteLocales) {
    assert.equal(
      withSiteLocale("/", locale),
      `/${locale}`,
      `localized home for ${locale}`,
    );
    assert.equal(
      replaceSiteLocaleInPath("/zh/", locale),
      `/${locale}`,
      `switched home for ${locale}`,
    );
    assert.equal(
      withSiteLocale("/ai-pricing?plan=plus", locale),
      `/${locale}/ai-pricing?plan=plus`,
      `query string for ${locale}`,
    );
  }
});

test("Traditional Chinese uses Taiwan terminology and preserves localized paths", () => {
  assert.equal(
    toTraditionalChineseText("软件 数据 购买力 汇率 全球价格 显示币种"),
    "軟體 資料 購買力 匯率 全球價格 顯示幣種",
  );
  assert.equal(
    toTraditionalChineseText("/zh/ai-pricing/chatgpt"),
    "/zh-tw/ai-pricing/chatgpt",
  );
  assert.equal(
    toTraditionalChineseText("账号地区、账单信息和平台风控"),
    "帳號地區、帳單資訊和平台風控",
  );
  assert.deepEqual(
    toTraditionalChinese({
      label: "数据来源",
      href: "/zh/guides/methodology",
    }),
    {
      label: "資料來源",
      href: "/zh-tw/guides/methodology",
    },
  );
});

test("shared Intl formatting supports every v2.1 locale", () => {
  assert.match(formatLocalizedCurrency(19.99, "USD", "en"), /\$19\.99/);
  assert.equal(formatLocalizedCurrency(133.85, "TWD", "zh-tw"), "NT$133.85");
  assert.equal(formatLocalizedCurrency(133.85, "HKD", "zh-tw"), "HK$133.85");
  assert.equal(formatLocalizedCurrency(133.85, "SGD", "zh"), "S$133.85");
  assert.equal(formatLocalizedCurrency(133.85, "AUD", "en"), "A$133.85");
  assert.equal(formatLocalizedCurrency(133.85, "CAD", "en"), "C$133.85");
  assert.equal(formatLocalizedCurrency(133.85, "MYR", "en"), "RM133.85");
  assert.equal(formatLocalizedCurrency(133.85, "IDR", "en"), "Rp134");
  assert.equal(formatLocalizedCurrency(133.85, "THB", "en"), "฿133.85");
  assert.equal(formatLocalizedCurrency(133.85, "PHP", "en"), "₱133.85");
  assert.equal(formatLocalizedCurrency(133.85, "VND", "en"), "₫134");
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
