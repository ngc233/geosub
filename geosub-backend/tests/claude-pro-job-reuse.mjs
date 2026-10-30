import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reuseClaudeProSnapshotJob } from '../scripts/lib/claude-pro-job-reuse.mjs';
import { ensureSource } from '../scripts/collect-official-web-prices.mjs';
import { preflightOfficialWebPrices, assertLocalPreflightConnection } from '../scripts/preflight-official-web-prices.mjs';
import { assertSchedulerTestDatabase } from './claude-pro-scheduler-fixture.mjs';

const backend = fileURLToPath(new URL('../', import.meta.url));

export async function verifyClaudeProJobReuse(client, databaseUrl) {
  assertLocalPreflightConnection(client.connectionParameters);
  const url = assertSchedulerTestDatabase(databaseUrl);
  assert.equal(url.pathname,'/'+client.connectionParameters.database);
  assert.equal(url.hostname === '[::1]' ? '::1' : url.hostname,client.connectionParameters.host);
  const actual = (await client.query('SELECT current_database() AS name')).rows[0].name;
  assert.equal(actual,client.connectionParameters.database);
  assert.match(client.connectionParameters.database, /^geosub_collector_test_claude_scheduler_/);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM products')).rows[0].n, 0);
  const sources = JSON.parse(await readFile(new URL('../data/official-web-price-sources.json', import.meta.url), 'utf8')).sources;
  const source = sources['claude-us-pro'];
  const product = (await client.query(`INSERT INTO products(slug,name,category,status)
    VALUES('claude','Claude reuse fixture','ai','review') RETURNING id`)).rows[0];
  const plan = (await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
    VALUES($1,'pro','Pro','monthly','review') RETURNING id`, [product.id])).rows[0];
  const country = (await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
    VALUES('US','美国','United States','USD') RETURNING id`)).rows[0];
  const legacySourceA = await ensureSource(client, {...source, source_key:'claude-legacy-a', source_name:'Legacy fixture A'});
  const legacySourceB = await ensureSource(client, {...source, source_key:'claude-legacy-b', source_name:'Legacy fixture B'});
  for (const [platform,price] of [['web',20],['ios',99]]) {
    await client.query(`INSERT INTO region_prices
      (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
        primary_source_id,status,data_quality,last_checked_at)
      VALUES($1,$2,$3,$4,'USD',$4,$5,'list_price',$6,'published','verified',NOW() - INTERVAL '2 days')`,
    [product.id,plan.id,country.id,price,platform,legacySourceA]);
  }
  const createJob = async (sourceId, config) => (await client.query(`INSERT INTO collector_jobs
    (product_id,source_id,job_type,schedule,status,next_run_at,job_config,success_count,error_count,last_error,priority)
    VALUES($1,$2,'price_check','daily_light','paused',NOW() + INTERVAL '1 day',$3::jsonb,7,2,'fixture prior failure',77)
    RETURNING id`, [product.id,sourceId,JSON.stringify(config)])).rows[0].id;
  const oldConfig = {collector_kind:'official_site',url:'https://example.invalid/?token=private-fixture',
    country_codes:['ALL'],interval_hours:12,fixture_option:'preserve',
    operational_state:'app_store_partial_retry',retry_attempt:2,retry_country_codes:['CA']};
  const jobId = await createJob(legacySourceA, oldConfig);
  const otherJobId = await createJob(legacySourceB, {...oldConfig,fixture_option:'other'});
  await client.query(`INSERT INTO collector_job_runs
    (job_id,product_id,source_id,status,collector_kind,started_at,finished_at,raw_payload,output_excerpt)
    VALUES($1,$2,$3,'succeeded','official_site',NOW() - INTERVAL '2 days',NOW() - INTERVAL '2 days',
      '{"collection_outcome":"source_monitoring_only"}','fixture old snapshot')`, [jobId,product.id,legacySourceA]);
  await client.query(`INSERT INTO collector_job_runs
    (job_id,product_id,source_id,status,collector_kind,started_at,finished_at,error_message)
    VALUES($1,$2,$3,'failed','official_site',NOW() - INTERVAL '1 day',NOW() - INTERVAL '1 day',
      'fixture prior failure')`, [jobId,product.id,legacySourceA]);
  const job = async id => (await client.query('SELECT * FROM collector_jobs WHERE id=$1',[id])).rows[0];
  const history = async () => (await client.query('SELECT * FROM collector_job_runs WHERE job_id=$1 ORDER BY started_at',[jobId])).rows;
  const prices = async () => (await client.query('SELECT * FROM region_prices ORDER BY billing_platform')).rows;
  const lifecycle = async () => ({
    product:(await client.query('SELECT status FROM products WHERE id=$1',[product.id])).rows[0].status,
    plan:(await client.query('SELECT status FROM plans WHERE id=$1',[plan.id])).rows[0].status,
  });
  const initial = await job(jobId), otherInitial = await job(otherJobId);
  const oldHistory = await history(), oldPrices = await prices(), oldLifecycle = await lifecycle();
  const oldSources = (await client.query('SELECT * FROM price_sources ORDER BY source_key')).rows;
  const preview = () => reuseClaudeProSnapshotJob({client,jobId});
  const apply = async (targetClient = client, token) => reuseClaudeProSnapshotJob({client:targetClient,jobId,execute:true,
    expectedFingerprint:token ?? (await preview()).configuration_fingerprint});
  const cases = [];

  const proposal = await preview();
  assert.equal(proposal.state,'conversion_preview');
  assert.equal(JSON.stringify(proposal).includes('private-fixture'),false);
  assert.deepEqual(await job(jobId),initial);
  assert.deepEqual(await history(),oldHistory);
  cases.push('preview performs no writes and exposes no legacy URL');

  await client.query("UPDATE collector_jobs SET status='active' WHERE id=$1",[jobId]);
  await assert.rejects(preview(),/pause_target_job/);
  await client.query("UPDATE collector_jobs SET status='paused' WHERE id=$1",[jobId]);
  cases.push('active target must be paused first');

  const running = (await client.query(`INSERT INTO collector_job_runs
    (job_id,product_id,source_id,status,collector_kind,started_at)
    VALUES($1,$2,$3,'running','official_site',NOW()) RETURNING id`,[jobId,product.id,legacySourceA])).rows[0].id;
  await assert.rejects(preview(),/target_job_still_running/);
  await client.query('DELETE FROM collector_job_runs WHERE id=$1',[running]);
  cases.push('in-flight target cannot be converted');

  const duplicate = (await client.query(`INSERT INTO collector_jobs
    (product_id,source_id,job_type,schedule,status,job_config)
    VALUES($1,$2,'ai_pricing','daily','paused','{"collector_kind":"pricing_page","official_web_source_key":"claude-us-pro"}') RETURNING id`,
  [product.id,legacySourceB])).rows[0].id;
  await assert.rejects(preview(),/another_price_job_already_exists/);
  await client.query('DELETE FROM collector_jobs WHERE id=$1',[duplicate]);
  cases.push('another price task blocks redundant conversion');

  const stale = await preview();
  await client.query(`UPDATE collector_jobs SET job_config=job_config || '{"concurrent_change":true}'::jsonb WHERE id=$1`,[jobId]);
  const changed = await job(jobId);
  await assert.rejects(apply(client,stale.configuration_fingerprint),/job_configuration_changed/);
  assert.deepEqual(await job(jobId),changed);
  await client.query("UPDATE collector_jobs SET job_config=job_config - 'concurrent_change' WHERE id=$1",[jobId]);
  cases.push('stale preview never overwrites a newer configuration');

  await client.query("UPDATE plans SET billing_cycle='yearly' WHERE id=$1",[plan.id]);
  await assert.rejects(preview(),/canonical_plan_billing_cycle_mismatch/);
  await client.query("UPDATE plans SET billing_cycle='monthly' WHERE id=$1",[plan.id]);
  cases.push('canonical plan is revalidated rather than trusting the preview');

  const beforeFailure = await job(jobId);
  const fault = {connectionParameters:client.connectionParameters,query:async (sql,...values) => {
    if (sql.startsWith('UPDATE collector_jobs')) throw Error('fixture_update_failure');
    return client.query(sql,...values);
  }};
  await assert.rejects(apply(fault),/fixture_update_failure/);
  assert.deepEqual(await job(jobId),beforeFailure);
  assert.deepEqual((await client.query('SELECT * FROM price_sources ORDER BY source_key')).rows,oldSources);
  cases.push('failed conversion rolls back source upsert and task update atomically');

  const applied = await apply();
  assert.equal(applied.state,'converted_paused');
  assert.equal(applied.updated_jobs,1);
  assert.equal(applied.activated_jobs,0);
  const converted = await job(jobId);
  assert.equal(converted.id,initial.id);
  assert.equal(converted.status,'paused');
  assert.equal(converted.job_type,'ai_pricing');
  assert.equal(converted.next_run_at,null);
  assert.equal(converted.job_config.collector_kind,'pricing_page');
  assert.equal(converted.job_config.official_web_source_key,'claude-us-pro');
  assert.deepEqual(converted.job_config.country_codes,['US']);
  assert.equal('url' in converted.job_config,false);
  assert.equal(converted.job_config.fixture_option,'preserve');
  assert.equal(converted.error_count,0);
  assert.equal(converted.last_error,null);
  assert.equal(converted.job_config.official_web_conversion.previous_consecutive_errors,2);
  for (const key of ['operational_state','retry_attempt','retry_country_codes']) {
    assert.equal(key in converted.job_config,false);
  }
  for (const field of ['schedule','priority','success_count','last_run_at','created_at']) {
    assert.deepEqual(converted[field],initial[field]);
  }
  assert.deepEqual(await job(otherJobId),otherInitial);
  assert.deepEqual(await history(),oldHistory);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM collector_jobs')).rows[0].n,2);
  assert.deepEqual((await client.query('SELECT * FROM price_sources WHERE id=ANY($1::uuid[]) ORDER BY source_key',
    [[legacySourceA,legacySourceB]])).rows,oldSources);
  cases.push('conversion preserves ID, historical runs, cumulative success, interval and unrelated task/source; resets legacy retry context');

  const repeated = await preview();
  assert.equal(repeated.state,'already_configured_paused');
  const repeatApply = await apply(client,repeated.configuration_fingerprint);
  assert.equal(repeatApply.updated_jobs,0);
  assert.deepEqual(await job(jobId),converted);
  cases.push('repeated conversion is idempotent and does not activate collection');

  const preflight = await preflightOfficialWebPrices({client,sources,sourceKey:'claude-us-pro',countryCodes:['US']});
  assert.equal(preflight.state,'price_job_not_active');
  assert.equal(preflight.collection_ready,true);
  assert.equal(preflight.task_ready,false);
  cases.push('preflight recognizes the correctly configured but paused price task');

  const actorId = (await client.query(`INSERT INTO admin_users(email,password_hash,name,role)
    VALUES('activation-fixture@local.test','unused fixture credential','Activation fixture','owner') RETURNING id`)).rows[0].id;
  const activationPreview = () => reuseClaudeProSnapshotJob({client,jobId,intent:'enable'});
  const activate = async (targetClient=client,token) => reuseClaudeProSnapshotJob({
    client:targetClient,jobId,intent:'enable',execute:true,actorId,
    expectedFingerprint:token ?? (await activationPreview()).configuration_fingerprint,
  });
  const ready = await activationPreview();
  assert.equal(ready.state,'activation_preview');
  assert.deepEqual(await job(jobId),converted);
  await assert.rejects(activate(client,repeated.configuration_fingerprint),/job_configuration_changed/);
  cases.push('activation preview is read only and reuse fingerprints cannot authorize activation');

  await client.query(`UPDATE collector_jobs SET job_config=job_config || '{"enable_change":true}'::jsonb WHERE id=$1`,[jobId]);
  await assert.rejects(activate(client,ready.configuration_fingerprint),/job_configuration_changed/);
  await client.query("UPDATE collector_jobs SET job_config=job_config - 'enable_change' WHERE id=$1",[jobId]);
  cases.push('activation rejects a stale preview without overwriting configuration');

  const activationRun = (await client.query(`INSERT INTO collector_job_runs
    (job_id,product_id,source_id,status,collector_kind,started_at)
    VALUES($1,$2,$3,'running','pricing_page',NOW()) RETURNING id`,[jobId,product.id,converted.source_id])).rows[0].id;
  await assert.rejects(activationPreview(),/target_job_still_running/);
  await client.query('DELETE FROM collector_job_runs WHERE id=$1',[activationRun]);
  cases.push('activation refuses a task with an in-flight run');

  const activationDuplicate = (await client.query(`INSERT INTO collector_jobs
    (product_id,source_id,job_type,schedule,status,job_config)
    VALUES($1,$2,'ai_pricing','daily','paused','{"collector_kind":"pricing_page"}') RETURNING id`,
    [product.id,converted.source_id])).rows[0].id;
  await assert.rejects(activationPreview(),/another_price_job_already_exists/);
  await client.query('DELETE FROM collector_jobs WHERE id=$1',[activationDuplicate]);
  await client.query("UPDATE plans SET status='archived' WHERE id=$1",[plan.id]);
  await assert.rejects(activationPreview(),/canonical_pro_monthly_plan_not_eligible/);
  await client.query("UPDATE plans SET status=$2 WHERE id=$1",[plan.id,oldLifecycle.plan]);
  cases.push('activation rechecks competing tasks and archived catalog identity');

  const beforeActivation = await job(jobId);
  const failedAudit = {connectionParameters:client.connectionParameters,async query(sql,args) {
    if (sql.includes('INSERT INTO audit_logs')) throw Error('fixture_activation_audit_failure');
    return client.query(sql,args);
  }};
  await assert.rejects(activate(failedAudit),/fixture_activation_audit_failure/);
  assert.deepEqual(await job(jobId),beforeActivation);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM audit_logs WHERE action='enable_official_web_collection'")).rows[0].n,0);
  cases.push('audit failure rolls activation back atomically');

  const enabled = await activate();
  assert.equal(enabled.state,'collection_enabled');
  assert.equal(enabled.activated_jobs,1);
  const activeJob = await job(jobId);
  assert.equal(activeJob.status,'active');assert.ok(activeJob.next_run_at <= new Date());
  assert.equal(activeJob.source_id,converted.source_id);
  assert.deepEqual(activeJob.job_config,converted.job_config);
  assert.equal(activeJob.error_count,converted.error_count);
  assert.deepEqual(await history(),oldHistory);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM price_observations')).rows[0].n,0);
  const audit = (await client.query("SELECT actor_id,target_id FROM audit_logs WHERE action='enable_official_web_collection'")).rows;
  assert.equal(audit.length,1);assert.equal(audit[0].actor_id,actorId);assert.equal(audit[0].target_id,jobId);
  const already = await activationPreview();
  assert.equal(already.state,'already_enabled');
  assert.equal((await activate(client,already.configuration_fingerprint)).activated_jobs,0);
  assert.deepEqual(await job(jobId),activeJob);
  cases.push('activation preserves configuration and history, audits once, and repeated activation is idempotent');

  const root = await mkdtemp(path.join(tmpdir(),'geosub-claude-reuse-'));
  try {
    const envFile = path.join(root,'empty.env'), log = path.join(root,'fetch.jsonl');
    await writeFile(envFile,''); await writeFile(log,'');
    const executeScheduler = mode => spawnSync('bash',[path.join(backend,'deploy/linux-arm64/run-collector-jobs.sh'),'-JobId',jobId],{
      env:{...process.env,DATABASE_URL:databaseUrl,
        GEOSUB_BACKEND_DIR:backend,GEOSUB_FRONTEND_DIR:path.resolve(backend,'../ai-price-site'),
        GEOSUB_ENV_FILE:envFile,GEOSUB_COLLECTOR_ENV_FILE:envFile,GEOSUB_DB_NAME:client.connectionParameters.database,
        GEOSUB_DB_CONTAINER:'reuse-test-no-fallback',GEOSUB_COLLECTOR_JOB_LIMIT:'1',GEOSUB_CONTENT_DISTRIBUTION:'local',
        GEOSUB_COLLECTOR_LOCK_DIR:path.join(root,'lock'),GEOSUB_COLLECTOR_LOCK_FILE:path.join(root,'lock/collector.lock'),
        GEOSUB_CLAUDE_SCHEDULER_FIXTURE:'1',GEOSUB_CLAUDE_SCHEDULER_MODE:mode,GEOSUB_CLAUDE_SCHEDULER_LOG:log,
        NODE_OPTIONS:'--import='+path.join(backend,'tests/claude-pro-scheduler-fixture.mjs')},
      encoding:'utf8',timeout:30_000,maxBuffer:2*1024*1024,
    });
    const failure = executeScheduler('http503');
    assert.notEqual(failure.status,0);
    const retry = await job(jobId);
    assert.equal(retry.error_count,1);
    assert.equal((retry.next_run_at - retry.last_run_at) / 60_000,30);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM price_observations')).rows[0].n,0);
    cases.push('new source failure starts at attempt one and 30-minute retry rather than inheriting legacy errors');
    await client.query('UPDATE collector_jobs SET next_run_at=NOW() WHERE id=$1',[jobId]);
    const result = executeScheduler('valid');
    assert.equal(result.status,0,String(result.stdout+result.stderr).replaceAll(databaseUrl,'[redacted]'));
    assert.equal((await readFile(log,'utf8')).trim().split('\n').length,3);
    const observations = (await client.query('SELECT * FROM price_observations')).rows;
    assert.equal(observations.length,1);
    assert.equal(observations[0].status,'pending');
    assert.equal(observations[0].raw_payload.publication_eligible,false);
    assert.equal(observations[0].source_id,converted.source_id);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM source_evidence')).rows[0].n,2);
    const runs = await history();
    assert.equal(runs.length,oldHistory.length+2);
    assert.deepEqual(runs.slice(0,oldHistory.length),oldHistory);
    assert.equal(runs.at(-1).status,'succeeded');
    assert.equal(runs.at(-1).collector_kind,'pricing_page');
    assert.equal(runs.at(-1).source_id,observations[0].source_id);
    assert.equal(runs.at(-1).raw_payload.published_price_count,0);
    assert.deepEqual(await job(otherJobId),otherInitial);
    assert.deepEqual(await prices(),oldPrices);
    assert.deepEqual(await lifecycle(),oldLifecycle);
  } finally {
    assert.equal(path.dirname(root),tmpdir());
    assert.ok(path.basename(root).startsWith('geosub-claude-reuse-'));
    await rm(root,{recursive:true,force:true});
  }
  cases.push('real scheduler uses the converted source and writes one pending observation with two fixture evidences');
  return {passed:true,cases,converted_jobs:1,new_jobs:0,activated_by_converter:0,activated_by_enabler:1,activation_audits:1,
    observation_count:1,evidence_count:2,published_count:0,http:'fixtures only',scope:'owned disposable database only'};
}
