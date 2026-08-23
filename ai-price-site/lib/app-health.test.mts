import assert from "node:assert/strict";
import test from "node:test";
import { checkAppHealth } from "./app-health.ts";

const checkedAt = new Date("2026-08-14T12:00:00.000Z");

test("health check reports a responsive process and database", async () => {
  const result = await checkAppHealth({
    pingDatabase: async () => 1,
    inspectBusinessData: async () => ({
      publishedProducts: 6,
      publishedPrices: 120,
      activeExchangeRates: 12,
    }),
    now: () => checkedAt,
    duration: () => 12.6,
  });

  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.payload, {
    status: "ok",
    checks: {
      process: "ok",
      database: "ok",
      catalog: "ok",
      exchangeRates: "ok",
    },
    data: {
      publishedProducts: 6,
      publishedPrices: 120,
      activeExchangeRates: 12,
    },
    checkedAt: checkedAt.toISOString(),
    durationMs: 13,
  });
});

test("health check distinguishes an empty business catalog from a database outage", async () => {
  const result = await checkAppHealth({
    pingDatabase: async () => 1,
    inspectBusinessData: async () => ({
      publishedProducts: 0,
      publishedPrices: 0,
      activeExchangeRates: 0,
    }),
    now: () => checkedAt,
  });

  assert.equal(result.httpStatus, 200);
  assert.equal(result.payload.status, "degraded");
  assert.equal(result.payload.checks.database, "ok");
  assert.equal(result.payload.checks.catalog, "empty");
  assert.equal(result.payload.checks.exchangeRates, "empty");
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
  assert.equal(result.payload.checks.catalog, "unknown");
  assert.equal(result.payload.checks.exchangeRates, "unknown");
  assert.equal(result.payload.durationMs, 0);
});
