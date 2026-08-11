const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");
const { Client } = require("pg");
const {
  prismaBaselineMigrations,
  validateManifest,
} = require("../../geosub-backend/scripts/migration-manifest.cjs");

const appDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

const guardTables = new Map([
  [
    prismaBaselineMigrations[0],
    ["admin_users", "products", "collector_jobs"],
  ],
  [prismaBaselineMigrations[1], ["event_logs", "daily_stats"]],
]);

async function readState() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const tableNames = [...new Set([...guardTables.values()].flat())];
    const tableRows = await client.query(
      `SELECT name, to_regclass('public.' || name) IS NOT NULL AS present
       FROM unnest($1::text[]) AS name`,
      [tableNames],
    );
    const presentTables = new Set(
      tableRows.rows.filter((row) => row.present).map((row) => row.name),
    );

    const registryExists = await client.query(
      "SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present",
    );
    let appliedMigrations = new Set();
    if (registryExists.rows[0]?.present) {
      const rows = await client.query(
        `SELECT migration_name
         FROM _prisma_migrations
         WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      );
      appliedMigrations = new Set(rows.rows.map((row) => row.migration_name));
    }

    return { appliedMigrations, presentTables };
  } finally {
    await client.end();
  }
}

function resolveApplied(migration) {
  const prismaCli = require.resolve("prisma/build/index.js", { paths: [appDir] });
  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "resolve", "--applied", migration],
    {
      cwd: appDir,
      encoding: "utf8",
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.status !== 0) {
    const detail = result.error ? ` ${result.error.message}` : "";
    throw new Error(
      `Preparing Prisma baseline ${migration} failed with exit code ${
        result.status ?? "unknown"
      }.${detail}`,
    );
  }
}

async function main() {
  validateManifest({ frontendDir: appDir });
  const { appliedMigrations, presentTables } = await readState();

  for (const migration of prismaBaselineMigrations) {
    if (appliedMigrations.has(migration)) {
      console.log(`Prisma baseline already registered: ${migration}`);
      continue;
    }

    const missingTables = guardTables
      .get(migration)
      .filter((table) => !presentTables.has(table));
    if (missingTables.length > 0) {
      throw new Error(
        `Refusing to baseline ${migration}; schema tables are missing: ${missingTables.join(
          ", ",
        )}`,
      );
    }

    resolveApplied(migration);
    console.log(`Prepared Prisma baseline: ${migration}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
