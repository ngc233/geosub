#!/usr/bin/env node

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runCli } from "./sync-exchange-rates.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, "..");

export function buildScheduledSyncArgs({
  base = process.env.GEOSUB_EXCHANGE_RATE_BASE || "USD",
  quotes = null,
  provider = process.env.GEOSUB_EXCHANGE_RATE_PROVIDER || "frankfurter",
  dryRun = false,
  fixture = null,
} = {}) {
  const args = ["--base", base, "--provider", provider];
  if (quotes) args.push("--quotes", quotes);
  if (dryRun) args.push("--dry-run");
  if (fixture) args.push("--fixture", fixture);
  return args;
}

function timestamp(now = new Date()) {
  return now.toISOString().replace("T", " ").slice(0, 19);
}

export async function runScheduledExchangeRateSync({
  projectRoot = backendDir,
  args = buildScheduledSyncArgs(),
  now = new Date(),
} = {}) {
  const logDir = path.join(projectRoot, "logs");
  const logFile = path.join(
    logDir,
    `exchange-rate-sync-${now.toISOString().slice(0, 10)}.log`,
  );
  await mkdir(logDir, { recursive: true });

  const writeLog = async (message) => {
    const line = `[${timestamp()}] ${message}\n`;
    process.stdout.write(line);
    await appendFile(logFile, line, "utf8");
  };

  await writeLog("Starting exchange rate sync.");
  try {
    const result = await runCli(args, {
      log: writeLog,
      warn: writeLog,
      writeJson: writeLog,
    });
    await writeLog(
      `Exchange rate sync completed: ${result.status}; rows ${result.rowCount}/${result.quoteCount}.`,
    );
    return result;
  } catch (error) {
    await writeLog(`Exchange rate sync failed: ${error.message}`);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScheduledExchangeRateSync().catch(() => {
    process.exitCode = 1;
  });
}
