const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

const requestedFile = process.argv[2];

if (!requestedFile) {
  throw new Error("Usage: node scripts/apply-local-sql.cjs ../geosub-backend/sql/<file>.sql");
}

const sqlPath = path.resolve(appDir, requestedFile);
const allowedSqlDir = path.join(repoDir, "geosub-backend", "sql") + path.sep;

if (!sqlPath.startsWith(allowedSqlDir) || path.extname(sqlPath) !== ".sql") {
  throw new Error("Only GeoSub backend SQL migrations can be applied.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);

if (!new Set(["localhost", "127.0.0.1", "::1"]).has(databaseUrl.hostname)) {
  throw new Error(`Refusing to modify a non-local database host: ${databaseUrl.hostname}`);
}

const relativeFilename = path
  .relative(repoDir, sqlPath)
  .split(path.sep)
  .join("/")
  .replace(/^geosub-backend\//, "");
const sql = fs.readFileSync(sqlPath, "utf8");
const checksum = crypto
  .createHash("sha256")
  .update(sql.replace(/\r/g, ""))
  .digest("hex");
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  await client.query("BEGIN");

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS geosub_schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const existing = await client.query(
      "SELECT checksum FROM geosub_schema_migrations WHERE filename = $1",
      [relativeFilename],
    );

    if (existing.rowCount > 0) {
      const appliedChecksum = existing.rows[0].checksum;
      if (appliedChecksum !== checksum) {
        throw new Error(
          `Migration checksum changed after it was applied: ${relativeFilename}\n` +
            `Applied: ${appliedChecksum}\nCurrent: ${checksum}`,
        );
      }

      await client.query("COMMIT");
      console.log(`Already applied: ${relativeFilename} (${checksum})`);
      return;
    }

    await client.query(sql);
    await client.query(
      "INSERT INTO geosub_schema_migrations (filename, checksum) VALUES ($1, $2)",
      [relativeFilename, checksum],
    );
    await client.query("COMMIT");
    console.log(`Applied ${relativeFilename} (${checksum})`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
