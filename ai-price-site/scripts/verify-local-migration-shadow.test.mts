import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { assertShadowTarget, normalizeDump } = require("./verify-local-migration-shadow.cjs");

test("shadow verifier only accepts a distinct local prefixed database", () => {
  assert.deepEqual(
    assertShadowTarget({
      databaseUrl: "postgresql://geosub_admin:secret@127.0.0.1:5433/geosub_app",
      shadowDatabase: "geosub_b1_shadow_20260814",
    }).sourceDatabase,
    "geosub_app",
  );
  assert.throws(
    () =>
      assertShadowTarget({
        databaseUrl: "postgresql://user:secret@example.com/geosub_app",
        shadowDatabase: "geosub_b1_shadow_20260814",
      }),
    /non-local/,
  );
  assert.throws(
    () =>
      assertShadowTarget({
        databaseUrl: "postgresql://user:secret@127.0.0.1/geosub_app",
        shadowDatabase: "geosub_app",
      }),
    /prefix/,
  );
});

test("dump normalization removes only volatile pg_dump metadata", () => {
  const normalized = normalizeDump(
    [
      "-- Dumped from database version 16.1",
      "-- Dumped by pg_dump version 16.1",
      "-- Started on 2026-08-14",
      "\\restrict abc",
      "CREATE TABLE public.products ();",
      "-- Completed on 2026-08-14",
      "",
    ].join("\r\n"),
  );
  assert.equal(normalized, "CREATE TABLE public.products ();\n");
});
