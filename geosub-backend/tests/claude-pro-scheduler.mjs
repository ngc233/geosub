import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSchedulerTestDatabase } from "./claude-pro-scheduler-fixture.mjs";
import { ensureSource } from "../scripts/collect-official-web-prices.mjs";

const backend = fileURLToPath(new URL('../', import.meta.url));

export async function verifyClaudeProScheduler(client, databaseUrl) {
  const url = assertSchedulerTestDatabase(databaseUrl);
  const expectedHost = url.hostname === '[::1]' ? '::1' : url.hostname;
  assert.equal(client.connectionParameters.host, expectedHost);
  assert.equal(Number(client.connectionParameters.port), 55433);
  const scope = (await client.query('SELECT current_database() AS name')).rows[0].name;
  assert.equal('/' + scope, url.pathname);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM products')).rows[0].n, 0);
  const registry = JSON.parse(await readFile(new URL('../data/official-web-price-sources.json', import.meta.url), 'utf8'));
  const source = registry.sources['claude-us-pro'];
  assert.equal(source.auto_review, undefined);
  const product = (await client.query(`INSERT INTO products(slug,name,category,status)
    VALUES('claude','Claude scheduler fixture','ai','review') RETURNING id`)).rows[0];
  const plan = (await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
    VALUES($1,'pro','Pro','monthly','review') RETURNING id`, [product.id])).rows[0];
  const country = (await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
    VALUES('US','美国','United States','USD') RETURNING id`)).rows[0];
  const sourceId = await ensureSource(client, source);
  for (const [platform, price] of [['web', 20], ['ios', 99]]) {
    await client.query(`INSERT INTO region_prices
      (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
        primary_source_id,status,data_quality,last_checked_at)
      VALUES($1,$2,$3,$4,'USD',$4,$5,'list_price',$6,'published','verified',NOW() - INTERVAL '2 days')`,
    [product.id, plan.id, country.id, price, platform, sourceId]);
  }
  const prices = async () => (await client.query('SELECT * FROM region_prices ORDER BY billing_platform')).rows;
  const originalPrices = await prices();
  // Existing published prices already promote their plan through the installed trigger.
  const lifecycle = async () => ({
    product: (await client.query('SELECT status FROM products WHERE id=$1', [product.id])).rows[0].status,
    plan: (await client.query('SELECT status FROM plans WHERE id=$1', [plan.id])).rows[0].status,
  });
  const originalLifecycle = await lifecycle();
  const config = { collector_kind: 'pricing_page', official_web_source_key: 'claude-us-pro',
    country_codes: ['US'], interval_hours: 12 };
  const jobId = (await client.query(`INSERT INTO collector_jobs
    (product_id,source_id,job_type,schedule,status,next_run_at,job_config)
    VALUES($1,$2,'ai_pricing','daily','active',NOW() + INTERVAL '1 day',$3::jsonb) RETURNING id`,
  [product.id, sourceId, JSON.stringify(config)])).rows[0].id;
  const root = await mkdtemp(path.join(tmpdir(), 'geosub-claude-scheduler-'));
  const log = path.join(root, 'fetch.jsonl');
  const envFile = path.join(root, 'empty.env');
  await writeFile(log, '');
  await writeFile(envFile, '');
  const env = {
    ...process.env, DATABASE_URL: databaseUrl, NODE_OPTIONS: '',
    GEOSUB_FRONTEND_DIR: path.resolve(backend, '../ai-price-site'),
    GEOSUB_BACKEND_DIR: backend, GEOSUB_ENV_FILE: envFile, GEOSUB_COLLECTOR_ENV_FILE: envFile,
    GEOSUB_DB_NAME: scope, GEOSUB_DB_CONTAINER: 'scheduler-test-no-fallback',
    GEOSUB_COLLECTOR_JOB_LIMIT: '1',
    GEOSUB_COLLECTOR_LOCK_DIR: path.join(root, 'lock'),
    GEOSUB_COLLECTOR_LOCK_FILE: path.join(root, 'lock/collector.lock'),
    GEOSUB_CONTENT_DISTRIBUTION: 'local', GEOSUB_CLAUDE_SCHEDULER_FIXTURE: '1',
    GEOSUB_CLAUDE_SCHEDULER_LOG: log,
  };
  const preload = fileURLToPath(new URL('./claude-pro-scheduler-fixture.mjs', import.meta.url));
  env.NODE_OPTIONS = '--import=' + preload;
  const requests = async () => (await readFile(log, 'utf8')).trim().split('\n').filter(Boolean).length;
  const jobs = async () => (await client.query('SELECT * FROM collector_jobs WHERE id=$1', [jobId])).rows[0];
  const runs = async () => (await client.query('SELECT * FROM collector_job_runs WHERE job_id=$1 ORDER BY started_at,id', [jobId])).rows;
  const due = () => client.query("UPDATE collector_jobs SET next_run_at=NOW() - INTERVAL '1 second' WHERE id=$1", [jobId]);
  const observationCount = async () => (await client.query('SELECT count(*)::int AS n FROM price_observations')).rows[0].n;
  const cases = [];
  const retryMinutes = [];
  async function run(mode = 'valid', extra = [], failure = false) {
    const result = await new Promise((resolve, reject) => {
      const child = spawn('bash', [path.join(backend, 'deploy/linux-arm64/run-collector-jobs.sh'),
        '-ProductSlug', 'claude', '-CollectorKind', 'pricing_page', ...extra], {
        env: { ...env, GEOSUB_CLAUDE_SCHEDULER_MODE: mode }, stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      const timer = setTimeout(() => child.kill('SIGKILL'), 45_000);
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('close', code => { clearTimeout(timer); resolve({ code, output }); });
    });
    // Logs contain fixture data only; connection strings are never included in assertions.
    assert.equal(result.code === 0, !failure, result.output.replaceAll(databaseUrl, '[redacted]'));
    return result;
  }
  try {
    await run();
    assert.equal(await requests(), 0);
    assert.equal((await runs()).length, 0);
    cases.push('future jobs do not collect');

    await due();
    const beforeDry = await jobs();
    await run('valid', ['-DryRun']);
    assert.deepEqual(await jobs(), beforeDry);
    assert.equal(await requests(), 0);
    assert.equal((await runs()).length, 0);
    cases.push('dry run leaves job, observations and run rows unchanged');

    await client.query("UPDATE collector_jobs SET status='paused' WHERE id=$1", [jobId]);
    await run();
    assert.equal(await requests(), 0);
    await client.query("UPDATE collector_jobs SET status='active' WHERE id=$1", [jobId]);
    cases.push('paused jobs do not collect');

    const runningId = (await client.query(`INSERT INTO collector_job_runs
      (job_id,product_id,source_id,status,collector_kind,started_at,raw_payload)
      VALUES($1,$2,$3,'running','pricing_page',NOW(),'{"state":"started"}') RETURNING id`,
    [jobId, product.id, sourceId])).rows[0].id;
    await run();
    assert.equal(await requests(), 0);
    assert.equal((await runs()).length, 1);
    await client.query(`UPDATE collector_job_runs SET status='skipped',finished_at=NOW(),
      raw_payload='{"fixture":"in-flight guard"}' WHERE id=$1`, [runningId]);
    cases.push('an in-flight run blocks duplicate admission');

    const beforeParallel = (await runs()).length;
    await Promise.all([run('delayed'), run('delayed')]);
    assert.equal(await requests(), 2);
    assert.equal((await runs()).length, beforeParallel + 1);
    assert.equal(await observationCount(), 1);
    assert.equal((await jobs()).success_count, 1);
    const first = (await runs()).at(-1);
    assert.equal(first.status, 'succeeded');
    assert.equal(first.raw_payload.inserted_observation_count, 1);
    assert.equal(first.raw_payload.published_price_count, 0);
    assert.ok(first.finished_at && first.duration_ms >= 0);
    cases.push('concurrent canonical entrypoints collect once and finish their run row');

    await run();
    assert.equal(await requests(), 2);
    await due();
    await run();
    assert.equal(await observationCount(), 1);
    assert.equal((await runs()).at(-1).raw_payload.skipped_observation_count, 1);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM source_evidence')).rows[0].n, 2);
    cases.push('repeat admission obeys next_run_at and same-day evidence deduplication');

    const successBeforeFailure = (await jobs()).success_count;
    for (const [index, minutes] of [30, 120, 360, 720].entries()) {
      await due();
      await run(index === 1 ? 'mismatch' : 'http503', [], true);
      const job = await jobs();
      const last = (await runs()).at(-1);
      assert.equal(job.status, 'active');
      assert.equal(job.error_count, index + 1);
      assert.equal(job.success_count, successBeforeFailure);
      assert.equal(last.status, 'failed');
      assert.equal(last.raw_payload.failed_market_count, 1);
      assert.equal(last.raw_payload.published_price_count, 0);
      assert.ok(last.error_message);
      assert.equal(job.job_config.operational_state, index < 3 ? 'retry_scheduled' : 'official_web_isolated_retry');
      const delay = (job.next_run_at - job.last_run_at) / 60_000;
      assert.ok(Math.abs(delay - minutes) < 0.1);
      retryMinutes.push(delay);
      assert.equal(await observationCount(), 1);
      assert.deepEqual(await prices(), originalPrices);
      const requestsBeforeRetry = await requests();
      const runsBeforeRetry = (await runs()).length;
      await run();
      assert.equal(await requests(), requestsBeforeRetry);
      assert.equal((await runs()).length, runsBeforeRetry);
    }
    cases.push('HTTP and conflicting-source failures propagate without changing verified prices');
    cases.push('30m, 2h, 6h retries retain active 12h scheduled recovery after attempt four');

    await due();
    await run();
    const recovered = await jobs();
    assert.equal(recovered.status, 'active');
    assert.equal(recovered.error_count, 0);
    assert.equal(recovered.last_error, null);
    assert.equal(recovered.success_count, successBeforeFailure + 1);
    for (const key of ['operational_state', 'operational_note', 'retry_attempt', 'last_failure_at', 'recovery_failure_count']) {
      assert.equal(key in recovered.job_config, false);
    }
    assert.equal(await observationCount(), 1);
    cases.push('valid evidence recovers automatically and clears failure state without duplicate samples');

    await due();
    const staleId = (await client.query(`INSERT INTO collector_job_runs
      (job_id,product_id,source_id,status,collector_kind,started_at,raw_payload)
      VALUES($1,$2,$3,'running','pricing_page',NOW() - INTERVAL '25 minutes','{"state":"started"}') RETURNING id`,
    [jobId, product.id, sourceId])).rows[0].id;
    const beforeStale = await requests();
    await run();
    const stale = (await client.query('SELECT * FROM collector_job_runs WHERE id=$1', [staleId])).rows[0];
    assert.equal(stale.status, 'failed');
    assert.equal(stale.raw_payload.state, 'stale_running_marked_failed');
    assert.equal((await jobs()).job_config.operational_state, 'recovery_retry_scheduled');
    assert.equal(await requests(), beforeStale);
    await due();
    await run();
    assert.equal((await jobs()).error_count, 0);
    assert.equal('recovery_failure_count' in (await jobs()).job_config, false);
    assert.equal((await runs()).some(row => row.status === 'running'), false);
    cases.push('timed-out execution closes, backs off and recovers without orphaned running rows');

    const observations = (await client.query('SELECT status,raw_payload FROM price_observations')).rows;
    assert.equal(observations.length, 1);
    assert.equal(observations[0].status, 'pending');
    assert.equal(observations[0].raw_payload.publication_eligible, false);
    assert.equal(observations[0].raw_payload.automatic_rule, null);
    assert.deepEqual(await prices(), originalPrices);
    assert.deepEqual(await lifecycle(), originalLifecycle);
    assert.deepEqual((await jobs()).job_config, config);
    cases.push('normal configuration remains pending-only; Web, iOS and lifecycle rows remain unchanged');
    const runResults = (await runs()).map(row => ({
      status: row.status, state: row.raw_payload.state ?? null,
      outcome: row.raw_payload.collection_outcome ?? null,
      inserted: row.raw_payload.inserted_observation_count ?? 0,
      skipped: row.raw_payload.skipped_observation_count ?? 0,
      failed_markets: row.raw_payload.failed_market_count ?? 0,
      published: row.raw_payload.published_price_count ?? 0,
    }));
    return { passed: true, cases, retry_minutes: retryMinutes, run_count: runResults.length,
      run_results: runResults, observation_count: observations.length, published_count: 0, http: 'fixtures only',
      time: 'retry deadlines advanced in disposable fixture only; no real observation window claimed' };
  } finally {
    assert.equal(path.dirname(root), tmpdir());
    assert.ok(path.basename(root).startsWith('geosub-claude-scheduler-'));
    await rm(root, { recursive: true, force: true });
  }
}
