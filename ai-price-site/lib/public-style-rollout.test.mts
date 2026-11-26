import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { isUnifiedPublicLocale, unifiedPublicLocales, usesUnifiedPublicStyle } from "./public-style-rollout.ts";
import { supportedSiteLocales } from "./site-locale.ts";

test("public language switcher exposes only the 6 unified primary locales while hiding un-unified staged locales", () => {
  const headerSource = readFileSync(resolve(import.meta.dirname, "../components/Header.tsx"), "utf8");
  assert.match(headerSource, /supportedSiteLocales\s*\.filter\(\(code\)\s*=>\s*isUnifiedPublicLocale\(code\)\)/);
  const visibleLocales = supportedSiteLocales.filter((code) => isUnifiedPublicLocale(code));
  assert.deepEqual(visibleLocales, ["zh", "zh-tw", "en", "ja", "ko", "es"]);
  assert.equal(unifiedPublicLocales.length, 6);
});

test("unified public style rollout covers zh (except Plus experiment), en, zh-tw, ja, ko, and es", () => {
  for (const route of [
    "/zh",
    "/zh/",
    "/zh/ai-pricing",
    "/zh/countries/japan",
    "/zh/ai-pricing/chatgpt/plus-extra",
    "/en",
    "/en/",
    "/en/ai-pricing/",
    "/en/streaming-pricing",
    "/en/ai-pricing/chatgpt",
    "/en/ai-pricing/chatgpt/plus",
    "/en/ai-pricing/chatgpt/go?test=1",
    "/en/countries",
    "/en/countries/turkey",
    "/en/price-history",
    "/en/guides",
    "/en/tools/currency-converter",
    "/en/about",
    "/en/games",
    "/en/contact",
    "/zh-tw",
    "/zh-tw/ai-pricing/chatgpt",
    "/zh-tw/games/gta-6",
    "/zh-tw/contact",
    "/ja",
    "/ja/countries/japan",
    "/ja/price-history",
    "/ko",
    "/ko/tools/currency-converter",
    "/es",
    "/es/streaming-pricing/netflix",
  ]) {
    assert.equal(usesUnifiedPublicStyle(route), true, route);
  }
  for (const route of [
    "/zh/ai-pricing/chatgpt/plus",
    "/zh/ai-pricing/chatgpt/plus/",
    "/zh/ai-pricing/chatgpt/plus?x=1",
    "/fr",
    "/de",
    "/it",
    "/pt",
    "/tr",
    "/ar",
    "/admin",
    "/",
    "",
  ]) {
    assert.equal(usesUnifiedPublicStyle(route), false, route);
  }
  assert.equal(isUnifiedPublicLocale("zh-tw"), true);
  assert.equal(isUnifiedPublicLocale("ja"), true);
  assert.equal(isUnifiedPublicLocale("fr"), false);
});
