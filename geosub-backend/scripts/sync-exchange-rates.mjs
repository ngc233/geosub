#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  DEFAULT_EXCHANGE_RATE_QUOTES,
  normalizeCurrency,
  normalizeQuoteCurrencies,
  resolveExchangeRatePlan,
  summarizeExchangeRatePlan,
} from "./exchange-rate-sync-core.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const siteDir = path.join(repoRoot, "ai-price-site");

function parseArgs(argv) {
  const extraQuotes =
    process.env.GEOSUB_EXCHANGE_RATE_QUOTES || process.env.GEOSUB_FX_QUOTES || "";
  const options = {
    base: process.env.GEOSUB_EXCHANGE_RATE_BASE || process.env.GEOSUB_FX_BASE || "USD",
    quotes: `${DEFAULT_EXCHANGE_RATE_QUOTES.join(",")},${extraQuotes}`,
    provider: process.env.GEOSUB_EXCHANGE_RATE_PROVIDER || "frankfurter",
    fixture: null,
    dryRun: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--json") options.json = true;
    else if (argument.startsWith("--base=")) options.base = argument.slice(7);
    else if (argument === "--base") options.base = argv[++index];
    else if (argument.startsWith("--quotes=")) options.quotes = argument.slice(9);
    else if (argument === "--quotes") options.quotes = argv[++index];
    else if (argument.startsWith("--provider=")) options.provider = argument.slice(11);
    else if (argument === "--provider") options.provider = argv[++index];
    else if (argument.startsWith("--fixture=")) options.fixture = argument.slice(10);
    else if (argument === "--fixture") options.fixture = argv[++index];
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

async function loadEnvFiles() {
  let dotenv;
  try {
    const requireFromSite = createRequire(path.join(siteDir, "package.json"));
    dotenv = requireFromSite("dotenv");
  } catch {
    return;
  }

  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(siteDir, fileName);
    try {
      await readFile(filePath, "utf8");
      dotenv.config({ path: filePath, override: false, quiet: true });
    } catch {
      // Optional local environment file.
    }
  }
}

async function createFixtureFetch(fixturePath) {
  const fixture = JSON.parse(await readFile(path.resolve(fixturePath), "utf8"));

  return async (_url, provider) => {
    const response = fixture.providers?.[provider];
    if (!response) throw new Error(`Fixture has no ${provider} response.`);
    if (response.error) throw new Error(response.error);
    return response.payload;
  };
}

async function createNetworkFetch() {
  return async (url) => {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  };
}

async function loadPgClient(databaseUrl) {
  const requireFromSite = createRequire(path.join(siteDir, "package.json"));
  const { Client } = requireFromSite("pg");
  return new Client({ connectionString: databaseUrl });
}

async function createRun(client, { provider, base, quotes }) {
  const result = await client.query(
    `
      INSERT INTO exchange_rate_sync_runs (
        provider, base_currency, quote_currencies, status, started_at
      )
      VALUES ($1, $2, $3::text[], 'running', NOW())
      RETURNING id
    `,
    [provider, base, quotes],
  );
  return result.rows[0].id;
}

async function persistPlan(client, runId, plan) {
  for (const row of plan.rows) {
    await client.query(
      `
        SELECT upsert_exchange_rate(
          $1, $2, $3, $4::date, $5, NOW(), $6::uuid, $7::jsonb
        )
      `,
      [
        row.base,
        row.quote,
        row.rate,
        row.rateDate,
        row.source,
        runId,
        JSON.stringify(row.providerPayload),
      ],
    );
  }

  await client.query(
    `
      UPDATE exchange_rate_sync_runs
      SET status = $1,
          requested_url = $2,
          row_count = $3,
          completed_at = NOW(),
          error_message = NULL
      WHERE id = $4::uuid
    `,
    [plan.status, plan.requestedUrls.join(" | "), plan.rows.length, runId],
  );
}

async function failRun(client, runId, error) {
  await client.query(
    `
      UPDATE exchange_rate_sync_runs
      SET status = 'failed', completed_at = NOW(), error_message = $1
      WHERE id = $2::uuid
    `,
    [error.message, runId],
  );
}

export async function runExchangeRateSync(options) {
  await loadEnvFiles();
  const base = normalizeCurrency(options.base);
  const configuredQuotes = normalizeQuoteCurrencies(options.quotes, base);
  const fetchJson = options.fixture
    ? await createFixtureFetch(options.fixture)
    : await createNetworkFetch();

  if (options.dryRun) {
    const plan = await resolveExchangeRatePlan({
      baseCurrency: base,
      quoteCurrencies: configuredQuotes,
      provider: options.provider,
      fetchJson,
    });
    return { ...summarizeExchangeRatePlan(plan), dryRun: true, runId: null };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required unless --dry-run is used.");
  }

  const client = await loadPgClient(databaseUrl);
  await client.connect();
  let runId = null;

  try {
    runId = await createRun(client, {
      provider: options.provider,
      base,
      quotes: configuredQuotes,
    });
    const plan = await resolveExchangeRatePlan({
      baseCurrency: base,
      quoteCurrencies: configuredQuotes,
      provider: options.provider,
      fetchJson,
    });
    await persistPlan(client, runId, plan);
    return { ...summarizeExchangeRatePlan(plan), dryRun: false, runId };
  } catch (error) {
    if (runId) await failRun(client, runId, error).catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function runCli(
  argv = process.argv.slice(2),
  io = {
    log: (message) => console.log(message),
    warn: (message) => console.warn(message),
    writeJson: (message) => process.stdout.write(message),
  },
) {
  await loadEnvFiles();
  const options = parseArgs(argv);
  const result = await runExchangeRateSync(options);

  if (options.json) {
    await io.writeJson(`${JSON.stringify(result)}\n`);
    return result;
  }

  for (const warning of result.warnings) await io.warn(`WARN  ${warning}`);
  for (const row of result.rows) {
    await io.log(
      `OK    ${result.base}/${row.quote} ${row.rate.toFixed(6)} (${row.rateDate}, ${row.source})`,
    );
  }
  await io.log(
    `Exchange rate sync ${result.status}${result.dryRun ? " (dry run)" : ""}. ` +
      `Rows: ${result.rowCount}/${result.quoteCount}.`,
  );
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(`FAIL  ${error.message}`);
    process.exitCode = 1;
  });
}
