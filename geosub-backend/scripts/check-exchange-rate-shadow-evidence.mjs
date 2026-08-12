#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { summarizeExchangeRateShadowEvidence } from "./exchange-rate-shadow-core.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, "..");

function parseArgs(argv) {
  const options = {
    evidenceDir:
      process.env.GEOSUB_EXCHANGE_RATE_SHADOW_EVIDENCE_DIR ||
      path.join(backendDir, "logs", "exchange-rate-shadow"),
    requiredCycles: 3,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument.startsWith("--required-cycles=")) {
      options.requiredCycles = Number(argument.slice(18));
    } else if (argument === "--required-cycles") {
      options.requiredCycles = Number(argv[++index]);
    } else if (argument.startsWith("--evidence-dir=")) {
      options.evidenceDir = argument.slice(15);
    } else if (argument === "--evidence-dir") {
      options.evidenceDir = argv[++index];
    } else throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

async function readEvidenceDirectory(evidenceDir) {
  let fileNames;
  try {
    fileNames = await readdir(evidenceDir);
  } catch (error) {
    if (error?.code === "ENOENT") return { entries: [], invalidLineCount: 0 };
    throw error;
  }

  const entries = [];
  let invalidLineCount = 0;
  for (const fileName of fileNames.filter((name) => name.endsWith(".jsonl")).sort()) {
    const content = await readFile(path.join(evidenceDir, fileName), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const normalizedLine = line.replace(/^\uFEFF/, "").trim();
      if (!normalizedLine) continue;
      try {
        entries.push(JSON.parse(normalizedLine));
      } catch {
        invalidLineCount += 1;
      }
    }
  }
  return { entries, invalidLineCount };
}

export async function checkExchangeRateShadowEvidence({
  evidenceDir,
  requiredCycles = 3,
}) {
  const { entries, invalidLineCount } = await readEvidenceDirectory(evidenceDir);
  const summary = summarizeExchangeRateShadowEvidence({ entries, requiredCycles });
  return {
    ...summary,
    ready: summary.ready && invalidLineCount === 0,
    invalidLineCount,
    evidenceDir,
  };
}

export async function runEvidenceCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const summary = await checkExchangeRateShadowEvidence({
    evidenceDir: path.resolve(options.evidenceDir),
    requiredCycles: options.requiredCycles,
  });

  if (options.json) process.stdout.write(`${JSON.stringify(summary)}\n`);
  else {
    console.log(
      `Exchange-rate shadow gate: ${summary.ready ? "ready" : "not ready"}. ` +
        `Consecutive cycles: ${summary.consecutivePassed}/${summary.requiredCycles}. ` +
        `Distinct legacy runs: ${summary.distinctRunCount}.`,
    );
    if (summary.invalidLineCount > 0) {
      console.error(`Invalid evidence lines: ${summary.invalidLineCount}.`);
    }
  }

  if (!summary.ready) process.exitCode = 1;
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEvidenceCli().catch((error) => {
    console.error(`FAIL  ${error.message}`);
    process.exitCode = 1;
  });
}
