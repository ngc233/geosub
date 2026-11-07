import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { supportedDisplayCurrencies } from "./display-currency.ts";
import * as projection from "./country-hubs.ts";
import { makeVerifiedPriceScale } from "./test-fixtures/verified-price-scale.ts";
import { packVerifiedPriceSource } from "./verified-price-cache.ts";

const require = createRequire(import.meta.url);
// Execute the actual server modules with controlled database/cache boundaries.
// No network, Next request context or production environment is used here.
function modules(overrides: Record<string, unknown>, runtime: Record<string, unknown> = {}) {
  const loaded = new Map<string, unknown>();
  function load(name: string): Record<string, unknown> {
    if (name in overrides) return overrides[name] as Record<string, unknown>;
    const path = fileURLToPath(new URL(`${name.replace(/\.ts$/, "")}.ts`, import.meta.url));
    if (loaded.has(path)) return loaded.get(path) as Record<string, unknown>;
    const testModule = { exports: {} };
    loaded.set(path, testModule.exports);
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { module: testModule, exports: testModule.exports, require: (id: string) => id in overrides ? overrides[id] : id.startsWith("./") ? load(id) : require(id), Date, console, ...runtime }, { filename: path });
    return testModule.exports;
  }
  return load;
}

test("executed price SQL is the main query with only the country filter removed; even empty sources load display FX", async () => {
  const calls: unknown[][] = [];
  const load = modules({ "server-only": {}, "./prisma.ts": { prisma: { $queryRaw: async (...args: unknown[]) => { calls.push(args); return []; } } } });
  const read = load("./verified-price-source").readVerifiedPriceSource as () => Promise<{ prices: unknown[] }>;
  assert.equal((await read()).prices.length, 0);
  assert.equal(calls.length, 2);
  const sql = (calls[0][0] as string[]).join("");
  // SHA256 of 1c04928's query after removing exactly `c.code IN (${countryCode}, 'US') AND `.
  assert.equal(createHash("sha256").update(sql).digest("hex"), "99e1451bd3a0ef8e4ab75382c92b31978b58837a4f2c2904321753345904e7af");
  assert.equal(calls[0].length, 1, "no hidden country argument or replacement predicate");
});

test("one additional FX query covers all non-USD currencies without widening the existing rate conditions", async () => {
  const calls: unknown[][] = [];
  const load = modules({ "server-only": {}, "./prisma.ts": { prisma: { $queryRaw: async (...args: unknown[]) => {
    calls.push(args);
    return calls.length === 1 ? [{ currency: "USD", amount: "20" }, { currency: "PHP", amount: "999" }, { currency: "PHP", amount: "500" }, { currency: "JPY", amount: "2000" }]
      : [{ currency: "PHP", rate: "50", source: "fixture", rateDate: "2026-11-06", fetchedAt: "2026-11-06T02:00:00Z" }];
  } } } });
  const read = load("./verified-price-source").readVerifiedPriceSource as () => Promise<{ prices: { amount: number }[]; rates: Record<string, { rate: number; isFallback: boolean }> }>;
  const result = await read();
  assert.equal(calls.length, 2);
  const query = calls[1][0] as { sql: string; values: string[] };
  assert.deepEqual(query.values, [...new Set(["PHP", "JPY", ...supportedDisplayCurrencies.filter(code => code !== "USD")])]);
  assert.match(query.sql, /base_currency = 'USD' AND status = 'active'/);
  assert.match(query.sql, /ORDER BY quote_currency, rate_date DESC, fetched_at DESC/);
  assert.equal(result.prices[0].amount, 20);
  assert.equal(result.rates.PHP.rate, 50);
  assert.equal(result.rates.PHP.isFallback, false);
});

test("country and homepage consumers share the same one-hour source cache and both invalidation tags", async () => {
  let reads = 0;
  const snapshot = makeVerifiedPriceScale(100);
  const settings: { keys: string[]; options: { revalidate: number; tags: string[] } }[] = [];
  const entries = new Map<string, Promise<unknown>>();
  const load = modules({ "server-only": {}, "react": { cache: (fn: unknown) => fn },
    "./country-hubs.ts": projection,
    "./verified-price-source": { readVerifiedPriceSource: async () => { reads++; return snapshot; } },
    "./verified-price-source.ts": { readVerifiedPriceSource: async () => { throw new Error("Next consumers must use the cached source"); } },
    "./price-evidence-preview": { getPriceEvidencePreview: () => ({ capturedAt: "unit-preview" }) },
    "next/cache": { unstable_cache: (fn: () => Promise<unknown>, keys: string[], options: { revalidate: number; tags: string[] }) => {
      settings.push({ keys, options });
      return () => { const key = JSON.stringify(keys); if (!entries.has(key)) entries.set(key, fn().then(value => {
        assert.ok("plans" in (value as object), "cache stores the compact DTO, not expanded rows");
        return JSON.parse(JSON.stringify(value));
      })); return entries.get(key); };
    } },
  });
  const country = load("./cached-country-hub").loadCountryHub as (code: string) => Promise<unknown>;
  const comparable = load("./comparable-prices-data").loadComparablePrices as () => Promise<unknown>;
  const results = await Promise.all([country("PH"), country("JP"), comparable(), country("US")]);
  assert.equal(JSON.stringify(results[0]), JSON.stringify(projection.getCountryHubRows(snapshot.prices, "PH", snapshot.rates)));
  assert.equal(JSON.stringify(results[2]), JSON.stringify(projection.getComparablePriceRows(snapshot.prices, snapshot.rates)));
  assert.equal(reads, 1);
  assert.equal(settings.length, 4, "no separate per-country persistent cache");
  for (const { keys, options } of settings) {
    assert.equal(JSON.stringify(keys), JSON.stringify(["verified-price-source-v3-display-currencies", "unit-preview"]));
    assert.equal(options.revalidate, 3600);
    assert.equal(JSON.stringify(options.tags), JSON.stringify(["public-pricing", "public-pricing-exchange-rates"]));
  }
});


