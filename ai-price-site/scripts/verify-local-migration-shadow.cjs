const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const appDir = path.resolve(__dirname, "..");

function normalizeDump(value) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("-- Dumped from database version ") &&
        !line.startsWith("-- Dumped by pg_dump version ") &&
        !line.startsWith("-- Started on ") &&
        !line.startsWith("-- Completed on ") &&
        !/^\\(?:un)?restrict /.test(line),
    )
    .join("\n");
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertShadowTarget({ databaseUrl, shadowDatabase }) {
  if (!shadowDatabase?.startsWith("geosub_b1_shadow_")) {
    throw new Error("Shadow database must use the geosub_b1_shadow_ prefix.");
  }
  const url = new URL(databaseUrl);
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(url.hostname)) {
    throw new Error(`Refusing non-local database host: ${url.hostname}`);
  }
  const sourceDatabase = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!sourceDatabase || sourceDatabase === shadowDatabase) {
    throw new Error("Shadow database must differ from the configured source database.");
  }
  return { sourceDatabase, url };
}

function runDocker(args, { encoding = "utf8" } = {}) {
  const result = spawnSync("docker", args, {
    cwd: appDir,
    encoding,
    shell: false,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const stderr = encoding ? result.stderr : result.stderr?.toString("utf8");
    throw new Error(`Docker command failed: ${stderr || args.join(" ")}`);
  }
  return result.stdout;
}

function readDump({ container, user, database, scope }) {
  const args = [
    "exec",
    container,
    "pg_dump",
    "-U",
    user,
    "-d",
    database,
    "--no-owner",
    "--no-privileges",
  ];
  if (scope === "geosub") {
    args.push("--schema-only", "--exclude-table=public.directus_*");
  } else if (scope === "directus") {
    args.push("--schema-only", "--table=public.directus_*");
  } else {
    throw new Error(`Unknown dump scope: ${scope}`);
  }
  return normalizeDump(runDocker(args));
}

function dataHash({ container, user, database }) {
  const temporaryDump =
    `/tmp/geosub-b1-shadow-data-${process.pid}-${crypto.randomUUID()}.sql`;

  try {
    runDocker([
      "exec",
      container,
      "pg_dump",
      "-U",
      user,
      "-d",
      database,
      "--data-only",
      "--no-owner",
      "--no-privileges",
      `--file=${temporaryDump}`,
    ]);
    runDocker([
      "exec",
      container,
      "sed",
      "-E",
      "-i",
      "-e",
      "/^-- Dumped from database version /d",
      "-e",
      "/^-- Dumped by pg_dump version /d",
      "-e",
      "/^-- Started on /d",
      "-e",
      "/^-- Completed on /d",
      "-e",
      "/^\\\\(un)?restrict /d",
      temporaryDump,
    ]);
    const output = runDocker([
      "exec",
      container,
      "sha256sum",
      temporaryDump,
    ]).trim();
    const match = output.match(/^([0-9a-f]{64})\s/);
    if (!match) throw new Error("Unable to parse the shadow data SHA-256 hash.");
    return match[1];
  } finally {
    const cleanup = spawnSync(
      "docker",
      ["exec", container, "rm", "-f", temporaryDump],
      { cwd: appDir, encoding: "utf8", shell: false },
    );
    if (cleanup.status !== 0) {
      console.warn(`Unable to remove temporary shadow dump: ${temporaryDump}`);
    }
  }
}

function directusTableCount({ container, user, database }) {
  const output = runDocker([
    "exec",
    container,
    "psql",
    "-U",
    user,
    "-d",
    database,
    "-Atc",
    "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname LIKE 'directus_%'",
  ]);
  return Number.parseInt(output.trim(), 10) || 0;
}

function snapshot(options) {
  const geosub = readDump({ ...options, scope: "geosub" });
  const directus =
    directusTableCount(options) > 0
      ? readDump({ ...options, scope: "directus" })
      : "NO_DIRECTUS_TABLES\n";
  return {
    geosub,
    directus,
    hashes: {
      geosub: hash(geosub),
      directus: hash(directus),
      data: dataHash(options),
    },
  };
}

function writeSnapshot(evidenceDir, prefix, value) {
  fs.writeFileSync(path.join(evidenceDir, `${prefix}-geosub.sql`), value.geosub, "utf8");
  fs.writeFileSync(path.join(evidenceDir, `${prefix}-directus.sql`), value.directus, "utf8");
}

function runMigration({ databaseUrl, evidenceDir }) {
  const result = spawnSync(process.execPath, [path.join(__dirname, "migrate-database.cjs")], {
    cwd: appDir,
    encoding: "utf8",
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      GEOSUB_SCHEMA_MODE: "schema",
    },
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  fs.writeFileSync(path.join(evidenceDir, "migration.log"), output, "utf8");
  process.stdout.write(output);
  if (result.status !== 0) {
    throw new Error(`Shadow migration failed with exit code ${result.status ?? "unknown"}.`);
  }
  if (!/SQL migration pass complete: \d+ checked, 0 applied, \d+ compatible\./.test(output)) {
    throw new Error("Shadow SQL migration was not a zero-apply run.");
  }
  if (!output.includes("No pending migrations to apply.")) {
    throw new Error("Shadow Prisma migration was not a zero-apply run.");
  }
}

function main() {
  dotenv.config({ path: path.join(appDir, ".env.local") });
  dotenv.config({ path: path.join(appDir, ".env") });
  const shadowDatabase = process.argv[2];
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
  const { url } = assertShadowTarget({
    databaseUrl: process.env.DATABASE_URL,
    shadowDatabase,
  });
  const container = process.env.GEOSUB_DB_CONTAINER || "geosub-postgres";
  const user = decodeURIComponent(url.username);
  if (!user) throw new Error("DATABASE_URL has no database user.");

  const exists = runDocker([
    "exec",
    container,
    "psql",
    "-U",
    user,
    "-d",
    "postgres",
    "-Atc",
    `SELECT count(*) FROM pg_database WHERE datname='${shadowDatabase}'`,
  ]).trim();
  if (exists !== "1") throw new Error(`Shadow database does not exist: ${shadowDatabase}`);

  const evidenceDir = path.join(appDir, "logs", "b1-shadow", shadowDatabase);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const options = { container, user, database: shadowDatabase };
  console.log(`Hashing isolated shadow database: ${shadowDatabase}`);
  const before = snapshot(options);
  writeSnapshot(evidenceDir, "before", before);

  const shadowUrl = new URL(url.toString());
  shadowUrl.pathname = `/${shadowDatabase}`;
  runMigration({ databaseUrl: shadowUrl.toString(), evidenceDir });

  const after = snapshot(options);
  writeSnapshot(evidenceDir, "after", after);
  for (const scope of ["geosub", "directus", "data"]) {
    if (before.hashes[scope] !== after.hashes[scope]) {
      throw new Error(`${scope} hash changed during the shadow migration.`);
    }
  }

  const result = {
    shadowDatabase,
    ownershipPolicy: "geosub_strict_directus_external",
    sqlApplied: 0,
    prismaPending: 0,
    hashes: after.hashes,
    result: "passed",
  };
  fs.writeFileSync(
    path.join(evidenceDir, "result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
  console.log(`B1 local shadow verification passed. Evidence: ${evidenceDir}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { assertShadowTarget, normalizeDump };
