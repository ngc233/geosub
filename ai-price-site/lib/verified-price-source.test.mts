import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as projection from "./country-hubs.ts";

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

test("executed price SQL is the main query with only the country filter removed; USD/empty sources need one query", async () => {
  const calls: unknown[][] = [];
  const load = modules({ "server-only": {}, "./prisma.ts": { prisma: { $queryRaw: async (...args: unknown[]) => { calls.push(args); return []; } } } });
  const read = load("./verified-price-source").readVerifiedPriceSource as () => Promise<{ prices: unknown[] }>;
  assert.equal((await read()).prices.length, 0);
  assert.equal(calls.length, 1);
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
  assert.deepEqual(query.values, ["PHP", "JPY"]);
  assert.match(query.sql, /base_currency = 'USD' AND status = 'active'/);
  assert.match(query.sql, /ORDER BY quote_currency, rate_date DESC, fetched_at DESC/);
  assert.equal(result.prices[0].amount, 20);
  assert.equal(result.rates.PHP.rate, 50);
  assert.equal(result.rates.PHP.isFallback, false);
});

test("country and homepage consumers share the same one-hour source cache and both invalidation tags", async () => {
  let reads = 0;
  const settings: { keys: string[]; options: { revalidate: number; tags: string[] } }[] = [];
  const entries = new Map<string, Promise<unknown>>();
  const load = modules({ "server-only": {}, "react": { cache: (fn: unknown) => fn },
    "./country-hubs.ts": projection,
    "./verified-price-source": { readVerifiedPriceSource: async () => { reads++; return { prices: [], rates: {} }; } },
    "./price-evidence-preview": { getPriceEvidencePreview: () => ({ capturedAt: "unit-preview" }) },
    "next/cache": { unstable_cache: (fn: () => Promise<unknown>, keys: string[], options: { revalidate: number; tags: string[] }) => {
      settings.push({ keys, options });
      return () => { const key = JSON.stringify(keys); if (!entries.has(key)) entries.set(key, fn()); return entries.get(key); };
    } },
  });
  const country = load("./cached-country-hub").loadCountryHub as (code: string) => Promise<unknown>;
  const comparable = load("./comparable-prices-data").loadComparablePrices as () => Promise<unknown>;
  await Promise.all([country("PH"), country("JP"), comparable(), country("US")]);
  assert.equal(reads, 1);
  assert.equal(settings.length, 4, "no separate per-country persistent cache");
  for (const { keys, options } of settings) {
    assert.equal(JSON.stringify(keys), JSON.stringify(["verified-price-source-v1", "unit-preview"]));
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
