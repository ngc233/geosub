const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { createHash, randomBytes } = require("node:crypto");
const { Client } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const app = path.resolve(__dirname, "..");
const root = path.resolve(app, "..");
const baseline = "ccb66ca6d1bbfd9a21c108c5afafde58a49229cf";
const url = new URL(process.env.GEOSUB_VERSION_UPGRADE_DATABASE_URL);
assert(["127.0.0.1", "localhost"].includes(url.hostname));
assert(/^\/geosub_price_version_test_[a-z0-9_]+_e2e$/.test(url.pathname));
const env = {
  ...process.env, DATABASE_URL: url.href, GEOSUB_SCHEMA_MODE: "complete-schema",
  PGHOST: url.hostname, PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
};
delete env.PGOPTIONS;
const db = new Client({ connectionString: url.href });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "geosub-price-upgrade-"));
const old = path.join(temp, "baseline");
const sourceFile = path.join(root, "geosub-backend/sql/schema/060_formal_price_versions.sql");
const sql = fs.readFileSync(sourceFile, "utf8");
const sha = value => createHash("sha256").update(value).digest("hex");
const clean = value => String(value).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]");
const roles = ["version_writer_", "version_reader_"].map(prefix => prefix + randomBytes(5).toString("hex"));
const restoreName = url.pathname.slice(1).replace(/_e2e$/, "_restore_e2e");
let legacy, writer, reader, ownedRestore = false, createdRoles = false, checks = 0;

function run(command, args, cwd = app, extra = {}) {
  const result = spawnSync(command, args, {
    cwd, env: { ...env, ...extra }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw Error(command + " failed: " + clean((result.stdout || "") + (result.stderr || "")).slice(-2200));
  }
  return result.stdout;
}

const psqlArgs = file => [
  "--no-psqlrc", "--host", env.PGHOST, "--port", env.PGPORT, "--username", env.PGUSER,
  "--dbname", url.pathname.slice(1), "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "--file", file,
];
async function psql(file) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", psqlArgs(file), { env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", value => { output += value; });
    child.stderr.on("data", value => { output += value; });
    child.once("error", reject);
    child.once("exit", code => resolve({ code, output: clean(output) }));
  });
}

async function business() {
  const result = {};
  for (const table of ["products", "plans", "region_prices", "price_observations", "admin_users", "audit_logs"]) {
    result[table] = (await db.query("SELECT * FROM public." + table + " ORDER BY id")).rows;
  }
  return result;
}
async function registry() {
  return {
    sql: (await db.query("SELECT * FROM geosub_schema_migrations ORDER BY filename")).rows,
    prisma: (await db.query("SELECT * FROM _prisma_migrations ORDER BY migration_name")).rows,
  };
}
const latest = async () => (await db.query(
  "SELECT * FROM public.price_dataset_versions ORDER BY revision DESC LIMIT 1",
)).rows[0];

