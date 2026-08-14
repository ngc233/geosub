const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const {
  backfillEntries,
  baselineCutoverFile,
  compatibilitySqlForEntry,
  entriesForMode,
  prismaMigrations,
  registryAliases,
  retiredEntries,
  schemaEntries,
  validateManifest,
} = require("../../geosub-backend/scripts/migration-manifest.cjs");

const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");
const backendDir = path.join(repoDir, "geosub-backend");
const includeBackfills = process.argv.includes("--include-backfills");
const schemaMode = process.env.GEOSUB_SCHEMA_MODE || "schema";
if (!new Set(["schema", "complete-schema", "post-cutover"]).has(schemaMode)) {
  throw new Error(`Unsupported GEOSUB_SCHEMA_MODE: ${schemaMode}`);
}

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
const databaseUrl = new URL(process.env.DATABASE_URL);
if (!new Set(["localhost", "127.0.0.1", "::1"]).has(databaseUrl.hostname)) {
  throw new Error(`Refusing to audit a non-local database host: ${databaseUrl.hostname}`);
}

function checksumCandidates(entry) {
  const sqlPath = path.join(backendDir, ...entry.file.split("/"));
  const sql = fs.readFileSync(sqlPath, "utf8");
  const normalized = sql.replace(/\r/g, "");
  return new Set([
    crypto.createHash("sha256").update(normalized).digest("hex"),
    crypto.createHash("sha256").update(sql).digest("hex"),
    crypto
      .createHash("sha256")
      .update(normalized.replace(/\n/g, "\r\n"))
      .digest("hex"),
  ]);
}

async function readRegistry(client, table) {
  const exists = await client.query("SELECT to_regclass($1) AS relation", [`public.${table}`]);
  if (!exists.rows[0]?.relation) return new Map();
  const result = await client.query(
    `SELECT filename, checksum, applied_at FROM ${table} ORDER BY filename`,
  );
  return new Map(result.rows.map((row) => [row.filename, row]));
}

async function auditEntries({
  client,
  entries,
  applied,
  legacyApplied,
  label,
  required,
  legacyBaselineReady,
}) {
  const failures = [];
  let complete = 0;
  let compatible = 0;
  let missing = 0;

  for (const entry of entries) {
    const row = applied.get(entry.file);
    if (row) {
      if (!checksumCandidates(entry).has(row.checksum)) {
        failures.push(`${entry.file}: checksum mismatch`);
        console.log(`DRIFT   ${label} ${entry.file}`);
      } else {
        complete += 1;
        console.log(`OK      ${label} ${entry.file}`);
      }
      continue;
    }

    const legacy = legacyApplied.get(entry.legacyFile);
    if (legacy && entry.legacyChecksums.includes(legacy.checksum)) {
      compatible += 1;
      console.log(`COMPAT  ${label} ${entry.legacyFile} -> ${entry.file}`);
      continue;
    }

    if (legacyBaselineReady && entry.legacyBaseline) {
      compatible += 1;
      console.log(`COMPAT  ${label} legacy baseline -> ${entry.file}`);
      continue;
    }

    const compatibilitySql = compatibilitySqlForEntry(entry);
    if (compatibilitySql) {
      const result = await client.query(compatibilitySql);
      if (result.rows[0]?.compatible === true) {
        compatible += 1;
        console.log(`COMPAT  ${label} existing structure -> ${entry.file}`);
        continue;
      }
    }

    missing += 1;
    console.log(`MISSING ${label} ${entry.file}`);
    if (required) failures.push(`${entry.file}: not registered`);
  }

  return { failures, complete, compatible, missing };
}

