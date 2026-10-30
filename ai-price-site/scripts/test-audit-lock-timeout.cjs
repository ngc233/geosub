/* Standalone psql matches the production SQL runner's transaction boundaries. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");

const url = new URL(process.env.DATABASE_URL);
assert(["127.0.0.1", "localhost"].includes(url.hostname));
assert(/^\/geosub_release_\d{8}$/.test(url.pathname));
const schema = "audit_lock_" + randomUUID().replaceAll("-", "");
const sql = fs.readFileSync(
  path.join(__dirname, "../../geosub-backend/sql/schema/059_audit_actor_compatibility.sql"),
  "utf8",
).replaceAll("public.", schema + ".");
const environment = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: url.pathname.slice(1),
  PGOPTIONS: "-c statement_timeout=9000",
};
function execute(input) {
  return spawnSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"], {
    env: environment,
    input,
    encoding: "utf8",
    timeout: 12000,
  });
}

(async () => {
  const db = new Client({ connectionString: url.href });
  const holder = new Client({ connectionString: url.href });
  await db.connect();
  await holder.connect();
  let created = false;
  try {
    await db.query(`CREATE SCHEMA ${schema}`);
    created = true;
    await db.query(`CREATE TABLE ${schema}.admin_users(id uuid PRIMARY KEY)`);
    await db.query(`CREATE TABLE ${schema}.audit_logs(id integer PRIMARY KEY, actor text)`);
    await db.query(`INSERT INTO ${schema}.audit_logs VALUES(1, 'synthetic history')`);
    await holder.query("BEGIN");
    await holder.query(`LOCK TABLE ${schema}.audit_logs IN ACCESS EXCLUSIVE MODE`);
    const started = Date.now();
    const blocked = execute(sql);
    const elapsedMs = Date.now() - started;
    const sqlstate = blocked.stderr.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1] || null;
    console.log(JSON.stringify({ standalonePsql: true, sqlstate, elapsedMs }));
    assert.notEqual(blocked.status, 0);
    assert.equal(sqlstate, "55P03", "The migration must hit its own lock timeout before statement_timeout");
    assert(elapsedMs >= 4000 && elapsedMs < 8500, "Expected the configured five-second lock timeout");
    await holder.query("ROLLBACK");
    const columns = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='audit_logs'",
      [schema],
    );
    assert(!columns.rows.some(row => row.column_name === "actor_id"), "Failed migration must remain atomic");
    const unblocked = execute(sql + "\nSHOW lock_timeout;\n");
    assert.equal(unblocked.status, 0, "The same migration must succeed once the lock is released");
    assert.equal(unblocked.stdout.trim(), "0", "Local timeout must not leak into the next statement");
    assert.deepEqual((await db.query(`SELECT id, actor FROM ${schema}.audit_logs`)).rows, [
      { id: 1, actor: "synthetic history" },
    ]);
    console.log("PASS: standalone lock timeout, atomic failure, retry, unchanged history and scoped timeout");
  } finally {
    await holder.query("ROLLBACK");
    await holder.end();
    if (created) await db.query(`DROP SCHEMA ${schema} CASCADE`);
    await db.end();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