test("homepage server entry hides invalid configured plans and reports throttled, recoverable issues", async () => {
  let eligible = false;
  let time = 1000;
  const warnings: unknown[][] = [];
  const issue = { productSlug: "fictional", planSlug: "chosen", reason: "missing-us-price", regionCount: 10 };
  const load = modules({ "server-only": {}, "react": { cache: (fn: unknown) => fn },
    "./comparable-prices-data": { loadComparablePrices: async () => [] },
    "./homepage-representatives.ts": { getHomepageRepresentatives: () => eligible
      ? { representatives: [{ productSlug: "fictional", planSlug: "chosen" }], issues: [] }
      : { representatives: [], issues: [issue] } },
  }, { console: { warn: (...args: unknown[]) => warnings.push(args) }, Date: { now: () => time } });
  const read = load("./homepage-representatives-data").loadHomepageRepresentatives as () => Promise<unknown[]>;
  assert.equal((await read()).length, 0);
  assert.equal((await read()).length, 0);
  assert.equal(warnings.length, 1);
  assert.equal(JSON.stringify(warnings[0]), JSON.stringify(["[homepage-representatives]", { event: "configured-plan-ineligible", issues: [issue] }]));
  time += 3_600_000;
  await read();
  assert.equal(warnings.length, 2);
  eligible = true;
  assert.equal((await read()).length, 1);
  eligible = false;
  assert.equal((await read()).length, 0);
  assert.equal(warnings.length, 3, "recurrence is logged immediately after recovery");
});


test("CLI country projection loads without Next cache and keeps the same uncached reader", async () => {
  let reads = 0;
  const load = modules({ "server-only": {}, "./country-hubs.ts": projection,
    "./verified-price-source.ts": { readVerifiedPriceSource: async () => { reads++; return { prices: [], rates: {} }; } },
    "next/cache": new Proxy({}, { get() { throw new Error("CLI must not require Next runtime"); } }),
  });
  const read = load("./country-hubs-data").getCountryHub as (code: string) => Promise<unknown[]>;
  assert.equal((await read("PH")).length, 0);
  assert.equal(reads, 1);
});


test("measure actual reader return JSON with 3000 synthetic database rows", async t => {
  const snapshot = makeVerifiedPriceScale();
  let reads = 0;
  const load = modules({ "server-only": {}, "./prisma.ts": { prisma: { $queryRaw: async () => {
    reads++;
    return reads === 1 ? snapshot.prices.map(row => ({ ...row, amount: String(row.amount) }))
      : Object.values(snapshot.rates).map(rate => ({ ...rate, rate: String(rate.rate) }));
  } } } });
  const read = load("./verified-price-source").readVerifiedPriceSource as () => Promise<typeof snapshot>;
  const result = await read();
  assert.equal(reads, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), snapshot);
  const rawBytes = Buffer.byteLength(JSON.stringify(result), "utf8");
  const cachedBytes = Buffer.byteLength(JSON.stringify(packVerifiedPriceSource(result)), "utf8");
  assert.ok(cachedBytes < 1_500_000);
  t.diagnostic(JSON.stringify({ readerRows: result.prices.length, fxRows: Object.keys(result.rates).length, rawBytes, cachedBytes, source: "synthetic database boundary; actual readVerifiedPriceSource executed" }));
});

test("CNY is read without CNY prices, and expires at the unchanged 18-hour display boundary", async () => {
  const now = new Date("2026-11-06T08:00:00Z");
  const calls: unknown[][] = [];
  const load = modules({ "server-only": {}, "./prisma.ts": { prisma: { $queryRaw: async (...args: unknown[]) => {
    calls.push(args);
    if (calls.length === 1) return [{ currency: "USD", amount: "20" }];
    const query = args[0] as { values: string[] };
    // Model the real SQL IN boundary: omit a currency unless it was requested.
    return query.values.includes("CNY") ? [{ currency: "CNY", rate: "7", source: "fictional", rateDate: "2026-11-06", fetchedAt: now.toISOString() }] : [];
  } } } });
  const read = load("./verified-price-source").readVerifiedPriceSource as () => Promise<{ prices: { currency: string }[]; rates: Record<string, projection.HubRate> }>;
  const source = await read();
  assert.ok(source.prices.every(row => row.currency !== "CNY"));
  assert.equal(source.rates.CNY.rate, 7);
  const { homepageDisplayRates } = await import("./homepage-summary.ts");
  assert.equal(homepageDisplayRates(source.rates, new Date(now.getTime() + 18 * 3_600_000)).CNY, 7);
  assert.deepEqual(homepageDisplayRates(source.rates, new Date(now.getTime() + 18 * 3_600_000 + 1)), { USD: 1 });
});
