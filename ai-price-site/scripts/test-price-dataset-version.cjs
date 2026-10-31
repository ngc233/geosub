const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
const app = path.resolve(__dirname, "..");
const fixture = require("./e2e-fixture.cjs");
const url = new URL(process.env.GEOSUB_VERSION_TEST_DATABASE_URL);
assert(["127.0.0.1", "localhost"].includes(url.hostname));
assert(/^\/geosub_price_version_test_[a-z0-9_]+_e2e$/.test(url.pathname));
const env = { ...process.env, DATABASE_URL: url.href, GEOSUB_SCHEMA_MODE: "complete-schema" };
delete env.PGOPTIONS;
const db = new Client({ connectionString: url.href });
let checks = 0;
const run = file => {
  const result = spawnSync(process.execPath, [file], { cwd: app, env, encoding: "utf8" });
  assert.equal(result.status, 0, file + " failed; no diagnostic credentials emitted");
};

async function main() {
  await db.connect();
  try {
    const exists = (await db.query("SELECT to_regclass('public.products') IS NOT NULL AS exists")).rows[0].exists;
    if (exists) assert.equal((await db.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 0,
      "Refuse an existing populated database");
    run("scripts/migrate-database.cjs");
    run("scripts/seed-e2e.cjs");
    const candidate = fs.readFileSync(path.join(app, "../geosub-backend/sql/schema/060_formal_price_versions.sql"), "utf8");
    const before = (await db.query("SELECT * FROM region_prices ORDER BY id")).rows;
    await db.query(candidate);
    assert.deepEqual((await db.query("SELECT * FROM region_prices ORDER BY id")).rows, before);
    const latest = async () => (await db.query("SELECT * FROM price_dataset_versions ORDER BY revision DESC LIMIT 1")).rows[0];
    const initial = await latest();
    const version = number => (BigInt(initial.revision) + BigInt(number) - 1n).toString();
    assert(BigInt(initial.revision) >= 1n); checks++;
    await db.query(candidate);
    assert.deepEqual(await latest(), initial); checks++;
    const row = (await db.query(
      "SELECT rp.* FROM region_prices rp JOIN products p ON p.id=rp.product_id WHERE p.slug=$1 ORDER BY rp.id LIMIT 1",
      [fixture.productSlug],
    )).rows[0];
    assert(row);
    await db.query("UPDATE region_prices SET last_checked_at=now() WHERE id=$1", [row.id]);
    assert.deepEqual(await latest(), initial); checks++;
    const observation = (await db.query("SELECT * FROM price_observations WHERE id=$1", [fixture.observationId])).rows[0];
    await db.query("UPDATE price_observations SET status='rejected' WHERE id=$1", [observation.id]);
    assert.deepEqual(await latest(), initial); checks++;
    await db.query("BEGIN");
    await db.query("UPDATE region_prices SET local_price=local_price+1,price_usd=price_usd+1 WHERE id=$1", [row.id]);
    assert.deepEqual(await latest(), initial);
    await db.query("ROLLBACK");
    assert.deepEqual(await latest(), initial); checks++;
    await db.query("BEGIN");
    await db.query("UPDATE region_prices SET local_price=local_price+1,price_usd=price_usd+1 WHERE product_id=$1", [row.product_id]);
    await db.query("COMMIT");
    let previous = await latest();
    assert.equal(previous.revision, version(2)); assert.notEqual(previous.fingerprint, initial.fingerprint); checks++;
    await db.query("BEGIN");
    await db.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [row.id]);
    await db.query("UPDATE region_prices SET local_price=local_price-1 WHERE id=$1", [row.id]);
    await db.query("COMMIT");
    assert.deepEqual(await latest(), previous); checks++;
    await db.query("UPDATE products SET description='Synthetic editorial change' WHERE id=$1", [row.product_id]);
    assert.deepEqual(await latest(), previous); checks++;
    await db.query("UPDATE plans SET status='review' WHERE id=$1", [row.plan_id]);
    assert.equal((await latest()).price_count, "0");
    assert.equal((await latest()).revision, version(3)); checks++;
    await db.query("UPDATE plans SET status='published' WHERE id=$1", [row.plan_id]);
    assert.equal((await latest()).revision, version(4)); checks++;
    const targetPlatform = row.billing_platform === "ios" ? "web" : "ios";
    await db.query("UPDATE region_prices SET billing_platform=$2::billing_platform WHERE id=$1", [row.id, targetPlatform]);
    previous = await latest();
    assert.equal(previous.revision, version(5));
    assert.equal(previous[targetPlatform === "ios" ? "ios_count" : "web_count"], "1"); checks++;
    await db.query("UPDATE region_prices SET status='review' WHERE id=$1", [row.id]);
    assert.equal((await latest()).revision, version(6)); checks++;
    await db.query("UPDATE region_prices SET status='published' WHERE id=$1", [row.id]);
    assert.equal((await latest()).revision, version(7)); checks++;
    await db.query("UPDATE price_sources SET base_url='https://example.com/new-source' WHERE id=$1", [row.primary_source_id]);
    assert.equal((await latest()).revision, version(8)); checks++;
    const other = new Client({ connectionString: url.href });
    await other.connect();
    try {
      await db.query(`
        INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,
          billing_platform,status,data_quality,primary_source_id)
        SELECT product_id,plan_id,country_id,local_price,currency,price_usd,
          CASE WHEN billing_platform='ios' THEN 'web'::billing_platform ELSE 'ios'::billing_platform END,
          status,data_quality,primary_source_id FROM region_prices WHERE id=$1
      `, [row.id]);
      assert.equal((await latest()).revision, version(9)); checks++;
      const second = (await db.query("SELECT id FROM region_prices WHERE id<>$1 LIMIT 1", [row.id])).rows[0].id;
      await db.query("BEGIN"); await other.query("BEGIN");
      await db.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [row.id]);
      await other.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [second]);
      await Promise.all([db.query("COMMIT"), other.query("COMMIT")]);
      assert.equal((await latest()).revision, version(11));
      await db.query("SELECT record_formal_price_version()");
      assert.equal((await latest()).revision, version(11)); checks++;
    } finally { await other.end(); }
    const immutable = await latest();
    await db.query("BEGIN");
    await db.query("UPDATE products SET status='review' WHERE id=$1", [row.product_id]);
    await db.query("ROLLBACK");
    assert.deepEqual(await latest(), immutable); checks++;
    await db.query("BEGIN");
    await db.query("SELECT record_formal_price_version()");
    await db.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [row.id]);
    await db.query("COMMIT");
    assert.equal((await latest()).revision, version(12)); checks++;
    const stable = await latest();
    await db.query("BEGIN");
    await db.query("SET CONSTRAINTS ALL IMMEDIATE");
    await db.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [row.id]);
    await db.query("UPDATE region_prices SET local_price=local_price-1 WHERE id=$1", [row.id]);
    await db.query("COMMIT");
    assert.deepEqual(await latest(), stable); checks++;
    await db.query("BEGIN");
    await db.query("SAVEPOINT version_probe");
    await db.query("UPDATE region_prices SET local_price=local_price+10 WHERE id=$1", [row.id]);
    await db.query("ROLLBACK TO SAVEPOINT version_probe");
    await db.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [row.id]);
    await db.query("COMMIT");
    assert.equal((await latest()).revision, version(13)); checks++;
    await db.query("BEGIN");
    await db.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [row.id]);
    await db.query("SET CONSTRAINTS ALL IMMEDIATE");
    await db.query("UPDATE region_prices SET local_price=local_price+1 WHERE id=$1", [row.id]);
    await db.query("COMMIT");
    assert.equal((await latest()).revision, version(14));
    const final = await latest();
    await db.query("SELECT record_formal_price_version()");
    assert.deepEqual(await latest(), final); checks++;
    console.log(JSON.stringify({ passed: true, checks, source: "actual PG transactions",
      baselinePreservesRows: true, concurrentVersions: true, noopDoesNotAdvance: true,
      historicalBackfill: false, productionTouched: false }));
  } finally { await db.end(); }
}
main().catch(error => {
  console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
  process.exitCode = 1;
});