async function auditSqlMigrations(client) {
  const schemaApplied = await readRegistry(client, "geosub_schema_migrations");
  const backfillApplied = await readRegistry(client, "geosub_backfill_migrations");
  const cutover = schemaApplied.get(baselineCutoverFile);
  const cutoverEntry = [...schemaEntries, ...backfillEntries].find(
    (entry) => entry.legacyFile === baselineCutoverFile,
  );
  let legacyBaselineReady = false;
  if (cutover && cutoverEntry?.legacyChecksums.includes(cutover.checksum)) {
    const guards = await client.query(`
      SELECT
        to_regclass('public.products') IS NOT NULL AS has_products,
        to_regclass('public.collector_jobs') IS NOT NULL AS has_collector_jobs,
        to_regprocedure(
          'queue_app_store_coverage_gap_rechecks(integer,integer,integer)'
        ) IS NOT NULL AS has_pre_cutover_function
    `);
    const row = guards.rows[0];
    legacyBaselineReady = Boolean(
      row.has_products && row.has_collector_jobs && row.has_pre_cutover_function,
    );
  }

  const requiredSchemaEntries = entriesForMode(schemaMode);
  const schema = await auditEntries({
    client,
    entries: requiredSchemaEntries,
    applied: schemaApplied,
    legacyApplied: schemaApplied,
    label: "SCHEMA  ",
    required: true,
    legacyBaselineReady,
  });
  const requiredSchemaFiles = new Set(requiredSchemaEntries.map((entry) => entry.file));
  const deferredEntries = schemaEntries.filter((entry) => !requiredSchemaFiles.has(entry.file));
  const deferred = await auditEntries({
    client,
    entries: deferredEntries,
    applied: schemaApplied,
    legacyApplied: schemaApplied,
    label: "DEFERRED ",
    required: false,
    legacyBaselineReady,
  });
  const backfill = await auditEntries({
    client,
    entries: backfillEntries,
    applied: backfillApplied,
    legacyApplied: schemaApplied,
    label: "BACKFILL",
    required: includeBackfills,
    legacyBaselineReady,
  });

  const knownLegacy = new Set(
    [...schemaEntries, ...backfillEntries, ...retiredEntries].map(
      (entry) => entry.legacyFile,
    ),
  );
  const knownSchema = new Set(schemaEntries.map((entry) => entry.file));
  const aliasChecksums = new Map(
    registryAliases.map((entry) => [entry.file, new Set(entry.checksums)]),
  );
  const unknownSchema = [];
  for (const [filename, row] of schemaApplied) {
    if (knownSchema.has(filename) || knownLegacy.has(filename)) continue;
    const acceptedAliasChecksums = aliasChecksums.get(filename);
    if (acceptedAliasChecksums?.has(row.checksum)) continue;
    unknownSchema.push(filename);
  }
  const knownBackfill = new Set(backfillEntries.map((entry) => entry.file));
  const unknownBackfill = [...backfillApplied.keys()].filter(
    (filename) => !knownBackfill.has(filename),
  );
  const failures = [...schema.failures, ...backfill.failures];
  if (unknownSchema.length > 0) {
    failures.push(`unclassified registered schema SQL: ${unknownSchema.join(", ")}`);
  }
  if (unknownBackfill.length > 0) {
    failures.push(`unclassified registered backfill SQL: ${unknownBackfill.join(", ")}`);
  }

  return { failures, schema, deferred, backfill };
}

async function auditPrismaMigrations(client) {
  const result = await client.query(`
    SELECT migration_name, finished_at, rolled_back_at
    FROM _prisma_migrations
    ORDER BY migration_name
  `);
  const applied = new Map(result.rows.map((row) => [row.migration_name, row]));
  const failures = [];

  for (const migration of prismaMigrations) {
    const row = applied.get(migration);
    if (!row) {
      failures.push(`Prisma ${migration}: not registered`);
      console.log(`MISSING PRISMA ${migration}`);
      continue;
    }
    if (!row.finished_at || row.rolled_back_at) {
      failures.push(`Prisma ${migration}: incomplete or rolled back`);
      console.log(`FAILED  PRISMA ${migration}`);
      continue;
    }
    console.log(`OK      PRISMA ${migration}`);
  }

  const unknownApplied = [...applied.keys()].filter(
    (migration) => !prismaMigrations.includes(migration),
  );
  if (unknownApplied.length > 0) {
    failures.push(`unclassified registered Prisma migrations: ${unknownApplied.join(", ")}`);
  }
  return failures;
}

async function main() {
  const manifest = validateManifest({ frontendDir: appDir });
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log(
      `GeoSub migration audit: schema=${manifest.schema} active=${manifest.activeSchema} post-cutover=${manifest.postCutoverSchema} mode=${schemaMode} backfill=${manifest.backfill} retired=${manifest.retired} prisma=${manifest.prisma}`,
    );
    const sql = await auditSqlMigrations(client);
    const failures = [...sql.failures, ...(await auditPrismaMigrations(client))];

    console.log(
      `Backfill status: ${sql.backfill.complete} registered, ${sql.backfill.compatible} legacy-compatible, ${sql.backfill.missing} pending.`,
    );
    if (sql.deferred.complete + sql.deferred.compatible + sql.deferred.missing > 0) {
      console.log(
        `Deferred schema status: ${sql.deferred.complete} registered, ${sql.deferred.compatible} structure-compatible, ${sql.deferred.missing} pending.`,
      );
    }
    if (failures.length > 0) {
      throw new Error(
        `Migration audit failed:\n- ${failures.join("\n- ")}\n` +
          "Run npm run db:migrate for schema, or npm run db:backfill for explicit data migrations.",
      );
    }

    console.log(
      `Migration audit passed: ${entriesForMode(schemaMode).length} required schema and ${prismaMigrations.length} Prisma migrations.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
