const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");
const backendDir = path.join(repoDir, "geosub-backend");
const requiredMigrations = [
  "sql/063_system_task_runs.sql",
  "sql/064_data_quality_repair_cycles.sql",
  "sql/065_operational_self_healing.sql",
  "sql/066_public_product_lifecycle.sql",
  "sql/067_app_store_availability_semantics.sql",
  "sql/068_plan_region_availability.sql",
  "sql/069_required_catalog_products.sql",
  "sql/070_disney_app_store_source.sql",
  "sql/071_archive_superseded_app_store_ambiguities.sql",
  "sql/072_normalize_hbo_max_app_store_plans.sql",
];

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
if (!new Set(["localhost", "127.0.0.1", "::1"]).has(databaseUrl.hostname)) {
  throw new Error(`Refusing to audit a non-local database host: ${databaseUrl.hostname}`);
}

function checksumFor(filename) {
  const sqlPath = path.join(backendDir, ...filename.split("/"));
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Required migration file is missing: ${filename}`);
  }

  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(sqlPath, "utf8").replace(/\r/g, ""))
    .digest("hex");
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(
      "SELECT filename, checksum, applied_at FROM geosub_schema_migrations WHERE filename = ANY($1::text[]) ORDER BY filename",
      [requiredMigrations],
    );
    const applied = new Map(result.rows.map((row) => [row.filename, row]));
    const failures = [];

    console.log("GeoSub v2 migration registry audit");
    for (const filename of requiredMigrations) {
      const expected = checksumFor(filename);
      const row = applied.get(filename);

      if (!row) {
        failures.push(`${filename}: not registered`);
        console.log(`MISSING ${filename}`);
        continue;
      }

      if (row.checksum !== expected) {
        failures.push(`${filename}: checksum mismatch`);
        console.log(`DRIFT ${filename}`);
        continue;
      }

      console.log(`OK    ${filename} (${new Date(row.applied_at).toISOString()})`);
    }

    if (failures.length > 0) {
      throw new Error(`Migration audit failed:\n- ${failures.join("\n- ")}`);
    }

    console.log(`Migration audit passed: ${requiredMigrations.length}/${requiredMigrations.length}.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
