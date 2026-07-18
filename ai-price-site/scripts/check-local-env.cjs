#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const rootDir = process.cwd();
const warnings = [];
const criticals = [];

for (const fileName of [".env.local", ".env"]) {
  const filePath = path.join(rootDir, fileName);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: false, quiet: true });
  }
}

const databaseUrl = process.env.DATABASE_URL;
const maxExchangeRateAgeHours = Number(process.env.GEOSUB_MAX_EXCHANGE_RATE_AGE_HOURS || 18);
const maxRunningMinutes = Number(process.env.GEOSUB_MAX_COLLECTOR_RUNNING_MINUTES || 45);
const requiredExchangeRateQuotes =
  "AED,ARS,AUD,BRL,CAD,CHF,CLP,CNY,COP,DKK,EGP,EUR,GBP,IDR,ILS,INR,JPY,KES,KRW,MXN,MYR,NGN,NOK,NZD,PHP,PKR,PLN,SAR,SEK,SGD,THB,TRY,TWD,VND,ZAR".split(",");

function maskDatabaseTarget(url) {
  if (!url) return "not configured";

  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, "") || "postgres";
    return `${parsed.hostname}:${parsed.port || "5432"}/${database}`;
  } catch {
    return "invalid DATABASE_URL";
  }
}

function printRow(label, value, status = "ok") {
  const marker = status === "ok" ? "OK" : status === "warning" ? "WARN" : "FAIL";
  console.log(`${marker.padEnd(5)} ${label.padEnd(18)} ${value}`);
}

async function tableExists(client, tableName) {
  const result = await client.query("SELECT to_regclass($1) AS table_name", [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.table_name);
}

async function safeCount(client, tableName, label) {
  if (!(await tableExists(client, tableName))) {
    warnings.push(`${label} table is missing: ${tableName}`);
    printRow(label, "missing table", "warning");
    return;
  }

  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  printRow(label, `${result.rows[0]?.count ?? 0} rows`);
}

function formatDate(value) {
  if (!value) return "none";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "none";
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

async function checkExchangeRates(client) {
  if (!(await tableExists(client, "exchange_rates"))) {
    warnings.push("exchange_rates table is missing.");
    printRow("exchange rates", "missing table", "warning");
    return;
  }

  const result = await client.query(
    `
      WITH required AS (SELECT unnest($1::text[]) AS quote_currency),
      latest_by_quote AS (
        SELECT DISTINCT ON (quote_currency)
          quote_currency, fetched_at
        FROM latest_exchange_rates
        WHERE base_currency = 'USD'
        ORDER BY quote_currency, fetched_at DESC, rate_date DESC
      )
      SELECT
        COUNT(latest.quote_currency)::int AS available_count,
        COUNT(latest.quote_currency) FILTER (
          WHERE latest.fetched_at >= NOW() - ($2::text || ' hours')::interval
        )::int AS fresh_count,
        MIN(latest.fetched_at) AS oldest_fetched_at
      FROM required
      LEFT JOIN latest_by_quote latest
        ON latest.quote_currency = required.quote_currency
    `,
    [requiredExchangeRateQuotes, String(maxExchangeRateAgeHours)]
  );

  const summary = result.rows[0];
  const requiredCount = requiredExchangeRateQuotes.length;
  const freshCount = Number(summary.fresh_count || 0);
  const incomplete = freshCount !== requiredCount;

  if (incomplete) {
    warnings.push(
      `Only ${freshCount}/${requiredCount} required USD exchange rates are fresh within ${maxExchangeRateAgeHours} hours.`
    );
  }

  printRow(
    "exchange rates",
    `${freshCount}/${requiredCount} fresh, oldest ${formatDate(summary.oldest_fetched_at)}`,
    incomplete ? "warning" : "ok"
  );
}

async function checkCollector(client) {
  if (!(await tableExists(client, "collector_jobs"))) {
    warnings.push("collector_jobs table is missing.");
    printRow("collector jobs", "missing table", "warning");
    return;
  }

  const jobs = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE next_run_at IS NOT NULL AND next_run_at <= now())::int AS due
    FROM collector_jobs
  `);
  const row = jobs.rows[0];
  printRow("collector jobs", `total ${row.total}, active ${row.active}, due ${row.due}`);

  if (!(await tableExists(client, "collector_job_runs"))) {
    warnings.push("collector_job_runs table is missing.");
    printRow("collector runs", "missing table", "warning");
    return;
  }

  const staleRunning = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM collector_job_runs
      WHERE status = 'running'
        AND started_at < now() - ($1::text || ' minutes')::interval
    `,
    [String(maxRunningMinutes)]
  );

  if (staleRunning.rows[0].count > 0) {
    warnings.push(`${staleRunning.rows[0].count} collector run(s) look stuck.`);
    printRow("collector stuck", `${staleRunning.rows[0].count} stale running run(s)`, "warning");
  }

  const runs = await client.query(`
    SELECT status, started_at, finished_at, error_message
    FROM collector_job_runs
    ORDER BY started_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1
  `);
  const latest = runs.rows[0];
  if (!latest) {
    warnings.push("No collector run history found.");
    printRow("latest run", "none", "warning");
    return;
  }

  const status = latest.status === "succeeded" ? "ok" : "warning";
  if (status === "warning") {
    warnings.push(`Latest collector run status is ${latest.status || "unknown"}.`);
  }
  printRow(
    "latest run",
    `${latest.status || "unknown"}, started ${formatDate(latest.started_at)}${
      latest.error_message ? `, error ${latest.error_message.slice(0, 100)}` : ""
    }`,
    status
  );
}

