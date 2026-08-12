import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_EXCHANGE_RATE_QUOTES,
  normalizeQuoteCurrencies,
  resolveExchangeRatePlan,
  summarizeExchangeRatePlan,
} from "./exchange-rate-sync-core.mjs";
import {
  buildScheduledSyncArgs,
  runScheduledExchangeRateSync,
} from "./run-exchange-rate-sync.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

async function fixtureFetch(fileName) {
  const fixture = JSON.parse(
    await readFile(path.join(scriptDir, "fixtures", fileName), "utf8"),
  );

  return async (_url, provider) => {
    const response = fixture.providers[provider];
    if (response.error) throw new Error(response.error);
    return response.payload;
  };
}

test("normalizes comma-separated quotes like the legacy PowerShell boundary", () => {
  assert.equal(DEFAULT_EXCHANGE_RATE_QUOTES.length, 36);
  assert.deepEqual(
    normalizeQuoteCurrencies([" cny,JPY ", "USD", "cny", " EUR "], "usd"),
    ["CNY", "JPY", "EUR"],
  );
});

test("full primary response preserves the legacy row and source contract", async () => {
  const plan = await resolveExchangeRatePlan({
    baseCurrency: "usd",
    quoteCurrencies: ["CNY", "EUR", "JPY"],
    fetchJson: await fixtureFetch("exchange-rates-full.json"),
    now: new Date("2026-08-12T00:00:00Z"),
  });
  const summary = summarizeExchangeRatePlan(plan);

  assert.equal(summary.status, "succeeded");
  assert.equal(summary.rowCount, 3);
  assert.equal(summary.requestedUrls.length, 1);
  assert.deepEqual(
    summary.rows.map((row) => [row.quote, row.rateDate, row.source]),
    [
      ["CNY", "2026-08-11", "frankfurter"],
      ["EUR", "2026-08-11", "frankfurter"],
      ["JPY", "2026-08-11", "frankfurter"],
    ],
  );
});

test("missing primary quotes use fallback rows without relabeling primary rows", async () => {
  const plan = await resolveExchangeRatePlan({
    quoteCurrencies: ["CNY", "EUR", "JPY"],
    fetchJson: await fixtureFetch("exchange-rates-partial.json"),
    now: new Date("2026-08-12T00:00:00Z"),
  });
  const summary = summarizeExchangeRatePlan(plan);

  assert.equal(summary.status, "succeeded");
  assert.equal(summary.requestedUrls.length, 2);
  assert.deepEqual(
    summary.rows.map((row) => [row.quote, row.rateDate, row.source]),
    [
      ["CNY", "2026-08-10", "frankfurter"],
      ["EUR", "2026-08-11", "open-er-api"],
      ["JPY", "2026-08-11", "open-er-api"],
    ],
  );
});

test("primary failure falls back for every requested quote", async () => {
  const plan = await resolveExchangeRatePlan({
    quoteCurrencies: ["CNY", "EUR", "JPY"],
    fetchJson: await fixtureFetch("exchange-rates-primary-failure.json"),
    now: new Date("2026-08-12T00:00:00Z"),
  });

  assert.equal(plan.status, "succeeded");
  assert.equal(plan.attempts[0].ok, false);
  assert.ok(plan.rows.every((row) => row.source === "open-er-api"));
  assert.match(plan.warnings.join("\n"), /recorded provider timeout/);
});

test("total provider failure rejects instead of reporting an empty success", async () => {
  await assert.rejects(
    resolveExchangeRatePlan({
      quoteCurrencies: ["CNY", "EUR", "JPY"],
      fetchJson: await fixtureFetch("exchange-rates-provider-failure.json"),
      now: new Date("2026-08-12T00:00:00Z"),
    }),
    /recorded fallback timeout/,
  );
});

test("missing rates stay partial instead of inventing a conversion", async () => {
  const plan = await resolveExchangeRatePlan({
    quoteCurrencies: ["CNY", "EUR", "JPY", "SGD"],
    fetchJson: await fixtureFetch("exchange-rates-partial.json"),
    now: new Date("2026-08-12T00:00:00Z"),
  });

  assert.equal(plan.status, "partial");
  assert.deepEqual(plan.missingQuotes, ["SGD"]);
  assert.equal(plan.rows.length, 3);
});

test("an explicitly bounded quote set stays bounded for shadow comparisons", async () => {
  const quotes = normalizeQuoteCurrencies("CNY,EUR,JPY", "USD");
  const plan = await resolveExchangeRatePlan({
    quoteCurrencies: quotes,
    fetchJson: await fixtureFetch("exchange-rates-full.json"),
    now: new Date("2026-08-12T00:00:00Z"),
  });

  assert.deepEqual(plan.quotes, ["CNY", "EUR", "JPY"]);
  assert.equal(plan.rows.length, 3);
});

test("scheduled runner forwards explicit configuration without shell-specific quoting", () => {
  assert.deepEqual(
    buildScheduledSyncArgs({
      base: "USD",
      quotes: "CNY,EUR,JPY",
      provider: "frankfurter",
      dryRun: true,
      fixture: "fixture.json",
    }),
    [
      "--base",
      "USD",
      "--provider",
      "frankfurter",
      "--quotes",
      "CNY,EUR,JPY",
      "--dry-run",
      "--fixture",
      "fixture.json",
    ],
  );
});

test("scheduled runner leaves default quote expansion to the shared CLI", () => {
  assert.deepEqual(
    buildScheduledSyncArgs({ base: "USD", provider: "frankfurter" }),
    ["--base", "USD", "--provider", "frankfurter"],
  );
});

test("scheduled runner retains detailed dry-run evidence in its log", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "geosub-fx-runner-"));
  const fixture = path.join(scriptDir, "fixtures", "exchange-rates-partial.json");
  const now = new Date("2026-08-12T03:04:05Z");

  await runScheduledExchangeRateSync({
    projectRoot,
    now,
    args: buildScheduledSyncArgs({
      quotes: "CNY,EUR,JPY",
      dryRun: true,
      fixture,
    }),
  });

  const log = await readFile(
    path.join(projectRoot, "logs", "exchange-rate-sync-2026-08-12.log"),
    "utf8",
  );
  assert.match(log, /Starting exchange rate sync/);
  assert.match(log, /USD\/CNY 7\.140000 \(2026-08-10, frankfurter\)/);
  assert.match(log, /USD\/EUR 0\.870000 \(2026-08-11, open-er-api\)/);
  assert.match(log, /Exchange rate sync completed: succeeded; rows 3\/3/);
});
