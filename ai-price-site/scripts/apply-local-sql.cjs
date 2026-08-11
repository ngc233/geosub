const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const {
  baselineCutoverFile,
  contentFiles,
  coreFiles,
  filesForMode,
  legacyBaselineFiles,
  validateManifest,
} = require("../../geosub-backend/scripts/migration-manifest.cjs");

const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");
const backendDir = path.join(repoDir, "geosub-backend");

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

function normalizedChecksum(sql) {
  return crypto.createHash("sha256").update(sql.replace(/\r/g, "")).digest("hex");
}

function acceptedChecksums(sql) {
  const normalized = sql.replace(/\r/g, "");
  return new Set([
    normalizedChecksum(sql),
    crypto.createHash("sha256").update(sql).digest("hex"),
    crypto
      .createHash("sha256")
      .update(normalized.replace(/\n/g, "\r\n"))
      .digest("hex"),
  ]);
}

function migrationFilename(sqlPath) {
  return path
    .relative(backendDir, sqlPath)
    .split(path.sep)
    .join("/");
}

function requestedFiles() {
  const modeIndex = process.argv.indexOf("--mode");
  if (modeIndex >= 0) {
    const mode = process.argv[modeIndex + 1];
    if (!mode) {
      throw new Error("--mode requires core, content or all.");
    }
    return filesForMode(mode).map((file) => path.join(backendDir, ...file.split("/")));
  }

  const requestedFile = process.argv[2];
  if (!requestedFile) {
    throw new Error(
      "Usage: node scripts/apply-local-sql.cjs --mode core|content|all\n" +
        "   or: node scripts/apply-local-sql.cjs ../geosub-backend/sql/<file>.sql",
    );
  }

  const sqlPath = path.resolve(appDir, requestedFile);
  const filename = migrationFilename(sqlPath);
  if (![...coreFiles, ...contentFiles].includes(filename)) {
    throw new Error(`Only active migrations from the canonical manifest can be applied: ${filename}`);
  }
  return [sqlPath];
}

function assertLocalDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing.");
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(databaseUrl.hostname)) {
    throw new Error(`Refusing to modify a non-local database host: ${databaseUrl.hostname}`);
  }
}

async function applyMigration(client, sqlPath) {
  const filename = migrationFilename(sqlPath);
  const sql = fs.readFileSync(sqlPath, "utf8");
  const checksum = normalizedChecksum(sql);
  const existing = await client.query(
    "SELECT checksum FROM geosub_schema_migrations WHERE filename = $1",
    [filename],
  );

  if (existing.rowCount > 0) {
    const appliedChecksum = existing.rows[0].checksum;
    if (!acceptedChecksums(sql).has(appliedChecksum)) {
      throw new Error(
        `Migration checksum changed after it was applied: ${filename}\n` +
          `Applied: ${appliedChecksum}\nCurrent: ${checksum}`,
      );
    }
    console.log(`Already applied: ${filename} (${checksum})`);
    return "existing";
  }

  const ownsTransaction = /(^|\n)\s*BEGIN\s*;/i.test(sql);
  if (!ownsTransaction) {
    await client.query("BEGIN");
  }

  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO geosub_schema_migrations (filename, checksum) VALUES ($1, $2)",
      [filename, checksum],
    );
    if (!ownsTransaction) {
      await client.query("COMMIT");
    }
    console.log(`Applied ${filename} (${checksum})`);
    return "applied";
  } catch (error) {
    if (!ownsTransaction) {
      await client.query("ROLLBACK");
    }
    throw error;
  }
}

async function baselineLegacyMigrations(client) {
  const cutover = await client.query(
    "SELECT 1 FROM geosub_schema_migrations WHERE filename = $1",
    [baselineCutoverFile],
  );
  if (cutover.rowCount === 0) {
    return 0;
  }

  const schemaGuard = await client.query(`
    SELECT
      to_regclass('public.products') IS NOT NULL AS has_products,
      to_regclass('public.collector_jobs') IS NOT NULL AS has_collector_jobs,
      to_regprocedure(
        'queue_app_store_coverage_gap_rechecks(integer,integer,integer)'
      ) IS NOT NULL AS has_pre_cutover_function
  `);
  const guard = schemaGuard.rows[0];
  if (!guard.has_products || !guard.has_collector_jobs || !guard.has_pre_cutover_function) {
    throw new Error(
      "Refusing to baseline legacy migrations because the pre-cutover schema guards are incomplete.",
    );
  }

  const existing = await client.query(
    "SELECT filename FROM geosub_schema_migrations WHERE filename = ANY($1::text[])",
    [legacyBaselineFiles],
  );
  const registered = new Set(existing.rows.map((row) => row.filename));
  let baselined = 0;

  for (const filename of legacyBaselineFiles) {
    if (registered.has(filename)) continue;
    const sqlPath = path.join(backendDir, ...filename.split("/"));
    const checksum = normalizedChecksum(fs.readFileSync(sqlPath, "utf8"));
    await client.query(
      "INSERT INTO geosub_schema_migrations (filename, checksum) VALUES ($1, $2)",
      [filename, checksum],
    );
    console.log(`Baselined legacy migration: ${filename}`);
    baselined += 1;
  }

  return baselined;
}

async function main() {
  validateManifest({ frontendDir: appDir });
  assertLocalDatabase();
  const files = requestedFiles();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS geosub_schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const baselined = await baselineLegacyMigrations(client);

    let applied = 0;
    for (const sqlPath of files) {
      if ((await applyMigration(client, sqlPath)) === "applied") {
        applied += 1;
      }
    }
    console.log(
      `SQL migration pass complete: ${files.length} checked, ${applied} applied, ${baselined} baselined.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
