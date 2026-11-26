import assert from "node:assert/strict";
import test from "node:test";
import { getLanguageSwitchHref, isBilingualEvidencePath } from "./language-switch-route.ts";

test("evidence, game, and contact routes stay in place across primary unified locales and fall back cleanly on unexpanded locales", () => {
  for (const path of ["/zh/countries", "/zh/countries/india", "/zh/price-history/chatgpt", "/zh/price-records/10000000-0000-4000-8000-000000000001"]) {
    assert.equal(isBilingualEvidencePath(path), true);
    assert.equal(getLanguageSwitchHref(path, "en"), path.replace("/zh/", "/en/"));
    assert.equal(getLanguageSwitchHref(path, "ja"), path.replace("/zh/", "/ja/"));
    assert.equal(getLanguageSwitchHref(path, "zh-tw"), path.replace("/zh/", "/zh-tw/"));
    assert.equal(getLanguageSwitchHref(path, "ko"), path.replace("/zh/", "/ko/"));
    assert.equal(getLanguageSwitchHref(path, "es"), path.replace("/zh/", "/es/"));
    assert.equal(getLanguageSwitchHref(path, "fr"), "/fr");
  }
  assert.equal(getLanguageSwitchHref("/zh/games/gta-6", "en"), "/en/games/gta-6");
  assert.equal(getLanguageSwitchHref("/zh/games/gta-6", "ja"), "/ja/games/gta-6");
  assert.equal(getLanguageSwitchHref("/zh/games/gta-6", "fr"), "/fr");
  assert.equal(isBilingualEvidencePath("/zh/countries-other"), false);
});
