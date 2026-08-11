#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const DEFAULT_STATEMENT_TIMEOUT_MS = 10_000;
const DEFAULT_LOCK_TIMEOUT_MS = 2_000;

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .trim();
}

function validateReadOnlySql(sql) {
  const normalized = stripSqlComments(sql).replace(/;\s*$/, "").trim();

  if (!normalized) throw new Error("The SQL file is empty.");
  if (!/^(SELECT|WITH)\b/i.test(normalized)) {
    throw new Error("Only SELECT or WITH queries can be explained.");
  }
  if (normalized.includes(";")) {
    throw new Error("Only one SQL statement is allowed.");
  }
  if (
    /\b(INSERT|UPDATE|DELETE|MERGE|COPY|CALL|DO|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|VACUUM|REFRESH|REINDEX|CLUSTER)\b/i.test(
      normalized,
    ) ||
    /\bSELECT\s+INTO\b/i.test(normalized) ||
    /\bFOR\s+(UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b/i.test(normalized)
  ) {
    throw new Error("The SQL contains a write or locking operation.");
  }

  return normalized;
}

function parseArguments(argv) {
  const options = {
    analyze: false,
    file: null,
    json: false,
    statementTimeoutMs: DEFAULT_STATEMENT_TIMEOUT_MS,
  };

  for (const argument of argv) {
    if (argument === "--analyze") {
      options.analyze = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument.startsWith("--file=")) {
      options.file = argument.slice("--file=".length);
    } else if (argument.startsWith("--timeout-ms=")) {
      const value = Number(argument.slice("--timeout-ms=".length));
      if (!Number.isFinite(value) || value < 100 || value > 60_000) {
        throw new Error("--timeout-ms must be between 100 and 60000.");
      }
      options.statementTimeoutMs = Math.round(value);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.file) {
    throw new Error("A SQL file is required. Use --file=path/to/query.sql.");
  }
  return options;
}

function flattenPlanNodes(node, depth = 0, rows = []) {
  if (!node || typeof node !== "object") return rows;

  rows.push({
    depth,
    nodeType: node["Node Type"] || "Unknown",
    relation: node["Relation Name"] || null,
    index: node["Index Name"] || null,
    estimatedRows: node["Plan Rows"] ?? null,
    actualRows: node["Actual Rows"] ?? null,
    actualLoops: node["Actual Loops"] ?? null,
    totalCost: node["Total Cost"] ?? null,
    actualTotalTimeMs: node["Actual Total Time"] ?? null,
    sharedReadBlocks: node["Shared Read Blocks"] ?? null,
    sharedHitBlocks: node["Shared Hit Blocks"] ?? null,
    sortMethod: node["Sort Method"] || null,
    sortSpaceType: node["Sort Space Type"] || null,
    sortSpaceUsedKb: node["Sort Space Used"] ?? null,
  });

  for (const child of node.Plans || []) {
    flattenPlanNodes(child, depth + 1, rows);
  }
  return rows;
}

function summarizeExplainResult(document) {
  return {
    planningTimeMs: document?.["Planning Time"] ?? null,
    executionTimeMs: document?.["Execution Time"] ?? null,
    nodes: flattenPlanNodes(document?.Plan || null),
  };
}

function printHumanReport(summary, analyzed) {
  console.log(`GeoSub read-only query plan${analyzed ? " (ANALYZE)" : ""}`);
  if (summary.planningTimeMs !== null) {
    console.log(`Planning time: ${summary.planningTimeMs} ms`);
  }
  if (summary.executionTimeMs !== null) {
    console.log(`Execution time: ${summary.executionTimeMs} ms`);
  }
  console.log("");

  for (const node of summary.nodes) {
    console.log(
      [
        `${"  ".repeat(node.depth)}${node.nodeType}`,
        node.relation ? `table=${node.relation}` : null,
        node.index ? `index=${node.index}` : null,
        node.estimatedRows !== null ? `rows=${node.estimatedRows}` : null,
        node.actualRows !== null ? `actual=${node.actualRows}` : null,
        node.actualLoops !== null ? `loops=${node.actualLoops}` : null,
        node.totalCost !== null ? `cost=${node.totalCost}` : null,
        node.actualTotalTimeMs !== null ? `time=${node.actualTotalTimeMs}ms` : null,
        node.sharedReadBlocks !== null ? `reads=${node.sharedReadBlocks}` : null,
        node.sortSpaceType ? `sort=${node.sortSpaceType}` : null,
      ]
        .filter(Boolean)
        .join("  "),
    );
  }
  console.log("");
  console.log("The transaction was read-only and has been rolled back.");
}

async function main() {
  const rootDir = process.cwd();
  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(rootDir, fileName);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false, quiet: true });
    }
  }

  const options = parseArguments(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is missing.");

  const sql = validateReadOnlySql(fs.readFileSync(options.file, "utf8"));
  const client = new Client({
    connectionString: databaseUrl,
    application_name: "geosub-read-only-explain",
    connectionTimeoutMillis: 5_000,
  });
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION READ ONLY");
    transactionStarted = true;
    await client.query(
      `SET LOCAL statement_timeout = '${options.statementTimeoutMs}ms'`,
    );
    await client.query(`SET LOCAL lock_timeout = '${DEFAULT_LOCK_TIMEOUT_MS}ms'`);

    const explainOptions = options.analyze
      ? "ANALYZE true, BUFFERS true, TIMING true, COSTS true, FORMAT JSON"
      : "ANALYZE false, COSTS true, FORMAT JSON";
    const result = await client.query(`EXPLAIN (${explainOptions}) ${sql}`);
    const summary = summarizeExplainResult(result.rows[0]["QUERY PLAN"][0]);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            analyzed: options.analyze,
            statementTimeoutMs: options.statementTimeoutMs,
            ...summary,
          },
          null,
          2,
        ),
      );
    } else {
      printHumanReport(summary, options.analyze);
    }
  } finally {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    await client.end().catch(() => undefined);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Read-only query plan failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  flattenPlanNodes,
  parseArguments,
  summarizeExplainResult,
  validateReadOnlySql,
};
