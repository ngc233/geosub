const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const {
  backfillEntries,
  baselineCutoverFile,
  entriesForMode,
  legacyBaselineEntries,
  schemaEntries,
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

function registryForEntry(entry) {
  return entry.id.startsWith("backfill:")
    ? "geosub_backfill_migrations"
    : "geosub_schema_migrations";
}

function migrationPath(entry) {
  return path.join(backendDir, ...entry.file.split("/"));
}

function requestedEntries() {
  const modeIndex = process.argv.indexOf("--mode");
  if (modeIndex >= 0) {
    const mode = process.argv[modeIndex + 1];
    if (!mode) throw new Error("--mode requires schema, backfill or all.");
    return entriesForMode(mode);
  }

  const requestedFile = process.argv[2];
  if (!requestedFile) {
    throw new Error(
      "Usage: node scripts/apply-local-sql.cjs --mode schema|backfill|all\n" +
        "   or: node scripts/apply-local-sql.cjs ../geosub-backend/sql/<kind>/<file>.sql",
    );
  }

  const absolute = path.resolve(appDir, requestedFile);
  const filename = path.relative(backendDir, absolute).split(path.sep).join("/");
  const entry = [...schemaEntries, ...backfillEntries].find(
    (candidate) => candidate.file === filename,
  );
  if (!entry) {
    throw new Error(`Only active migrations from the canonical layout can be applied: ${filename}`);
  }
  return [entry];
}

function assertLocalDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(databaseUrl.hostname)) {
    throw new Error(`Refusing to modify a non-local database host: ${databaseUrl.hostname}`);
  }
}

async function ensureRegistries(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS geosub_schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS geosub_backfill_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function registeredChecksum(client, registry, filename) {
  const result = await client.query(
    `SELECT checksum FROM ${registry} WHERE filename = $1`,
    [filename],
  );
  return result.rows[0]?.checksum || null;
}

async function registerCanonical(client, entry, checksum) {
  const registry = registryForEntry(entry);
  await client.query(
    `INSERT INTO ${registry} (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING`,
    [entry.file, checksum],
  );
}

async function applyMigration(client, entry) {
  const sqlPath = migrationPath(entry);
  const sql = fs.readFileSync(sqlPath, "utf8");
  const checksum = normalizedChecksum(sql);
  const registry = registryForEntry(entry);
  const existing = await registeredChecksum(client, registry, entry.file);

  if (existing) {
    if (!acceptedChecksums(sql).has(existing)) {
      throw new Error(
        `Migration checksum changed after it was applied: ${entry.file}\n` +
          `Applied: ${existing}\nCurrent: ${checksum}`,
      );
    }
    console.log(`Already applied: ${entry.file} (${checksum})`);
    return "existing";
  }

  const legacyChecksum = await registeredChecksum(
    client,
    "geosub_schema_migrations",
    entry.legacyFile,
  );
  if (legacyChecksum) {
    if (!entry.legacyChecksums.includes(legacyChecksum)) {
      throw new Error(
        `Legacy migration checksum drift: ${entry.legacyFile}\nApplied: ${legacyChecksum}`,
      );
    }
    await registerCanonical(client, entry, checksum);
    console.log(`Registered compatibility alias: ${entry.legacyFile} -> ${entry.file}`);
    return "aliased";
  }

  const ownsTransaction = /(^|\n)\s*BEGIN\s*;/i.test(sql);
  if (!ownsTransaction) await client.query("BEGIN");

  try {
    await client.query(sql);
    await registerCanonical(client, entry, checksum);
    if (!ownsTransaction) await client.query("COMMIT");
    console.log(`Applied ${entry.file} (${checksum})`);
    return "applied";
  } catch (error) {
    if (!ownsTransaction) await client.query("ROLLBACK");
    throw error;
  }
}

async function baselineLegacyMigrations(client) {
  const cutover = await registeredChecksum(
    client,
    "geosub_schema_migrations",
    baselineCutoverFile,
  );
  if (!cutover) return 0;

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

  let baselined = 0;
  for (const entry of legacyBaselineEntries) {
    const registry = registryForEntry(entry);
    if (await registeredChecksum(client, registry, entry.file)) continue;
    if (await registeredChecksum(client, "geosub_schema_migrations", entry.legacyFile)) continue;

    const sql = fs.readFileSync(migrationPath(entry), "utf8");
    await registerCanonical(client, entry, normalizedChecksum(sql));
    console.log(`Baselined legacy migration: ${entry.file}`);
    baselined += 1;
  }
  return baselined;
}

async function main() {
  validateManifest({ frontendDir: appDir });
  assertLocalDatabase();
  const entries = requestedEntries();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await ensureRegistries(client);
    const baselined = await baselineLegacyMigrations(client);

    let applied = 0;
    let aliased = 0;
    for (const entry of entries) {
      const result = await applyMigration(client, entry);
      if (result === "applied") applied += 1;
      if (result === "aliased") aliased += 1;
    }
    console.log(
      `SQL migration pass complete: ${entries.length} checked, ${applied} applied, ${aliased} aliased, ${baselined} baselined.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
