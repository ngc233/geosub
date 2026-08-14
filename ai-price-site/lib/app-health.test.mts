import assert from "node:assert/strict";
import test from "node:test";
import { checkAppHealth } from "./app-health.ts";

const checkedAt = new Date("2026-08-14T12:00:00.000Z");

test("health check reports a responsive process and database", async () => {
  const result = await checkAppHealth({
    pingDatabase: async () => 1,
    now: () => checkedAt,
    duration: () => 12.6,
  });

  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.payload, {
    status: "ok",
    checks: { process: "ok", database: "ok" },
    checkedAt: checkedAt.toISOString(),
    durationMs: 13,
  });
});

test("health check fails closed when the database is unavailable", async () => {
  const result = await checkAppHealth({
    pingDatabase: async () => {
      throw new Error("connection refused");
    },
    now: () => checkedAt,
    duration: () => -5,
  });

  assert.equal(result.httpStatus, 503);
  assert.equal(result.payload.status, "unavailable");
  assert.equal(result.payload.checks.process, "ok");
  assert.equal(result.payload.checks.database, "unavailable");
  assert.equal(result.payload.durationMs, 0);
});
