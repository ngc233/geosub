import assert from "node:assert/strict";
import test from "node:test";
import { getLanguageSwitchHref, isBilingualEvidencePath } from "./language-switch-route.ts";

test("country, history and snapshot language links point only to implemented translations", () => {
  for (const path of ["/zh/countries", "/zh/countries/india", "/zh/price-history/chatgpt", "/zh/price-records/10000000-0000-4000-8000-000000000001"]) {
    assert.equal(isBilingualEvidencePath(path), true);
    assert.equal(getLanguageSwitchHref(path, "en"), path.replace("/zh/", "/en/"));
    assert.equal(getLanguageSwitchHref(path, "ja"), "/ja");
  }
  assert.equal(isBilingualEvidencePath("/zh/countries-other"), false);
  assert.equal(getLanguageSwitchHref("/zh/ai-pricing/chatgpt", "ja"), "/ja/ai-pricing/chatgpt");
});
