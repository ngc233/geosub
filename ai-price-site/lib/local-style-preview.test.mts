import assert from "node:assert/strict";
import test from "node:test";
import { isLocalStylePreviewAllowed } from "./local-style-preview.ts";

test("style review requires both explicit opt-in and a loopback host", () => {
  for (const host of ["localhost", "localhost:3136", "127.0.0.1:3136", "[::1]:3136"]) {
    assert.equal(isLocalStylePreviewAllowed("1", host), true);
    for (const enabled of [undefined, "0", "true", ""]) {
      assert.equal(isLocalStylePreviewAllowed(enabled, host), false);
    }
  }
  for (const host of [null, "geosub.org", "localhost.evil.test", "evil@localhost", "0.0.0.0:3136", "127.0.0.1.evil.test", "localhost/path", "localhost,geosub.org"]) {
    assert.equal(isLocalStylePreviewAllowed("1", host), false);
  }
});