async function checkReview(client) {
  if (await tableExists(client, "price_observations")) {
    const observations = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'pending' AND COALESCE(anomaly_flag, FALSE))::int AS anomalies,
        MAX(observed_at) AS latest_observed_at
      FROM price_observations
    `);
    const row = observations.rows[0];
    printRow(
      "review queue",
      `pending ${row.pending}, pending anomalies ${row.anomalies}, latest ${formatDate(
        row.latest_observed_at
      )}`
    );
  } else {
    warnings.push("price_observations table is missing.");
    printRow("review queue", "missing table", "warning");
  }

  if (await tableExists(client, "region_prices")) {
    const published = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        MAX(last_checked_at) AS latest_checked_at
      FROM region_prices
    `);
    const row = published.rows[0];
    printRow(
      "published prices",
      `published ${row.published}, latest check ${formatDate(row.latest_checked_at)}`
    );
  }
}

async function main() {
  console.log("GeoSub local environment check");
  console.log(`Database target: ${maskDatabaseTarget(databaseUrl)}`);
  console.log("");

  if (!databaseUrl) {
    criticals.push("DATABASE_URL is not configured.");
    printRow("database", "DATABASE_URL missing", "critical");
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const ping = await client.query(
      "SELECT current_database() AS database_name, current_schema() AS schema_name, now() AS checked_at"
    );
    printRow(
      "database",
      `${ping.rows[0].database_name} / ${ping.rows[0].schema_name}, checked ${formatDate(
        ping.rows[0].checked_at
      )}`
    );

    await safeCount(client, "products", "products");
    await safeCount(client, "plans", "plans");
    await safeCount(client, "countries", "countries");
    await safeCount(client, "region_prices", "region prices");
    await safeCount(client, "price_observations", "observations");
    await checkExchangeRates(client);
    await checkCollector(client);
    await checkReview(client);
  } catch (error) {
    criticals.push(error?.message || String(error));
    printRow("database", error?.message || String(error), "critical");
  } finally {
    await client.end().catch(() => {});
  }

  console.log("");
  if (criticals.length > 0) {
    console.log("Critical issues:");
    for (const item of criticals) {
      console.log(`- ${item}`);
    }
    process.exitCode = 1;
    return;
  }

  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const item of warnings) {
      console.log(`- ${item}`);
    }
  } else {
    console.log("No local environment warnings.");
  }
}

main();
