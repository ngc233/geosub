import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function assertHistoryReplayConnection(connection, source = false) {
  const expected = source ? connection?.database === "geosub_admin_preview_20261028"
    : /^geosub_collector_test_replay_[a-z0-9_]+$/.test(connection?.database ?? "");
  if (!["localhost", "127.0.0.1"].includes(connection?.host) || Number(connection.port) !== 55433 || !expected) {
    throw Error("isolated_history_replay_required");
  }
}

// Keep every active observation; ignored history only needs the last three source
// times per identity and the latest exact-match row for formal-price renewal.
const observationSelection = `WITH ignored_times AS (
  SELECT observation.id, observation.product_id, observation.plan_id, observation.country_id,
    observation.price_type, observation.observed_at,
    row_number() OVER (PARTITION BY observation.product_id, observation.plan_id,
      observation.country_id, observation.price_type, observation.observed_at
      ORDER BY observation.created_at DESC, observation.id DESC) AS at_rank
  FROM price_observations observation
  LEFT JOIN price_sources source ON source.id=observation.source_id
  WHERE observation.billing_platform='ios' AND observation.status='ignored'
    AND (observation.source_level='A' OR source.type='app_store')
), ignored_ranked AS (
  SELECT id,row_number() OVER (PARTITION BY product_id,plan_id,country_id,price_type
    ORDER BY observed_at DESC) AS identity_rank
  FROM ignored_times WHERE at_rank=1
), matching AS (
  SELECT DISTINCT ON (price.id) observation.id
  FROM region_prices price JOIN price_observations observation
    ON observation.product_id=price.product_id AND observation.plan_id=price.plan_id
    AND observation.country_id=price.country_id AND observation.billing_platform=price.billing_platform
    AND observation.price_type=price.price_type
  WHERE price.billing_platform='ios' AND price.status='published'
    AND observation.status='ignored' AND NOT COALESCE(observation.anomaly_flag,FALSE)
    AND observation.raw_payload->>'auto_review_reason_code'='superseded_by_published_price'
    AND observation.observed_at>COALESCE(price.last_checked_at,'-infinity'::timestamptz)
    AND price.currency IS NOT DISTINCT FROM observation.currency
    AND price.local_price IS NOT DISTINCT FROM observation.raw_price
    AND observation.converted_usd>=1
  ORDER BY price.id,observation.observed_at DESC,observation.created_at DESC,observation.id DESC
), chosen AS (
  SELECT id FROM price_observations WHERE billing_platform<>'ios' OR status<>'ignored'
  UNION SELECT id FROM ignored_ranked WHERE identity_rank<=3
  UNION SELECT id FROM matching
)
SELECT observation.* FROM price_observations observation JOIN chosen USING(id) ORDER BY observation.id`;

const quote = value => '"' + value.replaceAll('"', '""') + '"';
const countBy = (rows, key) => {
  const result = {};
  for (const row of rows) { const label = key(row); result[label] = (result[label] ?? 0) + 1; }
  return result;
};

