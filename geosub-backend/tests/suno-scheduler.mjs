import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSunoTestDatabase } from "./suno-scheduler-fixture.mjs";
import { ensureSource, loadDatabaseContext } from "../scripts/collect-official-web-prices.mjs";

const backend = fileURLToPath(new URL("../", import.meta.url));

export async function verifySunoScheduler(client, databaseUrl) {
  const url = assertSunoTestDatabase(databaseUrl);
  assert.equal(client.connectionParameters.host, url.hostname);
  assert.equal(Number(client.connectionParameters.port), 55433);
  const scope = (await client.query("SELECT current_database() AS name")).rows[0].name;
  assert.equal("/" + scope, url.pathname);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 0);
  const registry = JSON.parse(await readFile(new URL("../data/official-web-price-sources.json", import.meta.url), "utf8"));
  const source = registry.sources["suno-us-monthly"];
  assert.equal(source.auto_review, undefined);
  const product = (await client.query(`INSERT INTO products(slug,name,category,status)
    VALUES('suno','Suno local fixture','ai','review') RETURNING id`)).rows[0];
  await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
    VALUES($1,'pro','Pro','monthly','review')`, [product.id]);
  await assert.rejects(loadDatabaseContext(client, source, ["US"]), /missing_canonical_plans:premier-plan/);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM plans")).rows[0].n, 1);
  await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
    VALUES($1,'premier-plan','Premier Plan','monthly','review')`, [product.id]);
  await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
    VALUES('US','美国','United States','USD')`);
  const database = await loadDatabaseContext(client, source, ["US"]);
  const sourceId = await ensureSource(client, source);
  for (const plan of database.plans.values()) {
    for (const [platform, price] of [["web", 19], ["ios", 99]]) {
      await client.query(`INSERT INTO region_prices
        (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
          primary_source_id,status,data_quality,last_checked_at)
        VALUES($1,$2,$3,$4,'USD',$4,$5,'list_price',$6,'published','verified',NOW() - INTERVAL '2 days')`,
      [product.id, plan.id, database.countries.get("US").id, price, platform, sourceId]);
    }
  }
  const preserved = async () => ({
    prices: (await client.query("SELECT * FROM region_prices ORDER BY plan_id,billing_platform")).rows,
    products: (await client.query("SELECT * FROM products ORDER BY id")).rows,
    plans: (await client.query("SELECT * FROM plans ORDER BY id")).rows,
  });
  const original = await preserved();
  const config = { collector_kind: "pricing_page", official_web_source_key: "suno-us-monthly",
    country_codes: ["US"], interval_hours: 12 };
  const jobId = (await client.query(`INSERT INTO collector_jobs
    (product_id,source_id,job_type,schedule,status,next_run_at,job_config)
    VALUES($1,$2,'ai_pricing','daily','active',NOW(),$3::jsonb) RETURNING id`,
  [product.id, sourceId, JSON.stringify(config)])).rows[0].id;
  const root = await mkdtemp(path.join(tmpdir(), "geosub-suno-scheduler-"));
  const log = path.join(root, "fetch.jsonl");
  const emptyEnv = path.join(root, "empty.env");
  await writeFile(log, ""); await writeFile(emptyEnv, "");
  const env = {
    ...process.env, DATABASE_URL: databaseUrl,
    NODE_OPTIONS: "--import=" + fileURLToPath(new URL("./suno-scheduler-fixture.mjs", import.meta.url)),
    GEOSUB_FRONTEND_DIR: path.resolve(backend, "../ai-price-site"), GEOSUB_BACKEND_DIR: backend,
    GEOSUB_ENV_FILE: emptyEnv, GEOSUB_COLLECTOR_ENV_FILE: emptyEnv,
    GEOSUB_DB_NAME: scope, GEOSUB_DB_CONTAINER: "suno-test-no-fallback",
    GEOSUB_COLLECTOR_JOB_LIMIT: "1", GEOSUB_COLLECTOR_LOCK_DIR: path.join(root, "lock"),
    GEOSUB_COLLECTOR_LOCK_FILE: path.join(root, "lock/collector.lock"),
    GEOSUB_CONTENT_DISTRIBUTION: "local", GEOSUB_SUNO_FIXTURE: "1", GEOSUB_SUNO_LOG: log,
  };
  const observations = async () => (await client.query("SELECT * FROM price_observations ORDER BY plan_id")).rows;
  const job = async () => (await client.query("SELECT * FROM collector_jobs WHERE id=$1", [jobId])).rows[0];
  const runs = async () => (await client.query("SELECT * FROM collector_job_runs ORDER BY started_at,id")).rows;
  const requests = async () => (await readFile(log, "utf8")).trim().split("\n").filter(Boolean).length;
  const due = () => client.query("UPDATE collector_jobs SET next_run_at=NOW() - INTERVAL '1 second' WHERE id=$1", [jobId]);
  async function run(mode = "valid", extra = [], failure = false) {
    const result = await new Promise((resolve, reject) => {
      const child = spawn("bash", [path.join(backend, "deploy/linux-arm64/run-collector-jobs.sh"),
        "-ProductSlug", "suno", "-CollectorKind", "pricing_page", ...extra], {
        env: { ...env, GEOSUB_SUNO_MODE: mode }, stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), 45_000);
      child.stdout.on("data", value => { output += value; });
      child.stderr.on("data", value => { output += value; });
      child.once("error", error => { clearTimeout(timer); reject(error); });
      child.once("close", code => { clearTimeout(timer); resolve({ code, output }); });
    });
    assert.equal(result.code === 0, !failure, result.output.replaceAll(databaseUrl, "[redacted]"));
  }
  const cases = ["missing canonical plan rejected without creating catalog entries"];
  try {
    const beforeDry = await job();
    await run("valid", ["-DryRun"]);
    assert.deepEqual(await job(), beforeDry); assert.equal(await requests(), 0);
    cases.push("dry run does not fetch or mutate task data");
    await run();
    const first = await observations();
    assert.equal(first.length, 2);
    assert.ok(first.every(row => row.status === "pending" && row.billing_platform === "web"
      && row.raw_payload.publication_eligible === false && row.converted_usd === null));
    assert.deepEqual(first.map(row => [database.plans.get("pro").id === row.plan_id ? "pro" : "premier-plan",
      Number(row.raw_price)]).sort(), [["premier-plan", 30], ["pro", 10]]);
    const evidence = (await client.query("SELECT * FROM source_evidence")).rows;
    assert.equal(evidence.length, 2);
    assert.ok(evidence.every(row => row.country_context === "US" && /^[a-f0-9]{64}$/.test(row.content_hash)));
    assert.equal((await runs()).at(-1).raw_payload.published_price_count, 0);
    cases.push("canonical shell/PowerShell/CLI collects two pending Web observations with evidence");
    await run(); assert.equal(await requests(), 1);
    await due(); await run();
    assert.deepEqual(await observations(), first);
    assert.equal((await runs()).at(-1).raw_payload.skipped_observation_count, 2);
    cases.push("schedule and same-day deduplication preserve observation identities");
    const retryMinutes = [];
    for (const [index, mode] of ["http503", "annual", "wrong-country"].entries()) {
      await due(); await run(mode, [], true);
      const failed = await job();
      const last = (await runs()).at(-1);
      assert.equal(failed.status, "active"); assert.equal(failed.error_count, index + 1);
      assert.equal(last.status, "failed");
      const minutes = Math.round((new Date(failed.next_run_at) - new Date(last.finished_at)) / 60_000);
      assert.equal(minutes, [30, 120, 360][index]); retryMinutes.push(minutes);
      assert.deepEqual(await observations(), first); assert.deepEqual(await preserved(), original);
    }
    cases.push("503, annual-only and wrong-region failures retain prices and use canonical retries");
    await due(); await run();
    assert.equal((await job()).error_count, 0);
    assert.equal((await runs()).at(-1).status, "succeeded");
    assert.deepEqual(await observations(), first); assert.deepEqual(await preserved(), original);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM collector_jobs")).rows[0].n, 1);
    const beforePause = await requests();
    await client.query("UPDATE collector_jobs SET status='paused',next_run_at=NOW() WHERE id=$1", [jobId]);
    await run(); assert.equal(await requests(), beforePause);
    cases.push("successful retry resets errors; paused task does not collect");
    cases.push("formal Web/iOS prices, product/plan lifecycle and task identity remain unchanged");
    return { passed: true, cases, retry_minutes: retryMinutes, observation_count: first.length,
      evidence_count: evidence.length, formal_price_updates: 0, http_fixture_requests: await requests(),
      source: "synthetic public HTML fixtures; disposable local schema-only database" };
  } finally {
    assert.equal(path.dirname(root), tmpdir());
    await rm(root, { recursive: true, force: true });
  }
}
