import assert from "node:assert/strict";
import { test } from "node:test";
import { usesUnifiedPublicStyle } from "./public-style-rollout.ts";

test("unified public style rollout covers all /zh (except Plus experiment) and all /en routes", () => {
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
  ]) {
    assert.equal(usesUnifiedPublicStyle(route), true, route);
  }
  for (const route of [
    "/zh/ai-pricing/chatgpt/plus",
    "/zh/ai-pricing/chatgpt/plus/",
    "/zh/ai-pricing/chatgpt/plus?x=1",
    "/ja",
    "/zh-tw",
    "/admin",
    "/",
    "",
    "/ar",
  ]) {
    assert.equal(usesUnifiedPublicStyle(route), false, route);
  }
});
