#!/usr/bin/env node

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveExchangeRatePlan } from "./exchange-rate-sync-core.mjs";
import {
  compareExchangeRateShadow,
  createRecordedProviderFetch,
} from "./exchange-rate-shadow-core.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const siteDir = path.join(repoRoot, "ai-price-site");
const backendDir = path.join(repoRoot, "geosub-backend");

function parseArgs(argv) {
  const options = {
    runId: null,
    evidenceDir:
      process.env.GEOSUB_EXCHANGE_RATE_SHADOW_EVIDENCE_DIR ||
      path.join(backendDir, "logs", "exchange-rate-shadow"),
    json: false,
    writeEvidence: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--no-write-evidence") options.writeEvidence = false;
    else if (argument.startsWith("--run-id=")) options.runId = argument.slice(9);
    else if (argument === "--run-id") options.runId = argv[++index];
    else if (argument.startsWith("--evidence-dir=")) {
      options.evidenceDir = argument.slice(15);
    } else if (argument === "--evidence-dir") {
      options.evidenceDir = argv[++index];
    } else throw new Error(`Unknown argument: ${argument}`);
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

async function loadPgClient(databaseUrl) {
  const requireFromSite = createRequire(path.join(siteDir, "package.json"));
  const { Client } = requireFromSite("pg");
  return new Client({ connectionString: databaseUrl });
}

async function loadRecordedRun(client, runId) {
  const runResult = await client.query(
    `
      SELECT
        id,
        provider,
        base_currency,
        quote_currencies,
        status,
        row_count,
        started_at,
        completed_at
      FROM exchange_rate_sync_runs
      WHERE ($1::uuid IS NOT NULL AND id = $1::uuid)
         OR ($1::uuid IS NULL AND status IN ('succeeded', 'partial') AND completed_at IS NOT NULL)
      ORDER BY
        CASE WHEN $1::uuid IS NOT NULL AND id = $1::uuid THEN 0 ELSE 1 END,
        completed_at DESC NULLS LAST
      LIMIT 1
    `,
    [runId],
  );
  const run = runResult.rows[0];
  if (!run) throw new Error("No completed legacy exchange-rate sync run was found.");

  const rowResult = await client.query(
    `
      SELECT quote_currency, rate, rate_date::text AS rate_date, source, provider_payload
      FROM exchange_rates
      WHERE sync_run_id = $1::uuid
      ORDER BY quote_currency
    `,
    [run.id],
  );

  return { run, rows: rowResult.rows };
}

async function persistEvidence(evidenceDir, evidence) {
  await mkdir(evidenceDir, { recursive: true });
  const day = evidence.checkedAt.slice(0, 10);
  const filePath = path.join(evidenceDir, `${day}.jsonl`);
  await appendFile(filePath, `${JSON.stringify(evidence)}\n`, "utf8");
  return filePath;
}

export async function verifyExchangeRateShadow({
  client,
  runId = null,
  evidenceDir,
  writeEvidence = true,
  now = new Date(),
}) {
  const { run, rows } = await loadRecordedRun(client, runId);
  const fetchJson = createRecordedProviderFetch(rows);
  const shadowPlan = await resolveExchangeRatePlan({
    baseCurrency: run.base_currency,
    quoteCurrencies: run.quote_currencies,
    provider: run.provider,
    fetchJson,
    now,
  });
  const comparison = compareExchangeRateShadow({
    expectedRun: { status: run.status, rowCount: run.row_count },
    expectedRows: rows,
    shadowPlan,
  });
  const evidence = {
    version: 1,
    checkedAt: now.toISOString(),
    legacyRunId: run.id,
    legacyStartedAt: run.started_at,
    legacyCompletedAt: run.completed_at,
    baseCurrency: run.base_currency,
    quoteCount: run.quote_currencies.length,
    comparison,
  };

  const evidencePath = writeEvidence
    ? await persistEvidence(evidenceDir, evidence)
    : null;
  return { evidence, evidencePath };
}

export async function runShadowCli(argv = process.argv.slice(2)) {
  await loadEnvFiles();
  const options = parseArgs(argv);
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the read-only shadow comparison.");
  }

  const client = await loadPgClient(process.env.DATABASE_URL);
  await client.connect();
  try {
    const result = await verifyExchangeRateShadow({
      client,
      runId: options.runId,
      evidenceDir: path.resolve(options.evidenceDir),
      writeEvidence: options.writeEvidence,
    });
    const summary = {
      ok: result.evidence.comparison.passed,
      ...result,
    };
    if (options.json) process.stdout.write(`${JSON.stringify(summary)}\n`);
    else {
      console.log(
        `Exchange-rate shadow ${summary.ok ? "passed" : "failed"}. ` +
          `Run: ${result.evidence.legacyRunId}. ` +
          `Rows: ${result.evidence.comparison.shadowRowCount}/${result.evidence.comparison.expectedRowCount}.`,
      );
      if (result.evidencePath) console.log(`Evidence: ${result.evidencePath}`);
      for (const mismatch of result.evidence.comparison.mismatches) {
        console.error(`MISMATCH ${JSON.stringify(mismatch)}`);
      }
    }
    if (!summary.ok) process.exitCode = 1;
    return summary;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runShadowCli().catch((error) => {
    console.error(`FAIL  ${error.message}`);
    process.exitCode = 1;
  });
}