async function main() {
  await db.connect();
  const fixture = require("./e2e-fixture.cjs");
  const timing = {};
  let backup, after, beforeRegistry;
  try {
    assert.equal((await db.query("SELECT to_regclass('public.products') AS name")).rows[0].name, null);
    fs.mkdirSync(old);
    const archive = spawnSync("git", [
      "-C", root, "archive", baseline, "geosub-backend", "ai-price-site/scripts", "ai-price-site/prisma",
      "ai-price-site/prisma.config.ts", "ai-price-site/package.json", "ai-price-site/package-lock.json",
    ], { maxBuffer: 128 * 1024 * 1024 });
    assert.equal(archive.status, 0, "Exact retained source unavailable; fetch complete history");
    assert.equal(spawnSync("tar", ["-x", "-C", old], { input: archive.stdout }).status, 0);
    fs.symlinkSync(path.join(app, "node_modules"), path.join(old, "ai-price-site/node_modules"));
    fs.symlinkSync(path.join(app, "node_modules"), path.join(temp, "node_modules"));
    run(process.execPath, ["scripts/migrate-database.cjs"], path.join(old, "ai-price-site"));
    run(process.execPath, ["scripts/seed-e2e.cjs"], path.join(old, "ai-price-site"));

    const schema = fs.readFileSync(path.join(old, "ai-price-site/prisma/schema.prisma"), "utf8");
    const generator = 'generator client {\n  provider = "prisma-client-js"\n}\n';
    assert(schema.startsWith(generator));
    const generated = path.join(temp, "old-client");
    const derived = "generator client {\n  provider = \"prisma-client-js\"\n  output = "
      + JSON.stringify(generated) + "\n}\n" + schema.slice(generator.length);
    const schemaFile = path.join(temp, "old.prisma");
    fs.writeFileSync(schemaFile, derived);
    run(process.execPath, ["node_modules/prisma/build/index.js", "generate", "--schema", schemaFile]);
    const { PrismaClient } = require(generated);
    legacy = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }) });
    assert.equal(legacy.priceDatasetVersion, undefined);
    const oldRows = JSON.stringify(await legacy.regionPrice.findMany({ orderBy: { id: "asc" } }));
    const before = await business(); beforeRegistry = await registry(); checks++;

    for (const role of roles) await db.query("CREATE ROLE " + role + " NOLOGIN");
    createdRoles = true;
    await db.query("GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO " + roles[0]);
    await db.query("GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO " + roles[0]);
    await db.query("GRANT SELECT ON ALL TABLES IN SCHEMA public TO " + roles[1]);
    writer = new Client({ connectionString: url.href }); await writer.connect();
    reader = new Client({ connectionString: url.href }); await reader.connect();
    await writer.query("SET ROLE " + roles[0]);
    await reader.query("SET ROLE " + roles[1]);
    await writer.query("BEGIN");
    await writer.query("UPDATE region_prices SET last_checked_at=now() WHERE id=$1", [fixture.regionPriceId]);
    const started = Date.now(), pending = psql(sourceFile);
    await reader.query("SET statement_timeout='1s'");
    await reader.query("SELECT count(*) FROM region_prices");
    const blocked = await pending; timing.lockTimeoutMs = Date.now() - started;
    assert.notEqual(blocked.code, 0); assert.match(blocked.output, /55P03|lock timeout/);
    assert(timing.lockTimeoutMs >= 4500 && timing.lockTimeoutMs < 15000);
    await writer.query("ROLLBACK");
    assert.equal((await db.query("SELECT to_regclass('public.price_dataset_versions') AS name")).rows[0].name, null);
    assert.deepEqual(await business(), before); assert.deepEqual(await registry(), beforeRegistry); checks++;

    const broken = path.join(temp, "atomic-failure.sql");
    assert(sql.includes("SELECT record_formal_price_version();"));
    fs.writeFileSync(broken, sql.replace("SELECT record_formal_price_version();", "SELECT 1/0;"));
    const failed = await psql(broken);
    assert.notEqual(failed.code, 0); assert.match(failed.output, /22012|division by zero/);
    assert.equal((await db.query("SELECT to_regclass('public.price_dataset_versions') AS name")).rows[0].name, null);
    assert.deepEqual(await business(), before); checks++;

    const dump = path.join(temp, "synthetic-before-upgrade.dump");
    run("pg_dump", ["--format=custom", "--file", dump, url.pathname.slice(1)]);
    const bytes = fs.readFileSync(dump);
    assert.equal(bytes.subarray(0, 5).toString(), "PGDMP");
    const catalog = run("pg_restore", ["--list", dump]);
    assert(catalog.includes("region_prices"));
    backup = { bytes: bytes.length, sha256: sha(bytes), catalogVerified: true, syntheticOnly: true }; checks++;

    run(process.execPath, ["scripts/migrate-database.cjs"]);
    assert.deepEqual(await business(), before);
    assert.equal(JSON.stringify(await legacy.regionPrice.findMany({ orderBy: { id: "asc" } })), oldRows);
    const initial = await latest(); assert.equal(initial.revision, "1");
    after = await registry();
    assert.deepEqual(after.sql.filter(row => !beforeRegistry.sql.some(oldRow => oldRow.id === row.id))
      .map(row => row.filename), ["sql/schema/060_formal_price_versions.sql"]);
    assert.deepEqual(after.prisma.filter(row => !beforeRegistry.prisma.some(oldRow => oldRow.id === row.id))
      .map(row => row.migration_name), ["20261031090000_formal_price_versions"]);
    for (const row of beforeRegistry.sql) assert(after.sql.some(value => JSON.stringify(value) === JSON.stringify(row)));
    for (const row of beforeRegistry.prisma) assert(after.prisma.some(value => JSON.stringify(value) === JSON.stringify(row)));
    checks++;
    run(process.execPath, ["scripts/migrate-database.cjs"]);
    assert.deepEqual(await registry(), after); assert.deepEqual(await latest(), initial);
    assert.deepEqual(await business(), before); checks++;
    assert.equal((await psql(sourceFile)).code, 0);
    assert.deepEqual(await latest(), initial);
    assert.equal((await psql(path.join(app, "prisma/migrations/20261031090000_formal_price_versions/migration.sql"))).code, 0);
    assert.deepEqual(await latest(), initial); assert.deepEqual(await business(), before); checks++;

    await writer.query("UPDATE region_prices SET last_checked_at=now() WHERE id=$1", [fixture.regionPriceId]);
    assert.deepEqual(await latest(), initial); checks++;
    await writer.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [fixture.regionPriceId]);
    assert.equal((await latest()).revision, "2");
    await writer.query("SELECT approve_price_observation($1)", [fixture.observationId]);
    assert.equal((await latest()).revision, "3"); checks++;
    for (const statement of [
      "UPDATE price_dataset_versions SET price_count=0",
      "DELETE FROM price_dataset_versions", "SELECT * FROM price_dataset_version_state",
      "SELECT record_formal_price_version()",
    ]) await assert.rejects(writer.query(statement), error => error.code === "42501");
    await reader.query("SELECT * FROM price_dataset_versions");
    await assert.rejects(reader.query("UPDATE region_prices SET local_price=0"), error => error.code === "42501");
    checks++;
    const writerUrl = new URL(url);
    writerUrl.searchParams.set("options", "-c role=" + roles[0]);
    await legacy.$disconnect();
    legacy = new PrismaClient({ adapter: new PrismaPg({ connectionString: writerUrl.href }) });
    assert.equal(legacy.priceDatasetVersion, undefined);
    const oldPrice = await legacy.regionPrice.findUniqueOrThrow({ where: { id: fixture.regionPriceId } });
    await legacy.regionPrice.update({ where: { id: oldPrice.id }, data: { localPrice: Number(oldPrice.localPrice) + 1 } });
    assert.equal((await latest()).revision, "4"); checks++;

    const stateBefore = (await db.query("SELECT * FROM price_dataset_version_state")).rows;
    const versionBefore = await latest();
    await writer.query("UPDATE region_prices SET last_checked_at=now()");
    assert.deepEqual((await db.query("SELECT * FROM price_dataset_version_state")).rows, stateBefore);
    assert.deepEqual(await latest(), versionBefore); checks++;
    const rowsBefore = await business();
    await db.query("ALTER TABLE price_dataset_versions ADD CONSTRAINT local_failure CHECK(revision<=4)");
    try {
      await writer.query("BEGIN");
      await writer.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [oldPrice.id]);
      await assert.rejects(writer.query("COMMIT"), error => error.code === "23514");
      await writer.query("ROLLBACK");
      assert.deepEqual(await business(), rowsBefore); assert.deepEqual(await latest(), versionBefore); checks++;
    } finally { await db.query("ALTER TABLE price_dataset_versions DROP CONSTRAINT local_failure"); }

    const snapshot = await latest();
    const batch = Date.now();
    await db.query("BEGIN");
    await db.query(`
      WITH extra AS (
        INSERT INTO plans(product_id,slug,name,billing_cycle,status)
        SELECT $1,'version-bench-'||n,'Synthetic version benchmark '||n,'monthly','published'
        FROM generate_series(1,5000) n RETURNING id
      )
      INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,
        billing_platform,status,data_quality,primary_source_id)
      SELECT $1,extra.id,rp.country_id,10,'USD',10,'ios','published','verified',rp.primary_source_id
      FROM extra CROSS JOIN region_prices rp WHERE rp.id=$2
    `, [fixture.productId, fixture.regionPriceId]);
    await db.query("COMMIT"); timing.publish5000Ms = Date.now() - batch;
    assert.equal(BigInt((await latest()).revision), BigInt(snapshot.revision) + 1n); checks++;
    const largeVersion = await latest();
    const state = (await db.query("SELECT * FROM price_dataset_version_state")).rows;
    const fresh = Date.now();
    await writer.query("UPDATE region_prices SET last_checked_at=now()");
    timing.freshness5000Ms = Date.now() - fresh;
    assert.deepEqual(await latest(), largeVersion);
    assert.deepEqual((await db.query("SELECT * FROM price_dataset_version_state")).rows, state); checks++;

    const adminUrl = new URL(url); adminUrl.pathname = "/postgres";
    const admin = new Client({ connectionString: adminUrl.href }); await admin.connect();
    try {
      assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [restoreName])).rowCount, 0);
      await admin.query("CREATE DATABASE " + restoreName); ownedRestore = true;
      run("pg_restore", ["--no-owner", "--exit-on-error", "--dbname", restoreName, dump]);
      const restoredUrl = new URL(url); restoredUrl.pathname = "/" + restoreName;
      const restored = new Client({ connectionString: restoredUrl.href }); await restored.connect();
      try {
        for (const [table, rows] of Object.entries(before)) {
          assert.deepEqual((await restored.query("SELECT * FROM " + table + " ORDER BY id")).rows, rows);
        }
        assert.equal((await restored.query(
          "SELECT to_regclass('public.price_dataset_versions') AS name",
        )).rows[0].name, null);
        backup.restoredBusinessRowsMatch = true; checks++;
      } finally { await restored.end(); }
    } finally {
      if (ownedRestore) { await admin.query("DROP DATABASE " + restoreName); ownedRestore = false; }
      await admin.end();
    }
    console.log(JSON.stringify({
      passed: true, checks, baseline, migrationSha256: sha(sql), timing, backup,
      oldClientAndLegacyApproval: true, historyPreserved: true, existingChecksumsPreserved: true,
      metadataPrivilegesVerified: true, atomicFailuresVerified: true, applicationRollbackKeepsLedger: true,
      syntheticRows: 5000, productionTouched: false,
    }));
  } finally {
    await legacy?.$disconnect(); await writer?.end(); await reader?.end();
    if (createdRoles) for (const role of roles) {
      await db.query("DROP OWNED BY " + role);
      await db.query("DROP ROLE " + role);
    }
    await db.end();
    assert(path.basename(temp).startsWith("geosub-price-upgrade-"));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(clean(error.message)); process.exitCode = 1; });
