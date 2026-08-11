const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const {
  baselineCutoverFile,
  contentFiles,
  coreFiles,
  legacyBaselineFiles,
  prismaMigrations,
  retiredFiles,
  validateManifest,
} = require("../../geosub-backend/scripts/migration-manifest.cjs");

const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");
const backendDir = path.join(repoDir, "geosub-backend");

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
if (!new Set(["localhost", "127.0.0.1", "::1"]).has(databaseUrl.hostname)) {
  throw new Error(`Refusing to audit a non-local database host: ${databaseUrl.hostname}`);
}

function checksumCandidates(filename) {
  const sqlPath = path.join(backendDir, ...filename.split("/"));
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

async function auditSqlMigrations(client) {
  const result = await client.query(
    "SELECT filename, checksum, applied_at FROM geosub_schema_migrations ORDER BY filename",
  );
  const applied = new Map(result.rows.map((row) => [row.filename, row]));
  const failures = [];
  const canBaselineLegacy = applied.has(baselineCutoverFile);

  for (const filename of coreFiles) {
    const row = applied.get(filename);
    if (!row) {
      failures.push(`${filename}: not registered`);
      if (canBaselineLegacy && legacyBaselineFiles.includes(filename)) {
        console.log(`BASELINE SQL   ${filename}`);
      } else {
        console.log(`MISSING SQL    ${filename}`);
      }
      continue;
    }
    if (!checksumCandidates(filename).has(row.checksum)) {
      failures.push(`${filename}: checksum mismatch`);
      console.log(`DRIFT   SQL    ${filename}`);
      continue;
    }
    console.log(`OK      SQL    ${filename}`);
  }

  const knownFiles = new Set([...coreFiles, ...contentFiles, ...retiredFiles.keys()]);
  const unknownApplied = [...applied.keys()].filter((filename) => !knownFiles.has(filename));
  if (unknownApplied.length > 0) {
    failures.push(`unclassified registered SQL: ${unknownApplied.join(", ")}`);
  }

  return failures;
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
      `GeoSub migration audit: core=${manifest.core} content=${manifest.content} retired=${manifest.retired} prisma=${manifest.prisma}`,
    );
    const failures = [
      ...(await auditSqlMigrations(client)),
      ...(await auditPrismaMigrations(client)),
    ];

    if (failures.length > 0) {
      throw new Error(
        `Migration audit failed:\n- ${failures.join("\n- ")}\n` +
          "Run npm run db:migrate on the local database to apply or register the missing migrations.",
      );
    }

    console.log(
      `Migration audit passed: ${coreFiles.length} SQL and ${prismaMigrations.length} Prisma migrations.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
