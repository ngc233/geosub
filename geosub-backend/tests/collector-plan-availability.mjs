import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSamplingTestConnection } from "./collector-sampling.mjs";

export async function verifyPlanAvailability(client, databaseUrl) {
  assertSamplingTestConnection(client.connectionParameters);
  const root = await mkdtemp(path.join(tmpdir(), "geosub-plan-availability-"));
  const cases = [];
  try {
    const country = (await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
      VALUES('US','美国','United States','USD') RETURNING id`)).rows[0].id;
    const product = (await client.query(`INSERT INTO products(slug,name,category,status)
      VALUES('kimi','Synthetic availability fixture','ai','review') RETURNING id`)).rows[0].id;
    const plan = (await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
      VALUES($1,'moderato','Moderato','monthly','review') RETURNING id`, [product])).rows[0].id;
    const base = { product_id: product, plan_id: plan, country_id: country, availability: true };
    const time = hours => new Date(Date.now() - hours * 3_600_000).toISOString();
    const first = time(20), second = time(19), third = time(18), found = time(17);
    async function write(writes, fail = false) {
      const input = path.join(root, "writes.json");
      await writeFile(input, JSON.stringify(writes.map(w => ({ ...base, ...w }))), { mode: 0o600 });
      const script = fileURLToPath(new URL("./collector-sampling.ps1", import.meta.url));
      const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", script, "-WritesPath", input], {
        env: { ...process.env, DATABASE_URL: databaseUrl, NODE_OPTIONS: "" }, encoding: "utf8", timeout: 30_000,
      });
      if (fail) assert.notEqual(result.status, 0);
      else assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    const row = async () => (await client.query(`SELECT *, checked_at::text AS evidence_time
      FROM app_store_plan_availability_checks WHERE plan_id=$1`, [plan])).rows[0];
    const check = async (name, run) => { await run(); cases.push(name); };
    await check("three public misses do not confirm absence", async () => {
      await write([first, second, third].map(captured_at => ({ captured_at, found: false })));
      assert.equal((await row()).status, "pending_absence");
      assert.equal((await row()).consecutive_missing_count, 3);
      assert.equal(new Date((await row()).evidence_time).toISOString(), third);
    });
    await check("same captured page is not another miss", async () => {
      const before = await row(); await write([{ captured_at: third, found: false }]);
      assert.deepEqual(await row(), before);
    });
    await check("older page cannot replace newer presence", async () => {
      await write([{ captured_at: found, found: true }]);
      const before = await row(); await write([{ captured_at: third, found: false }]);
      assert.deepEqual(await row(), before);
      assert.equal(before.status, "available"); assert.equal(before.consecutive_missing_count, 0);
    });
    await check("equal-time negative parse cannot erase presence", async () => {
      const before = await row(); await write([{ captured_at: found, found: false }]);
      assert.deepEqual(await row(), before);
    });
    await check("equal-time parser recovery may establish presence", async () => {
      const current = time(16);
      await write([{ captured_at: current, found: false }, { captured_at: current, found: true }]);
      assert.equal((await row()).status, "available");
      assert.equal(new Date((await row()).last_seen_at).toISOString(), current);
    });
    await check("ten distinct public misses remain unconfirmed", async () => {
      await write(Array.from({ length: 10 }, (_, n) => ({ captured_at: time(15 - n), found: false })));
      assert.equal((await row()).status, "pending_absence");
      assert.equal((await row()).consecutive_missing_count, 10);
    });
    await check("missing and future source times rejected without writes", async () => {
      const before = await row();
      await write([{ found: false }], true);
      await write([{ captured_at: time(-1), found: false }], true);
      assert.deepEqual(await row(), before);
    });
    await check("dry run leaves availability unchanged", async () => {
      const before = await row();
      await write([{ captured_at: time(1), found: true, dry_run: true }]);
      assert.deepEqual(await row(), before);
    });
    const source = (await client.query(`INSERT INTO price_sources(source_key,name,source_level,type)
      VALUES('availability-fixture','Synthetic App Store fixture','A','app_store') RETURNING id`)).rows[0].id;
    await client.query(`INSERT INTO price_observations(product_id,plan_id,country_id,source_id,source_level,
      raw_price,currency,converted_usd,observed_at,billing_platform,price_type,status,anomaly_flag,confidence_score)
      VALUES($1,$2,$3,$4,'A',10,'USD',10,NOW()-INTERVAL '2 days','ios','list_price','pending',false,90)`,
    [product, plan, country, source]);
    const queryFile = path.join(root, "repair.sql"), issuesFile = path.join(root, "issues.json");
    const policy = fileURLToPath(new URL("./collector-repair-policy.ps1", import.meta.url));
    async function queryIssues() {
      const capture = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", policy, "-QueryOutputPath", queryFile], {
        encoding: "utf8", timeout: 30_000,
      });
      assert.equal(capture.status, 0, capture.stdout + capture.stderr);
      const sql = (await readFile(queryFile, "utf8")).replaceAll("11111111-1111-4111-8111-111111111111", product);
      return (await client.query(sql)).rows[0].coalesce;
    }
    async function action(issues) {
      await writeFile(issuesFile, JSON.stringify(issues), { mode: 0o600 });
      const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", policy, "-IssuesInputPath", issuesFile], {
        encoding: "utf8", timeout: 30_000,
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const line = result.stdout.split("\n").find(value => value.startsWith("GEOSUB_HISTORY_ACTIONS="));
      return JSON.parse(line.slice(line.indexOf("=") + 1))[0].action;
    }
    await check("actual repair SQL routes public omission to source verification", async () => {
      const issues = await queryIssues(); assert.equal(issues.length, 1);
      assert.equal(issues[0].public_plan_not_shown, true);
      assert.equal(await action(issues), "verify_source_visibility");
      await write([{ captured_at: time(1), found: true }]);
      const recovered = await queryIssues(); assert.equal(recovered[0].public_plan_not_shown, false);
      assert.equal(await action(recovered), "collect_independent_evidence");
    });
    await check("legacy absence flag still requires source verification", async () => {
      await client.query("UPDATE app_store_plan_availability_checks SET status='confirmed_absent' WHERE plan_id=$1", [plan]);
      const issues = await queryIssues();
      assert.equal(issues[0].public_plan_not_shown, true);
      assert.equal(await action(issues), "verify_source_visibility");
      await client.query("UPDATE app_store_plan_availability_checks SET checked_at=NOW()-INTERVAL '3 days' WHERE plan_id=$1", [plan]);
      assert.equal((await queryIssues())[0].public_plan_not_shown, false);
    });
    const price = (await client.query(`INSERT INTO region_prices
      (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
        primary_source_id,status,data_quality,last_checked_at)
      VALUES($1,$2,$3,10,'USD',10,'ios','list_price',$4,'published','verified',NOW()-INTERVAL '20 days') RETURNING id`,
    [product, plan, country, source])).rows[0].id;
    const job = (await client.query(`INSERT INTO collector_jobs
      (product_id,source_id,job_type,schedule,status,next_run_at,job_config)
      VALUES($1,$2,'ai_pricing','stale_refresh','active',NOW(),
        '{"country_codes":["US"],"stale_success_count":0}') RETURNING id`, [product, source])).rows[0].id;
    await client.query(`UPDATE app_store_plan_availability_checks SET status='confirmed_absent',
      checked_at=NOW()-INTERVAL '1 hour',consecutive_missing_count=3 WHERE plan_id=$1`, [plan]);
    await check("original quarantine prematurely hides stale price on legacy plan flag", async () => {
      await client.query("BEGIN");
      try {
        assert.equal((await client.query("SELECT quarantine_unconfirmed_stale_app_store_prices(14,3) AS n")).rows[0].n, 1);
      } finally { await client.query("ROLLBACK"); }
    });
    const candidate = await readFile(new URL("../sql/isolated/collector-availability-hardening.sql", import.meta.url), "utf8");
    await client.query(candidate);
    await check("candidate ignores legacy plan flag before retry budget", async () => {
      assert.equal((await client.query("SELECT quarantine_unconfirmed_stale_app_store_prices(14,3) AS n")).rows[0].n, 0);
    });
    await check("three successful stale rechecks still quarantine without claiming absence", async () => {
      await client.query(`UPDATE collector_jobs SET job_config=job_config || '{"stale_success_count":3}' WHERE id=$1`, [job]);
      assert.equal((await client.query("SELECT quarantine_unconfirmed_stale_app_store_prices(14,3) AS n")).rows[0].n, 1);
      const result = (await client.query("SELECT * FROM region_prices WHERE id=$1", [price])).rows[0];
      assert.equal(result.status, "review"); assert.equal(result.data_quality, "pending_review");
      assert.match(result.source_summary, /remained unconfirmed after 3/);
      assert.doesNotMatch(result.source_summary, /no longer offered/);
    });
    await check("fresh price remains published despite missing plan flag and exhausted budget", async () => {
      await client.query("UPDATE region_prices SET status='published',last_checked_at=NOW() WHERE id=$1", [price]);
      assert.equal((await client.query("SELECT quarantine_unconfirmed_stale_app_store_prices(14,3) AS n")).rows[0].n, 0);
    });
    return { passed: true, synthetic_history: true, candidate_installed_existing_database: false, cases };
  } finally { await rm(root, { recursive: true, force: true }); }
}