export async function replayCollectorHistory(source, target, { previousRunnerPath } = {}) {
  assertHistoryReplayConnection(source.connectionParameters, true);
  assertHistoryReplayConnection(target.connectionParameters);
  for (const client of [source, target]) {
    assert.equal((await client.query("SELECT current_database() AS name")).rows[0].name, client.connectionParameters.database);
  }
  assert.equal((await source.query("SHOW transaction_read_only")).rows[0].transaction_read_only, "on");
  assert.equal((await target.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 0);
  const root = await mkdtemp(path.join(tmpdir(), "geosub-history-replay-"));
  const queries = { observation_selection: observationSelection };
  try {
    const capturePath = path.join(root, "repair.sql");
    const capture = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File",
      fileURLToPath(new URL("./collector-repair-policy.ps1", import.meta.url)), "-QueryOutputPath", capturePath],
    { encoding: "utf8", timeout: 20_000 });
    assert.equal(capture.status, 0, capture.stdout + capture.stderr);
    const originalSql = await readFile(capturePath, "utf8");
    assert.ok(originalSql.includes("'11111111-1111-4111-8111-111111111111'::uuid"));
    assert.ok(originalSql.includes("country.code IN ('US')"));
    const issueSql = originalSql.replace("'11111111-1111-4111-8111-111111111111'::uuid", "$1::uuid")
      .replace("country.code IN ('US')", "country.code = ANY($2::text[])");
    queries.actual_runner_issue_query = issueSql;
    const products = (await source.query("SELECT id,slug FROM products ORDER BY slug")).rows;
    const countries = (await source.query("SELECT code FROM countries ORDER BY code")).rows.map(row => row.code);
    async function issues(client) {
      const rows = [];
      for (const product of products) {
        const result = await client.query(issueSql, [product.id, countries]);
        for (const issue of Object.values(result.rows[0])[0]) rows.push({ ...issue, product: product.slug });
      }
      return rows;
    }
    const originalIssues = await issues(source);
    const copied = {};
    const inputTables = ["products", "plans", "countries", "price_sources", "region_prices", "price_observations",
      "app_store_plan_availability_checks"];
    for (const table of inputTables) {
      const sql = table === "price_observations" ? observationSelection : "SELECT * FROM " + quote(table) + " ORDER BY id";
      const result = await source.query(sql);
      const columns = result.fields.map(field => field.name).filter(name => name !== "logo_asset_id");
      const names = columns.map(quote).join(",");
      const insert = "INSERT INTO " + quote(table) + " (" + names + ") SELECT " + names
        + " FROM jsonb_populate_recordset(NULL::" + quote(table) + ",$1::jsonb)";
      for (let index = 0; index < result.rows.length; index += 500) {
        const rows = result.rows.slice(index, index + 500).map(row => Object.fromEntries(columns.map(name => [name, row[name]])));
        await target.query(insert, [JSON.stringify(rows)]);
      }
      copied[table] = result.rows.length;
    }
    const inputIssues = await issues(target);
    assert.deepEqual(inputIssues, originalIssues, "bounded ignored history must preserve the actual runner issue result");
    const beforePrices = (await target.query("SELECT * FROM region_prices ORDER BY id")).rows;
    const beforeCatalog = (await target.query(`SELECT 'product' AS kind,id,status::text FROM products
      UNION ALL SELECT 'plan',id,status::text FROM plans ORDER BY kind,id`)).rows;
    const beforeObservations = new Map((await target.query("SELECT id,status FROM price_observations")).rows.map(row => [row.id, row.status]));
    let clock;
    const tableCounts = async () => (await target.query(`SELECT 'prices' AS kind,count(*)::int AS n FROM region_prices
      UNION ALL SELECT 'observations',count(*)::int FROM price_observations ORDER BY kind`)).rows;
    const beforeCounts = await tableCounts();
    const summarizeIssues = rows => ({ identities: rows.length, unresolved: rows.filter(row => !row.resolved).length,
      unresolved_by_product: countBy(rows.filter(row => !row.resolved), row => row.product),
      unresolved_by_reason: countBy(rows.filter(row => !row.resolved), row => row.reason_code || "no_review_reason") });
    const steps = {
      exact_price_refresh: "SELECT refresh_matching_app_store_prices() AS changed",
      review: "SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14)",
      identity_quarantine: "SELECT reconcile_app_store_identity_ambiguities($1) AS changed",
      outlier_quarantine: "SELECT quarantine_published_app_store_price_outliers() AS changed",
    };
    Object.assign(queries, steps);
    async function actions(rows) {
      const input = path.join(root, "issues.json");
      await writeFile(input, JSON.stringify(rows), { mode: 0o600 });
      const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File",
        fileURLToPath(new URL("./collector-repair-policy.ps1", import.meta.url)), "-IssuesInputPath", input,
        ...(previousRunnerPath ? ["-PreviousRunnerPath", previousRunnerPath] : [])],
      { encoding: "utf8", timeout: 20_000 });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const line = result.stdout.split("\n").find(value => value.startsWith("GEOSUB_HISTORY_ACTIONS="));
      assert.ok(line);
      const targets = JSON.parse(line.slice("GEOSUB_HISTORY_ACTIONS=".length));
      assert.equal(targets.length, rows.filter(row => !row.resolved).length);
      const productByIdentity = new Map(rows.map(row => [row.identity_key, row.product]));
      let transitions;
      if (previousRunnerPath) {
        const previous = result.stdout.split("\n").find(value => value.startsWith("GEOSUB_HISTORY_PREVIOUS_ACTIONS="));
        assert.ok(previous);
        const old = JSON.parse(previous.slice("GEOSUB_HISTORY_PREVIOUS_ACTIONS=".length));
        const current = new Map(targets.map(row => [row.identity_key, row]));
        const blocked = old.filter(row => row.action === "collect_independent_evidence"
          && current.get(row.identity_key)?.action !== "collect_independent_evidence");
        transitions = { previous_collect: old.filter(row => row.action === "collect_independent_evidence").length,
          current_collect: targets.filter(row => row.action === "collect_independent_evidence").length,
          blocked_collect: blocked.length, by_new_action: countBy(blocked, row => current.get(row.identity_key).action),
          by_product: countBy(blocked, row => productByIdentity.get(row.identity_key)) };
      }
      return { counts: countBy(targets, row => row.action), transitions,
        by_product: countBy(targets, row => row.action + ":" + productByIdentity.get(row.identity_key)) };
    }
    async function phase(strict = false) {
      const revalidated = (await target.query(steps.exact_price_refresh)).rows[0].changed;
      const decisions = (await target.query(steps.review)).rows;
      let quarantined = 0;
      for (const product of products) quarantined += (await target.query(steps.identity_quarantine, [product.slug])).rows[0].changed;
      const outliers = (await target.query(steps.outlier_quarantine)).rows[0].changed;
      const afterPrices = (await target.query("SELECT * FROM region_prices ORDER BY id")).rows;
      assert.deepEqual(afterPrices.filter(row => row.billing_platform === "web"), beforePrices.filter(row => row.billing_platform === "web"));
      assert.deepEqual((await target.query(`SELECT 'product' AS kind,id,status::text FROM products
        UNION ALL SELECT 'plan',id,status::text FROM plans ORDER BY kind,id`)).rows, beforeCatalog);
      const rows = (await target.query("SELECT id,status,anomaly_flag FROM price_observations")).rows;
      const newlyApproved = rows.filter(row => row.status === "approved" && beforeObservations.get(row.id) !== "approved");
      assert.ok(newlyApproved.every(row => !row.anomaly_flag), "hard anomalies cannot become newly approved");
      const afterIssues = await issues(target), before = new Map(inputIssues.map(row => [row.identity_key, row]));
      const resolved = afterIssues.filter(row => row.resolved && before.get(row.identity_key)?.resolved === false);
      const reopened = afterIssues.filter(row => !row.resolved && before.get(row.identity_key)?.resolved === true);
      const priceMap = new Map(beforePrices.map(row => [row.id, row]));
      const changed = afterPrices.filter(row => JSON.stringify(row) !== JSON.stringify(priceMap.get(row.id)));
      const changedAmounts = changed.filter(row => Number(row.local_price) !== Number(priceMap.get(row.id)?.local_price));
      const selectedSamples = (await target.query(`WITH selected AS (
        SELECT observation.*,product.slug AS product,plan.slug AS plan,country.code AS country,
          lag(observed_at) OVER (PARTITION BY observation.product_id,plan_id,country_id,billing_platform,price_type
            ORDER BY observation.observed_at,observation.id) AS previous_time
        FROM price_observations observation JOIN products product ON product.id=observation.product_id
        JOIN plans plan ON plan.id=observation.plan_id JOIN countries country ON country.id=observation.country_id
        WHERE observation.id=ANY($1::uuid[])
      ) SELECT product,plan,country,count(*)::int AS samples,min(observed_at) AS oldest,max(observed_at) AS newest,
        bool_and(previous_time IS NULL OR observed_at-previous_time>=INTERVAL '12 hours') AS independent,
        count(DISTINCT (raw_price,currency))::int AS different_prices,min(confidence_score)::int AS confidence,
        min(converted_usd) AS min_usd,max(converted_usd) AS max_usd,
        bool_or(anomaly_flag) AS has_anomaly,min(observed_at)>=NOW()-INTERVAL '14 days' AS fresh,
        array_agg(DISTINCT parser_version) AS parsers,array_agg(DISTINCT raw_payload->>'item_name') AS item_names
        FROM selected GROUP BY product,plan,country ORDER BY product,plan,country`,
      [newlyApproved.map(row => row.id)])).rows;
      const validSamples = selectedSamples.every(row => row.independent && !row.has_anomaly && row.confidence>=80
        && row.fresh && row.different_prices===1);
      if (strict) assert.ok(validSamples, "candidate must not approve invalid historical sample groups");
      const actionPlan = await actions(afterIssues);
      return { revalidated, identity_quarantined: quarantined, outlier_quarantined: outliers,
        decision_count: decisions.length, decisions_by_reason: countBy(decisions, row => row.reason_code),
        decisions_by_product: countBy(decisions, row => row.product_slug),
        auto_approved_groups: decisions.filter(row => row.decision === "auto_approve").length,
        newly_approved_observations: newlyApproved.length, formal_rows_changed: changed.length,
        formal_amounts_changed: changedAmounts.length, newly_resolved_identities: resolved.length,
        newly_unresolved_identities: reopened.length, issues: summarizeIssues(afterIssues),
        remaining_actions: actionPlan.counts, remaining_actions_by_product: actionPlan.by_product,
        repair_action_transitions: actionPlan.transitions,
        approved_sample_checks: selectedSamples, approved_samples_valid: validSamples,
        web_formal_rows_unchanged: true, catalog_statuses_unchanged: true };
    }
    await target.query("BEGIN");
    try {
      clock = (await target.query("SELECT NOW() AS time")).rows[0].time;
      await target.query("SAVEPOINT replay_input");
      const baseline = await phase();
      await target.query("ROLLBACK TO SAVEPOINT replay_input");
      const candidate = await readFile(new URL("../sql/isolated/collector-review-hardening.sql", import.meta.url), "utf8");
      assert.ok(candidate.startsWith("BEGIN;\n") && candidate.endsWith("\nCOMMIT;\n"));
      await target.query(candidate.slice("BEGIN;\n".length, -"\nCOMMIT;\n".length));
      const hardened = await phase(true);
      await target.query("ROLLBACK TO SAVEPOINT replay_input");
      assert.deepEqual(await tableCounts(), beforeCounts);
      assert.deepEqual((await target.query("SELECT * FROM region_prices ORDER BY id")).rows, beforePrices);
      return { passed: true, source: "local preview snapshot 2026-10-28", source_read_only: true,
        newest_source_time: (await source.query("SELECT max(observed_at) AS time FROM price_observations WHERE billing_platform='ios'")).rows[0].time,
        replay_time: clock, identical_input_and_transaction_time: true, copied_rows: copied,
        input_issue_query_matches_source: true, input: summarizeIssues(inputIssues),
        input_actions: await actions(inputIssues), baseline, candidate: hardened,
        replay_rolled_back: true, synthetic_samples_added: 0, source_times_changed: 0,
        live_http_verified: false, existing_database_mutations: false, production_activation: false, queries };
    } finally { await target.query("ROLLBACK"); }
  } finally { assert.equal(path.dirname(root), tmpdir()); await rm(root, { recursive: true, force: true }); }
}
