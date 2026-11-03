import assert from "node:assert/strict";
import test from "node:test";
import { getLanguageSwitchHref, isBilingualEvidencePath, isCodexResetPath } from "./language-switch-route.ts";

test("reset page and feed only expose implemented zh/en language targets", () => {
  for (const path of ["/zh/tools/codex-reset", "/en/tools/codex-reset/", "/tools/codex-reset",
    "/zh/tools/codex-reset/rss.xml", "/zh/tools/codex-reset?event=abc#event-abc", "/en/tools/codex-reset/rss.xml?x=1"]) {
    assert.equal(isCodexResetPath(path), true, path);
    assert.equal(isBilingualEvidencePath(path), true, path);
    assert.equal(getLanguageSwitchHref(path, "ja"), "/ja");
    assert.equal(getLanguageSwitchHref(path, "zh-tw"), "/zh-tw");
  }
  assert.equal(getLanguageSwitchHref("/zh/tools/codex-reset?event=abc#event-abc", "en"),
    "/en/tools/codex-reset?event=abc#event-abc");
  assert.equal(getLanguageSwitchHref("/en/tools/codex-reset/rss.xml", "zh"), "/zh/tools/codex-reset/rss.xml");
});

test("new route restriction does not capture adjacent tools or change existing language destinations", () => {
  for (const path of ["/zh/tools/codex-reset-other", "/zh/tools/codex-reset/fake", "/zh/tools/currency-converter"])
    assert.equal(isCodexResetPath(path), false, path);
  assert.equal(getLanguageSwitchHref("/zh/tools/currency-converter", "ja"), "/ja/tools/currency-converter");
  assert.equal(getLanguageSwitchHref("/zh/ai-pricing/chatgpt/plus", "ja"), "/ja/ai-pricing/chatgpt/plus");
  assert.equal(getLanguageSwitchHref("/zh/guides/gift-card-guide", "ja"), "/ja/guides");
  assert.equal(getLanguageSwitchHref("/zh/countries", "ja"), "/ja");
});
