import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = fileURLToPath(new URL("../", import.meta.url));
export function assertPipelineTestConnection(connection) {
  if (!["localhost", "127.0.0.1"].includes(connection?.host) || Number(connection.port) !== 55433
    || !/^geosub_collector_test_pipeline_[a-z0-9_]+$/.test(connection.database ?? "")) {
    throw Error("isolated_pipeline_database_required");
  }
}
const quote = value => "'" + value.replaceAll("'", "'\''") + "'";

export async function verifyCollectorPipeline(client, databaseUrl) {
  assertPipelineTestConnection(client.connectionParameters);
  const scope = (await client.query("SELECT current_database() AS name")).rows[0].name;
  assert.equal(scope, client.connectionParameters.database);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 0);
  await client.query(await readFile(new URL("../sql/isolated/collector-review-hardening.sql", import.meta.url), "utf8"));
  const product = (await client.query(`INSERT INTO products(slug,name,category,status)
    VALUES('captions','Captions','ai','review') RETURNING id`)).rows[0].id;
  const plans = new Map();
  for (const [slug, name, order] of [["basic", "Captions Basic", 10], ["max", "Captions Max", 20]]) {
    const plan = (await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status,sort_order)
      VALUES($1,$2,$3,'monthly','review',$4) RETURNING id`, [product, slug, name, order])).rows[0].id;
    plans.set(slug, plan);
  }
  const country = (await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
    VALUES('US','美国','United States','USD') RETURNING id`)).rows[0].id;
  const source = (await client.query(`INSERT INTO price_sources(source_key,name,source_level,type,base_url)
    VALUES('apple-app-store','Apple fixture','A','app_store','https://apps.apple.com/') RETURNING id`)).rows[0].id;
  const config = { collector_kind: "app_store", app_store_id: "1541407007", country_codes: ["US"], interval_hours: 12 };
  const jobId = (await client.query(`INSERT INTO collector_jobs
    (product_id,source_id,job_type,schedule,status,next_run_at,job_config)
    VALUES($1,$2,'ai_pricing','daily','active',NOW()+INTERVAL '1 day',$3::jsonb) RETURNING id`,
  [product, source, JSON.stringify(config)])).rows[0].id;
  const root = await mkdtemp(path.join(tmpdir(), "geosub-pipeline-"));
  const cases = [];
  try {
    const bin = path.join(root, "bin"); await mkdir(bin);
    const realPwsh = spawnSync("which", ["pwsh"], { encoding: "utf8" }).stdout.trim(); assert.ok(realPwsh);
    const launcher = fileURLToPath(new URL("./collector-pipeline-fixture.ps1", import.meta.url));
    const shim = '#!/usr/bin/env bash\nset -euo pipefail\nwhile (($#)); do if [[ "$1" == "-File" ]]; then shift; break; fi; shift; done\n'
      + 'exec ' + quote(realPwsh) + ' -NoProfile -NonInteractive -File ' + quote(launcher) + ' "$@"\n';
    await writeFile(path.join(bin, "pwsh"), shim, { mode: 0o700 });
    const emptyEnv = path.join(root, "empty.env"); await writeFile(emptyEnv, "");
    const log = path.join(root, "requests.jsonl"); await writeFile(log, "");
    const cache = path.join(root, "cache");
    const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH,
      DATABASE_URL: databaseUrl, NODE_OPTIONS: "", GEOSUB_FRONTEND_DIR: path.resolve(backend, "../ai-price-site"),
      GEOSUB_BACKEND_DIR: backend, GEOSUB_ENV_FILE: emptyEnv, GEOSUB_COLLECTOR_ENV_FILE: emptyEnv,
      GEOSUB_DB_NAME: scope, GEOSUB_DB_CONTAINER: "pipeline-test-no-fallback", GEOSUB_COLLECTOR_JOB_LIMIT: "1",
      GEOSUB_COLLECTOR_LOCK_DIR: path.join(root, "lock"), GEOSUB_COLLECTOR_LOCK_FILE: path.join(root, "lock/collector.lock"),
      GEOSUB_CONTENT_DISTRIBUTION: "local", GEOSUB_PIPELINE_LOG: log, GEOSUB_PIPELINE_REAL_NODE: process.execPath,
      GEOSUB_APP_STORE_COLLECTION_ENABLED: "true", GEOSUB_APP_STORE_CACHE_DIR: cache,
      GEOSUB_APP_STORE_CACHE_TTL_MINUTES: "0", GEOSUB_APP_STORE_MAX_RETRIES: "0",
      GEOSUB_APP_STORE_REQUEST_DELAY_MS: "250" };
    const requests = async () => (await readFile(log, "utf8")).trim().split("\n").filter(Boolean).length;
    const job = async () => (await client.query("SELECT * FROM collector_jobs WHERE id=$1", [jobId])).rows[0];
    const runs = async () => (await client.query("SELECT * FROM collector_job_runs WHERE job_id=$1 ORDER BY started_at,id", [jobId])).rows;
    const observations = async () => (await client.query("SELECT * FROM price_observations ORDER BY observed_at,id")).rows;
    const prices = async () => (await client.query("SELECT * FROM region_prices ORDER BY plan_id,billing_platform")).rows;
    const due = () => client.query("UPDATE collector_jobs SET next_run_at=NOW()-INTERVAL '1 second' WHERE id=$1", [jobId]);
    async function run(mode = "valid", extra = [], overrides = {}, failure = false, selectedJobId = jobId) {
      const result = await new Promise((resolve, reject) => {
        const child = spawn("bash", [path.join(backend, "deploy/linux-arm64/run-collector-jobs.sh"),
          "-JobId", selectedJobId, "-ProductSlug", "captions", "-CollectorKind", "app_store", ...extra], {
          env: { ...env, GEOSUB_PIPELINE_MODE: mode, ...overrides }, stdio: ["ignore", "pipe", "pipe"],
        });
        let output = ""; const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
        child.stdout.on("data", value => { output += value; }); child.stderr.on("data", value => { output += value; });
        child.once("error", error => { clearTimeout(timer); reject(error); });
        child.once("close", code => { clearTimeout(timer); resolve({ code, output }); });
      });
      const availability = (await client.query("SELECT reason FROM app_store_availability_checks")).rows;
      assert.equal(result.code === 0, !failure, (result.output + JSON.stringify(availability)).replaceAll(databaseUrl, "[redacted]"));
      return result;
    }
    await run(); assert.equal(await requests(), 0); assert.equal((await runs()).length, 0);
    cases.push("future task does not collect");
    await due(); const beforeDry = await job();
    await run("valid", ["-DryRun"]); assert.deepEqual(await job(), beforeDry); assert.equal(await requests(), 0);
    cases.push("canonical dry run leaves task and source untouched");
    await run();
    assert.equal((await observations()).length, 2);
    assert.ok((await observations()).every(row => row.status === "pending"));
    assert.equal((await prices()).length, 0);
    assert.equal((await runs()).at(-1).raw_payload.collection_evidence.observed_count, 2);
    cases.push("shell/runner/actual collector creates two pending observations and records real progress");
    await due(); await run();
    assert.equal((await observations()).length, 2, "ordinary canonical dispatch must not force duplicate fresh observations");
    assert.equal((await runs()).at(-1).raw_payload.skipped, 2);
    cases.push("ordinary fresh HTTP retry respects 12-hour deduplication");
    await due(); await run("valid", ["-Force"]);
    await due(); await run("valid", ["-Force"]);
    assert.equal((await observations()).length, 6);
    assert.equal((await prices()).length, 0, "burst forced samples cannot create independent consensus");
    cases.push("explicit Force retains audit copies but cannot satisfy three independent samples");

    // Deliberate synthetic history: never claim these represent actual elapsed source sampling.
    async function history(hours, selectedPlans = plans.values()) {
      for (const plan of selectedPlans) {
        const current = (await observations()).filter(row => row.plan_id === plan).at(-1);
        const at = new Date(current.observed_at.getTime() - hours * 3_600_000);
        const payload = structuredClone(current.raw_payload);
        payload.raw_snapshot.capturedAt = at.toISOString();
        payload.fixture_history = true;
        await client.query(`INSERT INTO price_observations
          (product_id,plan_id,country_id,source_id,source_level,raw_price,currency,converted_usd,
            observed_at,created_at,updated_at,billing_platform,price_type,status,confidence_score,
            anomaly_flag,anomaly_reason,parser_version,raw_payload)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$9,'ios','list_price','pending',$10,$11,$12,$13,$14)`,
        [product, plan, country, source, current.source_level, current.raw_price, current.currency,
          current.converted_usd, at, current.confidence_score, current.anomaly_flag,
          current.anomaly_reason, current.parser_version, JSON.stringify(payload)]);
      }
    }
    const ios = async () => (await prices()).filter(row => row.billing_platform === "ios");
    async function verifiedPrices(expected) {
      const rows = await ios(); assert.equal(rows.length, 2);
      for (const [slug, amount] of Object.entries(expected)) {
        const row = rows.find(value => value.plan_id === plans.get(slug));
        assert.equal(Number(row.local_price), amount); assert.equal(row.status, "published");
        assert.equal(row.data_quality, "verified");
        const latest = (await observations()).filter(value => value.plan_id === row.plan_id).at(-1);
        assert.equal(row.last_checked_at.toISOString(), latest.observed_at.toISOString());
      }
    }
    await history(25); await history(13); await due(); await run();
    await verifiedPrices({ basic: 9.99, max: 24.99 });
    assert.equal((await runs()).at(-1).raw_payload.collection_evidence.published_price_count, 2);
    cases.push("three synthetic independent times pass real canonical review and publish latest evidence");

    for (const plan of plans.values()) await client.query(`INSERT INTO region_prices
      (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
        primary_source_id,status,data_quality,last_checked_at)
      VALUES($1,$2,$3,99,'USD',99,'web','list_price',$4,'published','verified',NOW())`,
    [product, plan, country, source]);
    const web = (await prices()).filter(row => row.billing_platform === "web");
    await client.query("UPDATE collector_jobs SET status='paused',next_run_at=NOW()-INTERVAL '1 second' WHERE id=$1", [jobId]);
    const pausedJob = await job(), pausedRequests = await requests(), pausedRuns = (await runs()).length;
    await run(); assert.deepEqual(await job(), pausedJob);
    assert.equal(await requests(), pausedRequests); assert.equal((await runs()).length, pausedRuns);
    await client.query("UPDATE collector_jobs SET status='active' WHERE id=$1", [jobId]);
    cases.push("paused canonical task is not collected or rescheduled");

    const cached = { GEOSUB_APP_STORE_CACHE_TTL_MINUTES: "720" };
    await due(); await run("valid", ["-Force"], cached);
    const afterFill = await observations(), fillRequests = await requests(), fillPrices = await ios();
    await due(); await run("valid", ["-Force"], cached);
    assert.equal(await requests(), fillRequests); assert.deepEqual(await observations(), afterFill);
    assert.deepEqual(await ios(), fillPrices);
    assert.equal((await runs()).at(-1).raw_payload.skipped, 2);
    cases.push("canonical cache replay with Force keeps original evidence and makes no HTTP or duplicate observation");

    await due(); const concurrentRuns = (await runs()).length;
    await Promise.all([run("valid", [], cached), run("valid", [], cached)]);
    assert.equal((await runs()).length, concurrentRuns + 1);
    assert.equal(await requests(), fillRequests); assert.deepEqual(await observations(), afterFill);
    cases.push("two canonical shell launches serialize and admit only one due execution");

    await client.query(`UPDATE price_observations SET observed_at=observed_at-INTERVAL '20 days',
      created_at=created_at-INTERVAL '20 days' WHERE billing_platform='ios'`);
    await client.query(`UPDATE region_prices SET last_checked_at=last_checked_at-INTERVAL '20 days'
      WHERE billing_platform='ios'`);
    const beforeRenew = (await observations()).length;
    await due(); await run();
    assert.equal((await observations()).length, beforeRenew + 2);
    await verifiedPrices({ basic: 9.99, max: 24.99 });
    assert.equal((await runs()).at(-1).raw_payload.collection_evidence.published_price_count, 2);
    cases.push("existing exact-price one-sample renewal recovers stale verification dates without changing policy");

    // Move previous history behind the next price-change timeline, not the wall clock.
    await client.query(`UPDATE price_observations SET observed_at=NOW()-INTERVAL '35 hours',
      created_at=NOW()-INTERVAL '35 hours' WHERE billing_platform='ios'`);
    await client.query(`UPDATE region_prices SET last_checked_at=NOW()-INTERVAL '30 hours'
      WHERE billing_platform='ios'`);
    await due(); await run("changed");
    assert.equal(Number((await ios()).find(row => row.plan_id === plans.get("basic")).local_price), 9.99);
    assert.ok((await observations()).slice(-2).every(row => row.status === "pending"));
    cases.push("new prices remain pending and preserve formal amounts after only one independent sample");
    await history(25); await history(13); await due(); await run("changed");
    await verifiedPrices({ basic: 11.99, max: 29.99 });
    cases.push("new prices publish only after three synthetic independent samples in the actual pipeline");

    const beforeFailure = await observations(), failurePrices = await ios();
    await due(); await run("http503", [], {}, true);
    const failedJob = await job(), failedRun = (await runs()).at(-1);
    assert.equal(failedJob.status, "active"); assert.equal(failedJob.error_count, 1);
    assert.equal(failedJob.job_config.operational_state, "app_store_transient_retry");
    // Existing single-country configs may serialize as a scalar; Get-CountryCodes accepts both.
    assert.deepEqual([].concat(failedJob.job_config.retry_country_codes), ["US"]);
    assert.ok(Math.abs(failedJob.next_run_at.getTime() - Date.now() - 30 * 60_000) < 30_000);
    assert.equal(failedRun.status, "failed"); assert.deepEqual(await observations(), beforeFailure);
    assert.deepEqual(await ios(), failurePrices);
    const failureRequests = await requests(); await run("changed");
    assert.equal(await requests(), failureRequests);
    cases.push("HTTP and renderer 503 record real failure, preserve prices and schedule a 30-minute scoped retry");
    await due(); await run("changed");
    const recovered = await job();
    assert.equal(recovered.error_count, 0); assert.equal(recovered.last_error, null);
    assert.equal(recovered.job_config.operational_state, undefined);
    assert.equal(recovered.job_config.retry_country_codes, undefined);
    assert.equal((await runs()).at(-1).status, "succeeded");
    cases.push("next due successful collection clears transient failure state automatically");

    await due(); await run("anomaly");
    const latestBasic = (await observations()).filter(row => row.plan_id === plans.get("basic")).at(-1);
    assert.equal(latestBasic.anomaly_flag, true); assert.equal(latestBasic.status, "pending");
    assert.equal(Number((await ios()).find(row => row.plan_id === plans.get("basic")).local_price), 11.99);
    const anomalyEvidence = (await runs()).at(-1).raw_payload.collection_evidence;
    assert.ok(anomalyEvidence.anomaly_count > 0);
    assert.equal((await runs()).at(-1).raw_payload.repair_outcome, "isolated_unresolved");
    cases.push("same-period conflicting prices stay anomalous and never become an approved replacement");
    const beforeCleanRecovery = (await observations()).length;
    await due(); await run("changed");
    const cleanBasic = (await observations()).filter(row => row.plan_id === plans.get("basic")).at(-1);
    assert.equal((await observations()).length, beforeCleanRecovery + 1);
    assert.equal(cleanBasic.anomaly_flag, false);
    assert.ok(cleanBasic.observed_at > latestBasic.observed_at);
    assert.equal((await ios()).find(row => row.plan_id === plans.get("basic")).last_checked_at.toISOString(),
      cleanBasic.observed_at.toISOString());
    cases.push("clean recovery after a transient conflict is retained and existing exact-price renewal uses the new evidence");

    // New synthetic timeline: three independent ambiguities newer than the last formal check.
    await client.query(`UPDATE price_observations SET observed_at=NOW()-INTERVAL '35 hours',
      created_at=NOW()-INTERVAL '35 hours' WHERE billing_platform='ios'`);
    await client.query(`UPDATE region_prices SET last_checked_at=NOW()-INTERVAL '30 hours'
      WHERE billing_platform='ios'`);
    await due(); await run("anomaly");
    await history(25, [plans.get("basic")]); await history(13, [plans.get("basic")]);
    await due(); await run("anomaly");
    const isolated = (await ios()).find(row => row.plan_id === plans.get("basic"));
    assert.equal(isolated.status, "review"); assert.equal(isolated.data_quality, "pending_review");
    cases.push("three synthetic recurring identity conflicts trigger the real canonical quarantine");

    await due(); await run("changed");
    await due(); await run("changed", ["-Force"]);
    const held = (await ios()).find(row => row.plan_id === plans.get("basic"));
    assert.equal(held.status, "review"); assert.equal(held.last_checked_at.toISOString(), isolated.last_checked_at.toISOString());
    assert.equal((await observations()).filter(row => row.plan_id === plans.get("basic")).at(-1).status, "pending");
    cases.push("one post-quarantine clean time plus a forced burst cannot reuse evidence before the anomaly");

    // Advance only disposable evidence history; no real waiting and no production clock changes.
    await client.query(`UPDATE price_observations SET observed_at=observed_at-INTERVAL '13 hours',
      created_at=created_at-INTERVAL '13 hours' WHERE billing_platform='ios'`);
    await client.query(`UPDATE region_prices SET last_checked_at=last_checked_at-INTERVAL '13 hours'
      WHERE billing_platform='ios'`);
    await due(); await run("changed");
    await verifiedPrices({ basic: 11.99, max: 29.99 });
    const recoveredBasic = (await observations()).filter(row => row.plan_id === plans.get("basic")).at(-1);
    assert.equal(recoveredBasic.status, "approved");
    assert.equal(recoveredBasic.raw_payload.auto_review_reason_code, "app_store_clean_pair_after_rule_fix");
    assert.ok((await observations()).filter(row => row.anomaly_flag).every(row => row.status !== "approved"));
    assert.equal((await runs()).at(-1).raw_payload.collection_evidence.published_price_count, 2);
    cases.push("existing two-clean independent recovery automatically republishes quarantined prices at the latest source time");
    // A deliberately unregistered legacy item must never trigger an anomaly-repair request.
    const legacy = (await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
      VALUES($1,'legacy-credit-pack','Legacy credit pack','monthly','review') RETURNING id`, [product])).rows[0].id;
    await client.query(`INSERT INTO price_observations
      (product_id,plan_id,country_id,source_id,source_level,raw_price,currency,converted_usd,
        observed_at,billing_platform,price_type,status,confidence_score,anomaly_flag,raw_payload)
      VALUES($1,$2,$3,$4,'A',10,'USD',10,NOW(),'ios','list_price','pending',90,FALSE,
        '{"auto_review_reason_code":"waiting_for_more_app_store_samples","fixture_history":true}')`,
    [product, legacy, country, source]);
    const watch = (await client.query(`SELECT id FROM collector_jobs
      WHERE product_id=$1 AND schedule='anomaly_watch' ORDER BY created_at,id LIMIT 1`, [product])).rows[0];
    assert.ok(watch, "canonical queue should already have created the anomaly recheck job");
    await client.query(`UPDATE collector_jobs SET status='active',next_run_at=NOW()-INTERVAL '1 second'
      WHERE id=$1`, [watch.id]);
    const heldRequests = await requests(), heldObservations = await observations();
    await run("changed", [], {}, false, watch.id);
    assert.equal(await requests(), heldRequests); assert.deepEqual(await observations(), heldObservations);
    const policyHold = (await client.query(`SELECT * FROM collector_job_runs WHERE job_id=$1
      ORDER BY started_at DESC,id DESC LIMIT 1`, [watch.id])).rows[0];
    const heldJob = (await client.query("SELECT * FROM collector_jobs WHERE id=$1", [watch.id])).rows[0];
    assert.equal(policyHold.status, "skipped");
    assert.equal(heldJob.status, "paused"); assert.equal(heldJob.next_run_at, null);
    assert.equal(policyHold.raw_payload.repair_resolution.state, "unresolved");
    assert.equal(policyHold.raw_payload.repair_resolution.target_count, 1);
    assert.equal([].concat(policyHold.raw_payload.repair_plan.targets)[0].action, "repair_plan_mapping");
    cases.push("canonical anomaly repair skips an unregistered legacy item with no HTTP or observations and keeps its issue unresolved");
    assert.deepEqual((await prices()).filter(row => row.billing_platform === "web"), web);
    assert.equal((await job()).id, jobId);
    assert.equal((await job()).job_config.app_store_id, config.app_store_id);
    assert.deepEqual((await job()).job_config.country_codes, config.country_codes);
    cases.push("Web formal rows and original task identity/scope remain unchanged");
    return { passed: true, case_count: cases.length, cases,
      scope: "canonical shell and runner, real collector/database/reviewer with fixed HTTP doubles",
      synthetic_source_history: true, live_http_verified: false, browser_executed: false,
      existing_database_mutations: false, production_activation: false };
  } finally { assert.equal(path.dirname(root), tmpdir()); await rm(root, { recursive: true, force: true }); }
}
