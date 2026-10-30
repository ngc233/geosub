import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

export function assertStaleReviewTestConnection(connection) {
  if (!["localhost", "127.0.0.1"].includes(connection?.host) || Number(connection.port) !== 55433
    || !/^geosub_collector_test_stale_[a-z0-9_]+$/.test(connection.database ?? "")) {
    throw Error("isolated_stale_review_database_required");
  }
}

export async function verifyStalePriceRecovery(client) {
  assertStaleReviewTestConnection(client.connectionParameters);
  assert.equal((await client.query("SELECT current_database() AS name")).rows[0].name, client.connectionParameters.database);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 0);
  const candidate = await readFile(new URL("../sql/isolated/collector-review-hardening.sql", import.meta.url), "utf8");
  await client.query(candidate);
  const root = await mkdtemp(path.join(tmpdir(), "geosub-stale-review-"));
  try {
    const queryPath = path.join(root, "repair.sql");
    const capture = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File",
      fileURLToPath(new URL("./collector-repair-policy.ps1", import.meta.url)), "-QueryOutputPath", queryPath],
    { encoding: "utf8", timeout: 20_000 });
    assert.equal(capture.status, 0, capture.stdout + capture.stderr);
    const repairSql = await readFile(queryPath, "utf8");
    const country = (await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
      VALUES('US','美国','United States','USD') RETURNING id`)).rows[0].id;
    const source = (await client.query(`INSERT INTO price_sources(source_key,name,source_level,type)
      VALUES('stale-fixture','Isolated App Store fixture','A','app_store') RETURNING id`)).rows[0].id;
    const product = "11111111-1111-4111-8111-111111111111";
    const cases = [];
    let plan;
    async function fixture(label, run, checkedHours = 480) {
      await client.query("BEGIN");
      try {
        await client.query(`INSERT INTO products(id,slug,name,category,status)
          VALUES($1,$2,$2,'ai','review')`, [product, "stale-fixture-" + label]);
        plan = (await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
          VALUES($1,'standard','Standard','monthly','review') RETURNING id`, [product])).rows[0].id;
        await client.query(`INSERT INTO region_prices
          (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
            primary_source_id,status,data_quality,last_checked_at)
          VALUES($1,$2,$3,10,'USD',10,'ios','list_price',$4,'published','verified',NOW()-make_interval(hours=>$5))`,
        [product, plan, country, source, checkedHours]);
        await run(); cases.push(label);
      } finally { await client.query("ROLLBACK"); }
    }
    async function sample(hours, { price = 10, confidence = 90, anomaly = false, status = "pending", platform = "ios", currency = "USD" } = {}) {
      return (await client.query(`INSERT INTO price_observations
        (product_id,plan_id,country_id,source_id,source_level,raw_price,currency,converted_usd,
          observed_at,billing_platform,price_type,status,confidence_score,anomaly_flag,raw_payload)
        VALUES($1,$2,$3,$4,'A',$5,$6,$5,NOW()-make_interval(hours=>$7),$8,'list_price',$9,$10,$11,
          '{"raw_snapshot":{"originalObservedPriceText":"USD 10","billingCycle":"monthly"}}') RETURNING id`,
      [product, plan, country, source, price, currency, hours, platform, status, confidence, anomaly])).rows[0].id;
    }
    const price = async () => (await client.query("SELECT * FROM region_prices WHERE billing_platform='ios'")).rows[0];
    const review = async (dry = false) => (await client.query("SELECT * FROM run_app_store_stability_auto_review($1,3,80,14)", [dry])).rows;
    const issues = async () => Object.values((await client.query(repairSql)).rows[0])[0];
    const observations = async () => (await client.query("SELECT * FROM price_observations ORDER BY observed_at,id")).rows;
    async function consensus() { for (const hours of [25, 13, 1]) await sample(hours); }
    async function assertFresh() {
      const current = await price();
      assert.equal(Number(current.local_price), 10);
      assert.equal(current.status, "published"); assert.equal(current.data_quality, "verified");
      assert.ok(Date.now() - new Date(current.last_checked_at).getTime() < 2 * 3_600_000);
      const newest = (await client.query(`SELECT max(observed_at) AS observed_at FROM price_observations
        WHERE billing_platform='ios' AND status='approved'`)).rows[0].observed_at;
      assert.equal(current.last_checked_at.toISOString(), newest.toISOString());
      assert.equal((await issues())[0].resolved, true);
    }

    await fixture("unchanged_price_renews_stale_evidence", async () => {
      const before = await price();
      await consensus();
      assert.equal((await issues())[0].resolved, false);
      await client.query(`INSERT INTO collector_jobs(product_id,source_id,job_type,schedule,status,job_config)
        VALUES($1,$2,'ai_pricing','daily','active',
          '{"collector_kind":"app_store","app_store_id":"6448311069","country_codes":["US"]}')`, [product, source]);
      assert.equal((await client.query("SELECT * FROM queue_stale_app_store_price_rechecks(14,20,24)")).rows.length, 1);
      const result = await review();
      assert.equal(result[0]?.decision, "auto_approve", "unchanged-price fresh evidence must reach the reviewer instead of being ignored");
      await assertFresh();
      assert.equal((await price()).id, before.id);
      assert.ok((await observations()).every(row => row.status === "approved"));
      assert.equal((await client.query("SELECT * FROM queue_stale_app_store_price_rechecks(14,20,24)")).rows.length, 0);
      const refreshed = await price();
      assert.deepEqual(await review(), []); assert.deepEqual(await price(), refreshed);
    });
    await fixture("one_then_two_then_three_independent_samples", async () => {
      const before = await price();
      await sample(1);
      assert.equal((await review())[0]?.reason_code, "waiting_for_more_app_store_samples");
      assert.equal((await observations())[0].status, "pending"); assert.deepEqual(await price(), before);
      await sample(13);
      assert.equal((await review())[0]?.reason_code, "waiting_for_more_app_store_samples");
      assert.deepEqual(await price(), before);
      await sample(25); assert.equal((await review())[0]?.decision, "auto_approve"); await assertFresh();
    });
    await fixture("old_history_replaced_by_fresh_consensus", async () => {
      const before = await price();
      await sample(480, { status: "approved" }); await sample(13); await sample(1);
      assert.equal((await review())[0]?.reason_code, "app_store_samples_too_old");
      assert.deepEqual(await price(), before);
      await sample(25); assert.equal((await review())[0]?.decision, "auto_approve"); await assertFresh();
    });
    for (const [label, offsets] of [["bursts_do_not_count", [1, 2, 3]], ["duplicates_do_not_count", [1, 1, 1]],
      ["future_does_not_count", [-1, 1, 13]]]) await fixture(label, async () => {
      const before = await price();
      for (const hours of offsets) await sample(hours);
      assert.equal((await review())[0]?.reason_code, "waiting_for_more_app_store_samples");
      assert.deepEqual(await price(), before); assert.ok((await observations()).every(row => row.status === "pending"));
    });
    for (const [label, options, reason] of [
      ["low_confidence_stays_blocked", { confidence: 40 }, "low_confidence"],
      ["hard_anomaly_stays_blocked", { anomaly: true }, "app_store_observation_anomaly"],
      ["currency_mismatch_stays_blocked", { currency: "EUR" }, "app_store_currency_mismatch"],
    ]) await fixture(label, async () => {
      const before = await price();
      for (const hours of [25, 13, 1]) await sample(hours, options);
      assert.equal((await review())[0]?.reason_code, reason); assert.deepEqual(await price(), before);
      assert.ok((await observations()).every(row => row.status === "pending"));
    });
    await fixture("dry_review_does_not_mutate_prices_or_observations", async () => {
      await consensus();
      const before = await price(), samples = await observations();
      assert.equal((await review(true))[0]?.decision, "auto_approve");
      assert.deepEqual(await price(), before); assert.deepEqual(await observations(), samples);
    });
    await fixture("covered_ios_history_ignored_but_web_untouched", async () => {
      await consensus();
      const web = await sample(1, { platform: "web" });
      await client.query(`INSERT INTO region_prices
        (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
          primary_source_id,status,data_quality,last_checked_at)
        VALUES($1,$2,$3,10,'USD',10,'web','list_price',$4,'published','verified',NOW())`, [product, plan, country, source]);
      const before = (await client.query("SELECT * FROM region_prices ORDER BY billing_platform")).rows;
      const originalWeb = (await client.query("SELECT * FROM price_observations WHERE id=$1", [web])).rows[0];
      assert.deepEqual(await review(), []);
      assert.ok((await observations()).filter(row => row.billing_platform === "ios").every(row => row.status === "ignored"));
      assert.deepEqual((await client.query("SELECT * FROM price_observations WHERE id=$1", [web])).rows[0], originalWeb);
      assert.deepEqual((await client.query("SELECT * FROM region_prices ORDER BY billing_platform")).rows, before);
    }, 0);
    await fixture("intermediate_anomaly_cannot_be_skipped", async () => {
      const before = await price();
      await sample(25); await sample(13); await sample(2, { anomaly: true }); await sample(1);
      const result = await review();
      assert.notEqual(result[0]?.decision, "auto_approve", "one post-anomaly sample must not borrow older clean history");
      assert.deepEqual(await price(), before);
      assert.ok((await observations()).every(row => row.status === "pending"));
    });
    await fixture("latest_anomaly_ends_the_sample_chain", async () => {
      const before = await price();
      await sample(25); await sample(13); await sample(1, { anomaly: true });
      const result = await review();
      assert.equal(result[0]?.reason_code, "app_store_observation_anomaly");
      assert.equal(result[0]?.observation_count, 1); assert.deepEqual(await price(), before);
    });
    await fixture("existing_two_clean_rule_fix_recovery_is_preserved", async () => {
      await sample(37); await sample(24, { anomaly: true }); await sample(13); await sample(1);
      const result = await review();
      assert.equal(result[0]?.reason_code, "app_store_clean_pair_after_rule_fix");
      assert.equal(result[0]?.decision, "auto_approve"); await assertFresh();
      const anomaly = (await observations()).find(row => row.anomaly_flag);
      assert.notEqual(anomaly.status, "approved");
    });
    await fixture("burst_clean_recovery_cannot_cross_a_nearby_anomaly", async () => {
      const before = await price();
      await sample(37); await sample(25); await sample(2, { anomaly: true });
      await sample(1); await sample(0);
      assert.notEqual((await review())[0]?.decision, "auto_approve"); assert.deepEqual(await price(), before);
    });
    await fixture("equal_capture_time_anomaly_cannot_be_skipped", async () => {
      const before = await price();
      await sample(25); await sample(13); await sample(1, { anomaly: true }); await sample(1);
      assert.notEqual((await review())[0]?.decision, "auto_approve"); assert.deepEqual(await price(), before);
    });
    await fixture("future_anomaly_does_not_block_real_consensus", async () => {
      await consensus(); await sample(-1, { anomaly: true });
      assert.equal((await review())[0]?.decision, "auto_approve");
      const current = await price(), approved = (await observations()).filter(row => row.status === "approved");
      assert.equal(current.status, "published"); assert.equal(Number(current.local_price), 10);
      assert.equal(current.last_checked_at.toISOString(), approved.at(-1).observed_at.toISOString());
      assert.equal((await observations()).find(row => row.anomaly_flag).status, "pending");
    });
    await fixture("web_anomaly_does_not_block_ios_consensus", async () => {
      await consensus(); await sample(2, { platform: "web", anomaly: true });
      assert.equal((await review())[0]?.decision, "auto_approve"); await assertFresh();
      assert.equal((await observations()).find(row => row.billing_platform === "web").status, "pending");
    });
    await fixture("changed_price_approval_still_works", async () => {
      for (const hours of [25, 13, 1]) await sample(hours, { price: 12 });
      assert.equal((await review())[0]?.decision, "auto_approve"); assert.equal(Number((await price()).local_price), 12);
    });
    return { passed: true, cases, case_count: cases.length,
      scope: "isolated reviewer candidate, disposable local schema-only database, explicit synthetic time histories",
      production_activation: false, existing_database_mutations: false, sample_rule: "3 independent observations, 12-hour spacing, existing confidence/freshness guards" };
  } finally { await rm(root, { recursive: true, force: true }); }
}
