import assert from "node:assert/strict";
import test from "node:test";
import { usesUnifiedPublicStyle } from "./public-style-rollout.ts";

test("U1 never activates a public route, including the locked Plus page", () => {
  for (const path of ["/zh", "/zh/ai-pricing/chatgpt/plus", "/en", "/", "", "/admin", "/zh/countries/japan", "/ar", "/unknown"]) {
    assert.equal(usesUnifiedPublicStyle(path), false, path);
  }
});
