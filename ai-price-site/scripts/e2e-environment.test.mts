import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { assertSafeE2eDatabase } = require("./e2e-environment.cjs") as {
  assertSafeE2eDatabase: (rawUrl: string) => URL;
};

test("accepts an isolated local E2E database", () => {
  const databaseUrl = assertSafeE2eDatabase(
    "postgresql://geosub:secret@127.0.0.1:5432/geosub_e2e",
  );

  assert.equal(databaseUrl.hostname, "127.0.0.1");
  assert.equal(databaseUrl.pathname, "/geosub_e2e");
});

test("rejects a database that is not explicitly isolated", () => {
  assert.throws(
    () =>
      assertSafeE2eDatabase(
        "postgresql://geosub:secret@127.0.0.1:5432/geosub",
      ),
    /must end in _e2e/,
  );
});

test("rejects every non-local database host", () => {
  assert.throws(
    () =>
      assertSafeE2eDatabase(
        "postgresql://geosub:secret@db.example.com:5432/geosub_e2e",
      ),
    /refused non-local database host/,
  );
});
