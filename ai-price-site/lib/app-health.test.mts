import assert from "node:assert/strict";
import test from "node:test";
import { checkAppHealth } from "./app-health.ts";

const checkedAt = new Date("2026-08-14T12:00:00.000Z");
const build = { version: "2.24.1", commit: "0123456789abcdef0123456789abcdef01234567" };
const business = { publishedProducts: 6, publishedPrices: 120, activeExchangeRates: 12 };
const fresh = { lastSuccessfulCollectionAt: checkedAt, pricesNotCheckedOver3Days: 0 };

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
    build,
    inspectFreshness: async () => fresh,
  });

  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.payload, {
    status: "ok",
    ...build,
    checks: {
      process: "ok",
      database: "ok",
      catalog: "ok",
      exchangeRates: "ok",
    },
    data: {
      lastSuccessfulCollectionAt: checkedAt.toISOString(),
      pricesNotCheckedOver3Days: 0,
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
  assert.deepEqual(result.payload.data, {
    lastSuccessfulCollectionAt: null, pricesNotCheckedOver3Days: null,
  });
});

test("stale prices and collections are observations, never new degradation criteria", async () => {
  for (const observed of [
    { ...fresh, pricesNotCheckedOver3Days: 13 }, // >10% of 120 formal prices
    { ...fresh, lastSuccessfulCollectionAt: new Date("2026-08-10T00:00:00Z") },
    { ...fresh, lastSuccessfulCollectionAt: null, pricesNotCheckedOver3Days: 120 },
  ]) {
    const result = await checkAppHealth({ pingDatabase: async () => 1,
      inspectBusinessData: async () => business, inspectFreshness: async () => observed,
      now: () => checkedAt, build });
    assert.equal(result.httpStatus, 200);
    assert.equal(result.payload.status, "ok");
    assert.deepEqual(result.payload.checks, {
      process: "ok", database: "ok", catalog: "ok", exchangeRates: "ok",
    });
    assert.equal(result.payload.data.pricesNotCheckedOver3Days, observed.pricesNotCheckedOver3Days);
    assert.equal(result.payload.data.lastSuccessfulCollectionAt, observed.lastSuccessfulCollectionAt?.toISOString() ?? null);
  }
});

test("each legacy empty-data condition and unavailable inspection keeps its original outcome", async () => {
  for (const field of ["publishedProducts", "publishedPrices", "activeExchangeRates"] as const) {
    const result = await checkAppHealth({ pingDatabase: async () => 1,
      inspectBusinessData: async () => ({ ...business, [field]: 0 }), inspectFreshness: async () => fresh });
    assert.equal(result.httpStatus, 200);
    assert.equal(result.payload.status, "degraded");
    assert.equal(result.payload.checks.catalog, field === "activeExchangeRates" ? "ok" : "empty");
    assert.equal(result.payload.checks.exchangeRates, field === "activeExchangeRates" ? "empty" : "ok");
  }
  const unknown = await checkAppHealth({ pingDatabase: async () => 1 });
  assert.equal(unknown.httpStatus, 200);
  assert.equal(unknown.payload.status, "ok");
  assert.equal(unknown.payload.checks.catalog, "unknown");
  assert.equal(unknown.payload.checks.exchangeRates, "unknown");
  const failed = await checkAppHealth({ pingDatabase: async () => 1,
    inspectBusinessData: async () => { throw new Error("business query failed"); },
    inspectFreshness: async () => { assert.fail("must not query freshness after legacy failure"); } });
  assert.equal(failed.httpStatus, 503);
  assert.equal(failed.payload.status, "unavailable");
});

test("missing or invalid public build identifiers are null without changing health", async () => {
  for (const candidate of [undefined, {}, { version: "", commit: "" },
    { version: "postgres://private:secret@internal.invalid/db", commit: "abcdef0" },
    { version: "2.24.1\nprivate", commit: "z".repeat(40) }]) {
    const result = await checkAppHealth({ pingDatabase: async () => 1,
      inspectBusinessData: async () => business, build: candidate });
    assert.equal(result.httpStatus, 200);
    assert.equal(result.payload.status, "ok");
    assert.equal(result.payload.version, null);
    assert.equal(result.payload.commit, null);
  }
  const failed = await checkAppHealth({ pingDatabase: async () => { throw new Error("unavailable"); }, build });
  assert.equal(failed.payload.version, build.version);
  assert.equal(failed.payload.commit, build.commit);
  assert.equal(failed.httpStatus, 503);
});

test("optional freshness failure returns unknown observations without changing legacy health", async () => {
  const result = await checkAppHealth({ pingDatabase: async () => 1,
    inspectBusinessData: async () => business,
    inspectFreshness: async () => { throw new Error("postgres://private:password@internal.invalid/db\nstack trace"); } });
  assert.equal(result.httpStatus, 200);
  assert.equal(result.payload.status, "ok");
  assert.deepEqual(result.payload.data, { lastSuccessfulCollectionAt: null, pricesNotCheckedOver3Days: null });
});

test("response allowlist excludes totals, injected fields and exception details", async () => {
  const sensitive = { DATABASE_URL: "postgres://private:password@internal.invalid/db", stack: "private stack", token: "private-key" };
  for (const fail of [false, true]) {
    const result = await checkAppHealth({
      pingDatabase: async () => { if (fail) throw Object.assign(new Error(sensitive.DATABASE_URL), sensitive); return 1; },
      inspectBusinessData: async () => ({ ...business, ...sensitive }),
      inspectFreshness: async () => ({ ...fresh, ...sensitive }),
      build: { ...build, ...sensitive }, now: () => checkedAt,
    });
    assert.deepEqual(Object.keys(result.payload).sort(), ["status", "version", "commit", "checks", "data", "checkedAt", "durationMs"].sort());
    assert.deepEqual(Object.keys(result.payload.data).sort(), ["lastSuccessfulCollectionAt", "pricesNotCheckedOver3Days"].sort());
    const json = JSON.stringify(result.payload);
    for (const key of [...Object.keys(business), ...Object.keys(sensitive), ...Object.values(sensitive)]) assert.ok(!json.includes(key), key);
  }
});

test("invalid freshness values cannot become response strings or misleading zero counts", async () => {
  for (const value of ["private-host", "2026-08-14T12:00:00Z private", new Date(NaN), null]) {
    for (const count of [-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1, "12", null]) {
      const result = await checkAppHealth({ pingDatabase: async () => 1,
        inspectFreshness: async () => ({ lastSuccessfulCollectionAt: value, pricesNotCheckedOver3Days: count }) });
      assert.deepEqual(result.payload.data, { lastSuccessfulCollectionAt: null, pricesNotCheckedOver3Days: null });
      assert.equal(result.payload.status, "ok");
    }
  }
});
