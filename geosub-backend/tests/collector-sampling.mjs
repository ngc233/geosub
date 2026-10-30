import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

export function assertSamplingTestConnection(connection) {
  if (!["localhost", "127.0.0.1"].includes(connection?.host) || Number(connection.port) !== 55433
    || !/^geosub_collector_test_sampling_[a-z0-9_]+$/.test(connection.database ?? "")) {
    throw Error("isolated_sampling_database_required");
  }
}

export async function verifyCollectorSampling(client, databaseUrl) {
  assertSamplingTestConnection(client.connectionParameters);
  assert.equal((await client.query("SELECT current_database() AS name")).rows[0].name, client.connectionParameters.database);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 0);
  const root = await mkdtemp(path.join(tmpdir(), "geosub-sampling-"));
  try {
    const country = (await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
      VALUES('US','美国','United States','USD') RETURNING id`)).rows[0].id;
    const source = (await client.query(`INSERT INTO price_sources(source_key,name,source_level,type)
      VALUES('sampling-fixture','Local App Store fixture','A','app_store') RETURNING id`)).rows[0].id;
    const script = fileURLToPath(new URL("./collector-sampling.ps1", import.meta.url));
    const cases = [];
    let base;
    async function fixture(label, run) {
      const product = (await client.query(`INSERT INTO products(slug,name,category,status)
        VALUES($1,$1,'ai','review') RETURNING id`, ["sampling-" + label])).rows[0].id;
      const plan = (await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
        VALUES($1,'plus','Plus','monthly','review') RETURNING id`, [product])).rows[0].id;
      base = { product_id: product, plan_id: plan, country_id: country, source_id: source, price: 10,
        parser: "sampling-fixture-v1", snapshot: { capturedAt: new Date().toISOString(), fromCache: false, billingCycle: "monthly" } };
      await run(); cases.push(label);
    }
    const rows = async () => (await client.query("SELECT * FROM price_observations WHERE product_id=$1 ORDER BY observed_at,id", [base.product_id])).rows;
    async function seed(hours, { status = "pending", anomaly = false, parser = base.parser, price = 10 } = {}) {
      const time = new Date(new Date(base.snapshot.capturedAt).getTime() - hours * 3_600_000);
      await client.query(`INSERT INTO price_observations(product_id,plan_id,country_id,source_id,source_level,
        raw_price,currency,converted_usd,observed_at,billing_platform,price_type,status,confidence_score,anomaly_flag,parser_version,
          created_at,updated_at,raw_payload)
        VALUES($1,$2,$3,$4,'A',$5,'USD',$5,$6,'ios','list_price',$7,90,$8,$9,$6,$6,
          '{"raw_snapshot":{"originalObservedPriceText":"USD 10"}}')`,
      [base.product_id, base.plan_id, country, source, price, time, status, anomaly, parser]);
      return time;
    }
    async function write(patch = {}, { targetHour = 22, failure = false } = {}) {
      const input = path.join(root, "writes.json");
      await writeFile(input, JSON.stringify([{ ...base, ...patch }]), { mode: 0o600 });
      // Choose a session timezone to reproduce calendar boundaries at any real UTC hour.
      const utcHour = new Date().getUTCHours();
      const offset = ((targetHour - utcHour + 36) % 24) - 12;
      const zone = "Etc/GMT" + (offset > 0 ? "-" + offset : offset < 0 ? "+" + -offset : "0");
      const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", script, "-WritesPath", input], {
        env: { ...process.env, DATABASE_URL: databaseUrl, NODE_OPTIONS: "", PGOPTIONS: "-c timezone=" + zone },
        encoding: "utf8", timeout: 20_000,
      });
      if (failure) { assert.notEqual(result.status, 0); return; }
      assert.equal(result.status, 0, (result.stdout + result.stderr).replaceAll(databaseUrl, "[redacted]"));
      const line = result.stdout.split("\n").find(value => value.startsWith("GEOSUB_SAMPLING_WRITES="));
      assert.ok(line); return JSON.parse(line.slice("GEOSUB_SAMPLING_WRITES=".length))[0];
    }
    function outcome() {
      const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", script,
        "-EvidenceProductId", base.product_id, "-EvidenceStartedAt", base.snapshot.capturedAt], {
        env: { ...process.env, DATABASE_URL: databaseUrl, NODE_OPTIONS: "" }, encoding: "utf8", timeout: 20_000,
      });
      assert.equal(result.status, 0, (result.stdout + result.stderr).replaceAll(databaseUrl, "[redacted]"));
      const line = result.stdout.split("\n").find(value => value.startsWith("GEOSUB_SAMPLING_EVIDENCE="));
      assert.ok(line); return JSON.parse(line.slice("GEOSUB_SAMPLING_EVIDENCE=".length));
    }
    await fixture("same_day_13_hours", async () => {
      await seed(13); assert.equal(await write(), "inserted", "13-hour independent evidence must not be lost to calendar-day deduplication");
      assert.equal((await rows()).length, 2);
      assert.equal((await rows()).at(-1).observed_at.toISOString(), base.snapshot.capturedAt);
    });
    await fixture("cross_midnight_short_retry", async () => {
      await seed(3); assert.equal(await write({}, { targetHour: 2 }), "skipped"); assert.equal((await rows()).length, 1);
    });
    await fixture("exact_12_hour_boundary", async () => { await seed(12); assert.equal(await write(), "inserted"); });
    await fixture("just_before_12_hours", async () => { await seed(12 - 1 / 3600); assert.equal(await write(), "skipped"); });
    for (const status of ["pending", "approved", "ignored"]) await fixture("retry_after_" + status, async () => {
      await seed(1, { status }); assert.equal(await write(), "skipped"); assert.equal((await rows()).length, 1);
    });
    await fixture("cache_replay_even_when_forced", async () => {
      const captured = await seed(13);
      assert.equal(await write({ force: true, snapshot: { capturedAt: captured.toISOString(), fromCache: true } }), "skipped");
      assert.equal((await rows()).length, 1);
    });
    await fixture("first_cache_use_keeps_original_time", async () => {
      const capturedAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
      assert.equal(await write({ snapshot: { capturedAt, fromCache: true } }), "inserted");
      assert.equal((await rows())[0].observed_at.toISOString(), capturedAt);
      const evidence = outcome();
      assert.equal(evidence.observed_count, 1); assert.equal(evidence.pending_stability_count, 1);
    });
    await fixture("changed_price_is_retained", async () => { await seed(1); assert.equal(await write({ price: 11 }), "inserted"); });
    await fixture("clean_recovery_after_intermediate_anomaly", async () => {
      await seed(2); await seed(1, { anomaly: true });
      assert.equal(await write(), "inserted", "a newer anomaly must not let an older clean value suppress recovery");
      assert.equal((await rows()).length, 3);
      assert.equal((await rows()).at(-1).anomaly_flag, false);
      assert.equal(await write(), "skipped");
    });
    await fixture("return_to_previous_price_is_retained", async () => {
      await seed(2); await seed(1, { price: 11 });
      assert.equal(await write(), "inserted", "10 -> 11 -> 10 must retain the return to 10");
      assert.equal((await rows()).length, 3); assert.equal(await write(), "skipped");
    });
    await fixture("return_to_previous_parser_is_retained", async () => {
      await seed(2); await seed(1, { parser: "sampling-fixture-v2" });
      assert.equal(await write(), "inserted"); assert.equal((await rows()).length, 3);
    });
    await fixture("repeated_anomaly_after_clean_is_retained", async () => {
      await seed(2, { anomaly: true }); await seed(1);
      assert.equal(await write({ anomaly: true }), "inserted"); assert.equal((await rows()).length, 3);
    });
    await fixture("cached_old_clean_cannot_duplicate_after_anomaly", async () => {
      const time = await seed(2); await seed(1, { anomaly: true });
      assert.equal(await write({ force: true, snapshot: { capturedAt: time.toISOString(), fromCache: true } }), "skipped");
      assert.equal((await rows()).length, 2); assert.equal((await rows()).at(-1).anomaly_flag, true);
    });
    await fixture("fixed_parser_is_retained", async () => {
      await seed(1); assert.equal(await write({ parser: "sampling-fixture-v2" }), "inserted");
    });
    await fixture("fixed_anomaly_is_retained", async () => {
      await seed(1, { anomaly: true }); assert.equal(await write(), "inserted");
    });
    for (const [label, snapshot] of [
      ["cache_missing_time", { fromCache: true }], ["invalid_time", { capturedAt: "invalid" }],
      ["future_time", { capturedAt: new Date(Date.now() + 3_600_000).toISOString() }],
    ]) await fixture(label, async () => { await write({ snapshot }, { failure: true }); assert.equal((await rows()).length, 0); });
    await fixture("dry_run_never_writes", async () => { assert.equal(await write({ dry_run: true }), "dry-run"); assert.equal((await rows()).length, 0); });
    await client.query(await readFile(new URL("../sql/isolated/collector-review-hardening.sql", import.meta.url), "utf8"));
    await fixture("forced_fresh_copies_cannot_create_consensus", async () => {
      for (let index = 0; index < 3; index++) assert.equal(await write({ force: true }), "inserted");
      const decisions = (await client.query("SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14)")).rows;
      const decision = decisions.find(row => row.product_slug === "sampling-forced_fresh_copies_cannot_create_consensus");
      assert.equal(decision?.reason_code, "waiting_for_more_app_store_samples");
      assert.ok((await rows()).every(row => row.status === "pending"));
    });
    await fixture("three_source_times_recover_without_real_wait", async () => {
      const epoch = Date.now() - 3_600_000;
      for (const hours of [24, 12, 0]) {
        const capturedAt = new Date(epoch - hours * 3_600_000).toISOString();
        assert.equal(await write({ snapshot: { capturedAt, fromCache: false } }), "inserted");
      }
      const decisions = (await client.query("SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14)")).rows;
      assert.equal(decisions.find(row => row.product_slug === "sampling-three_source_times_recover_without_real_wait")?.decision, "auto_approve");
      const formal = (await client.query("SELECT * FROM region_prices WHERE product_id=$1", [base.product_id])).rows[0];
      assert.equal(formal.last_checked_at.toISOString(), new Date(epoch).toISOString());
      assert.equal(Number(formal.local_price), 10);
      await client.query(`INSERT INTO region_prices
        (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
          primary_source_id,status,data_quality,last_checked_at)
        VALUES($1,$2,$3,99,'USD',99,'web','list_price',$4,'published','verified',NOW())`,
      [base.product_id, base.plan_id, country, source]);
      const evidence = outcome();
      assert.equal(evidence.observed_count, 3); assert.equal(evidence.approved_count, 3);
      assert.equal(evidence.published_price_count, 1);
    });
    return { passed: true, case_count: cases.length, cases,
      scope: "real collector insertion functions plus isolated reviewer; synthetic source times and no HTTP/scheduler execution",
      existing_database_mutations: false, production_activation: false, execution_evidence_verified: true };
  } finally { assert.equal(path.dirname(root), tmpdir()); await rm(root, { recursive: true, force: true }); }
}
