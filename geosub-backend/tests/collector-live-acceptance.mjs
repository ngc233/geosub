import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile, mkdtemp, mkdir, utimes, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { assertHistoryReplayConnection, replayCollectorHistory } from "./collector-history-replay.mjs";

const backend = fileURLToPath(new URL("../", import.meta.url));
const selection = [
  { product: "runwayml", plan: "unlimited", country: "US", app: "1665024375" },
  { product: "heygen", plan: "pro-1500", country: "CH", app: "6711356409" },
  { product: "invideo-ai", plan: "generative", country: "ID", app: "6471394316" },
  { product: "kimi", plan: "vivace", country: "VN", app: "6474233312" },
];
export function assertLiveAcceptanceConnection(connection) {
  if (!["localhost", "127.0.0.1"].includes(connection?.host) || Number(connection.port) !== 55433
    || !/^geosub_collector_test_replay_live_[a-z0-9_]+$/.test(connection?.database ?? "")) {
    throw Error("isolated_live_acceptance_required");
  }
}
const quote = value => "'" + value.replaceAll("'", "'\''") + "'";

export async function verifyLiveCollectorSample(source, target, databaseUrl, outputDirectory, { acquisitionDirectory } = {}) {
  assertHistoryReplayConnection(source.connectionParameters, true);
  assertLiveAcceptanceConnection(target.connectionParameters);
  if (process.platform !== "linux") throw Error("Linux canonical launcher required");
  const history = await replayCollectorHistory(source, target);
  assert.equal(history.candidate.issues.unresolved, 621, "expected local snapshot baseline");
  await target.query(await readFile(new URL("../sql/isolated/collector-review-hardening.sql", import.meta.url), "utf8"));
  await target.query("SELECT refresh_matching_app_store_prices(); SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14)");
  const root = await mkdtemp(path.join(tmpdir(), "geosub-live-acceptance-"));
  const results = [];
  try {
    const bin = path.join(root, "bin"); await mkdir(bin);
    const pwsh = spawnSync("which", ["pwsh"], { encoding: "utf8" }).stdout.trim(); assert.ok(pwsh);
    const launcher = fileURLToPath(new URL("./collector-live-acceptance.ps1", import.meta.url));
    const shim = '#!/usr/bin/env bash\nset -euo pipefail\nwhile (($#)); do if [[ "$1" == "-File" ]]; then shift; break; fi; shift; done\n'
      + 'exec ' + quote(pwsh) + ' -NoProfile -NonInteractive -File ' + quote(launcher) + ' "$@"\n';
    await writeFile(path.join(bin, "pwsh"), shim, { mode: 0o700 });
    const emptyEnv = path.join(root, "empty.env"); await writeFile(emptyEnv, "");
    const networkLog = path.join(root, "network.jsonl"); await writeFile(networkLog, "");
    const cacheDirectory = path.join(root, "cache"); await mkdir(cacheDirectory);
    const env = { ...process.env, NODE_OPTIONS: "", PATH: bin + path.delimiter + process.env.PATH,
      DATABASE_URL: databaseUrl, GEOSUB_FRONTEND_DIR: path.resolve(backend, "../ai-price-site"),
      GEOSUB_BACKEND_DIR: backend, GEOSUB_ENV_FILE: emptyEnv, GEOSUB_COLLECTOR_ENV_FILE: emptyEnv,
      GEOSUB_DB_NAME: target.connectionParameters.database, GEOSUB_DB_CONTAINER: "live-acceptance-no-fallback",
      GEOSUB_COLLECTOR_JOB_LIMIT: "1", GEOSUB_CONTENT_DISTRIBUTION: "local",
      GEOSUB_COLLECTOR_LOCK_DIR: path.join(root, "lock"), GEOSUB_COLLECTOR_LOCK_FILE: path.join(root, "lock/collector.lock"),
      GEOSUB_APP_STORE_COLLECTION_ENABLED: "true", GEOSUB_APP_STORE_CACHE_DIR: cacheDirectory,
      GEOSUB_APP_STORE_CACHE_TTL_MINUTES: "720",
      GEOSUB_APP_STORE_MAX_RETRIES: "0", GEOSUB_LIVE_REAL_NODE: process.execPath, GEOSUB_LIVE_NETWORK_LOG: networkLog };
    const beforeIds = new Set((await target.query("SELECT id FROM price_observations")).rows.map(row => row.id));
    const beforeWeb = (await target.query("SELECT * FROM region_prices WHERE billing_platform='web' ORDER BY id")).rows;
    const oldPrices = (await target.query(`SELECT product.slug AS product,plan.slug AS plan,country.code AS country,
      price.status::text,price.last_checked_at FROM region_prices price JOIN products product ON product.id=price.product_id
      JOIN plans plan ON plan.id=price.plan_id JOIN countries country ON country.id=price.country_id
      WHERE price.billing_platform='ios'`)).rows;
    const beforeLive = new Map(oldPrices.map(row => [[row.product,row.plan,row.country].join(":"), row]));
    const sourceId = (await target.query("SELECT id FROM price_sources WHERE source_key='apple-app-store'")).rows[0].id;
    async function issue(item, productId) {
      const rows = Object.values((await target.query(history.queries.actual_runner_issue_query, [productId, [item.country]])).rows[0])[0];
      const found = rows.find(row => row.plan_slug === item.plan); assert.ok(found);
      return { resolved: found.resolved, reason_code: found.reason_code, anomaly_reason: found.anomaly_reason };
    }
    for (const item of selection) {
      const context = (await target.query(`SELECT product.id AS product_id,plan.id AS plan_id,country.id AS country_id,country.currency
        FROM products product JOIN plans plan ON plan.product_id=product.id CROSS JOIN countries country
        WHERE product.slug=$1 AND plan.slug=$2 AND country.code=$3`, [item.product, item.plan, item.country])).rows[0];
      assert.ok(context);
      const beforeIssue = await issue(item, context.product_id); assert.equal(beforeIssue.resolved, false);
      const config = { collector_kind: "app_store", app_store_id: item.app, country_codes: [item.country], interval_hours: 12 };
      const job = (await target.query(`INSERT INTO collector_jobs
        (product_id,source_id,job_type,schedule,status,next_run_at,job_config)
        VALUES($1,$2,'ai_pricing','anomaly_watch','active',NOW()-INTERVAL '1 second',$3) RETURNING id`,
      [context.product_id, sourceId, JSON.stringify(config)])).rows[0].id;
      let receipt;
      if (acquisitionDirectory) {
        const name = item.product + "-" + item.country;
        receipt = JSON.parse(await readFile(path.join(acquisitionDirectory, name + "-receipt.json"), "utf8"));
        const final = new URL(receipt.final_url);
        assert.equal(receipt.app, item.app); assert.equal(receipt.country, item.country); assert.equal(receipt.status, 200);
        assert.equal(final.protocol, "https:"); assert.equal(final.hostname, "apps.apple.com");
        assert.ok(final.pathname.startsWith("/" + item.country.toLowerCase() + "/") && final.pathname.endsWith("/id" + item.app));
        const html = await readFile(path.join(acquisitionDirectory, name + "-native.html"), "utf8");
        const key = createHash("sha256").update("html" + String.fromCharCode(10) + receipt.url).digest("hex");
        const cachePath = path.join(cacheDirectory, key + ".html");
        const record = { html, finalUrl: receipt.final_url, status: receipt.status, capturedAt: receipt.captured_at };
        await writeFile(cachePath, JSON.stringify(record), { mode: 0o600 });
        await utimes(cachePath, new Date(receipt.captured_at), new Date(receipt.captured_at));
        const event = { ...receipt, kind: "windows_native_capture", body_utf8_sha256: createHash("sha256").update(html).digest("hex") };
        await writeFile(networkLog, JSON.stringify(event) + String.fromCharCode(10), { flag: "a" });
      }
      const started = new Date().toISOString();
      const execution = await new Promise((resolve, reject) => {
        const child = spawn("bash", [path.join(backend, "deploy/linux-arm64/run-collector-jobs.sh"),
          "-JobId", job, "-ProductSlug", item.product, "-CollectorKind", "app_store"], {
          detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...env,
            GEOSUB_LIVE_JOB: job, GEOSUB_LIVE_PRODUCT: item.product, GEOSUB_LIVE_COUNTRY: item.country,
            GEOSUB_LIVE_APP_ID: item.app, GEOSUB_LIVE_CURRENCY: context.currency },
        });
        let output = "", timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          try { process.kill(-child.pid, "SIGKILL"); } catch {}
        }, 120_000);
        child.stdout.on("data", value => { output += value; }); child.stderr.on("data", value => { output += value; });
        child.once("error", error => { clearTimeout(timer); reject(error); });
        child.once("close", code => { clearTimeout(timer); resolve({ code, timedOut, output }); });
      });
      await writeFile(path.join(outputDirectory, item.product + "-collector.log"),
        execution.output.replaceAll(databaseUrl, "[redacted]"), { mode: 0o600 });
      const run = (await target.query(`SELECT status,raw_payload FROM collector_job_runs
        WHERE job_id=$1 ORDER BY started_at DESC,id DESC LIMIT 1`, [job])).rows[0];
      const allRows = (await target.query(`SELECT observation.id,product.slug AS product,plan.slug AS plan,country.code AS country,
        observation.billing_platform::text,observation.status::text,observation.anomaly_flag,observation.anomaly_reason,
        observation.raw_price,observation.currency,observation.converted_usd,observation.observed_at,
        observation.raw_payload->>'item_name' AS item_name,observation.raw_payload#>>'{raw_snapshot,capturedAt}' AS captured_at,
        observation.raw_payload->>'auto_review_reason_code' AS reason_code,
        price.last_checked_at AS formal_checked,price.status::text AS formal_status,
        price.local_price AS formal_price,price.currency AS formal_currency
        FROM price_observations observation JOIN products product ON product.id=observation.product_id
        JOIN plans plan ON plan.id=observation.plan_id JOIN countries country ON country.id=observation.country_id
        LEFT JOIN region_prices price ON price.product_id=observation.product_id AND price.plan_id=observation.plan_id
          AND price.country_id=observation.country_id AND price.billing_platform=observation.billing_platform
          AND price.price_type=observation.price_type
        ORDER BY observation.observed_at,observation.id`)).rows;
      const inserted = allRows.filter(row => !beforeIds.has(row.id) && row.product === item.product);
      assert.ok(inserted.every(row => row.country === item.country && row.billing_platform === "ios"));
      assert.ok(inserted.every(row => row.captured_at && (receipt
        ? Date.parse(row.observed_at) === Date.parse(receipt.captured_at)
        : Date.parse(row.observed_at) >= Date.parse(started))));
      assert.deepEqual((await target.query("SELECT * FROM region_prices WHERE billing_platform='web' ORDER BY id")).rows, beforeWeb);
      const formal = (await target.query(`SELECT local_price,currency,status::text,data_quality::text,last_checked_at
        FROM region_prices WHERE plan_id=$1 AND country_id=$2 AND billing_platform='ios'`,
      [context.plan_id, context.country_id])).rows[0] ?? null;
      const availability = (await target.query(`SELECT status::text,reason FROM app_store_plan_availability_checks
        WHERE plan_id=$1 AND country_id=$2 AND billing_platform='ios'`, [context.plan_id, context.country_id])).rows[0] ?? null;
      const renewed = inserted.filter(row => {
        const before = beforeLive.get([row.product,row.plan,row.country].join(":"));
        return before?.status === "published" && row.formal_status === "published"
          && Date.parse(row.formal_checked) === Date.parse(row.observed_at)
          && Date.parse(before.last_checked_at) < Date.parse(row.observed_at)
          && Number(row.formal_price) === Number(row.raw_price) && row.formal_currency === row.currency;
      });
      const result = { ...item, started_at: started, exit_code: execution.code, timed_out: execution.timedOut,
        existing_formal_dates_renewed: renewed.length,
        runner_status: run?.status ?? "no_run", evidence: run?.raw_payload?.collection_evidence,
        repair_outcome: run?.raw_payload?.repair_outcome, before_issue: beforeIssue,
        after_issue: await issue(item, context.product_id), formal, plan_availability: availability,
        new_observations: inserted.map(({ id, ...row }) => row) };
      results.push(result);
      await writeFile(path.join(outputDirectory, "live-progress.json"), JSON.stringify(results, null, 2));
    }
    const network = (await readFile(networkLog, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
    assert.ok(network.filter(row => row.kind === "app_store").length <= selection.length);
    const succeeded = results.filter(row => row.runner_status === "succeeded" && !row.timed_out).length;
    return { passed: succeeded === selection.length, execution_checks_passed: true,
      scope: "four selected targets; genuine public evidence and real canonical collector in disposable local DB",
      acquisition_mode: acquisitionDirectory ? "Windows native HTTP then Linux verified cache ingestion" : "Linux native HTTP",
      collection_runs_succeeded: succeeded,
      source_snapshot: "local 2026-10-28", historical_baseline_settled_before_live: true,
      prior_history_recoveries_not_counted_as_live: history.candidate.newly_resolved_identities,
      selected_targets: selection.length, original_targets_resolved: results.filter(row => row.after_issue.resolved).length,
      existing_formal_dates_renewed: results.reduce((total, row) => total + row.existing_formal_dates_renewed, 0),
      results, network, web_formal_rows_unchanged: true, synthetic_samples_added: 0, source_times_changed: 0,
      browser_executed: false, existing_database_mutations: false, production_activation: false };
  } finally { assert.equal(path.dirname(root), tmpdir()); await rm(root, { recursive: true, force: true }); }
}
