import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reuseClaudeProSnapshotJob} from '../scripts/lib/claude-pro-job-reuse.mjs';
import {ensureSource,insertMarketObservations} from '../scripts/collect-official-web-prices.mjs';
import {fetchClaudeProSnapshot,claudeProHelpUrl} from '../scripts/lib/claude-pro-official-web.mjs';
import {claudeReviewPolicy,resolveClaudeReviewAdmission} from '../scripts/lib/claude-pro-review-admission.mjs';
import {assertSchedulerTestDatabase} from './claude-pro-scheduler-fixture.mjs';

const backend=fileURLToPath(new URL('../',import.meta.url));
export async function verifyClaudeReviewAdmission(client,databaseUrl) {
  const url=assertSchedulerTestDatabase(databaseUrl);
  assert.equal(url.pathname,'/'+client.connectionParameters.database);
  assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name,client.connectionParameters.database);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM products')).rows[0].n,0);
  const base=JSON.parse(await readFile(new URL('../data/official-web-price-sources.json',import.meta.url),'utf8')).sources['claude-us-pro'];
  const source=resolveClaudeReviewAdmission({source:base,policy:claudeReviewPolicy,connectionParameters:client.connectionParameters});
  const market=source.markets[0],cases=[];
  const product=(await client.query(`INSERT INTO products(slug,name,category,status)
    VALUES('claude','Claude admission fixture','ai','review') RETURNING id`)).rows[0];
  const plan=(await client.query(`INSERT INTO plans(product_id,slug,name,billing_cycle,status)
    VALUES($1,'pro','Pro','monthly','review') RETURNING id`,[product.id])).rows[0];
  const country=(await client.query(`INSERT INTO countries(code,name_zh,name_en,currency)
    VALUES('US','美国','United States','USD') RETURNING id`)).rows[0];
  const actorId=(await client.query(`INSERT INTO admin_users(email,password_hash,name,role)
    VALUES('review-fixture@local.test','unused fixture credential','Review fixture','owner') RETURNING id`)).rows[0].id;
  const sourceId=await ensureSource(client,base);
  const otherSource=await ensureSource(client,{...base,source_key:'claude-admission-other-fixture'});
  for(const [platform,price] of [['web',20],['ios',99]]) await client.query(`INSERT INTO region_prices
    (product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,price_type,
      primary_source_id,status,data_quality,last_checked_at)
    VALUES($1,$2,$3,$4,'USD',$4,$5,'list_price',$6,'published','verified',NOW()-INTERVAL '2 days')`,
    [product.id,plan.id,country.id,price,platform,sourceId]);
  const jobId=(await client.query(`INSERT INTO collector_jobs(product_id,source_id,job_type,schedule,status,job_config)
    VALUES($1,$2,'ai_pricing','daily_light','paused',$3::jsonb) RETURNING id`,
    [product.id,sourceId,JSON.stringify({collector_kind:'pricing_page',official_web_source_key:'claude-us-pro',
      country_codes:['US'],interval_hours:12,fixture_option:'preserve'})])).rows[0].id;
  const otherJob=(await client.query(`INSERT INTO collector_jobs(product_id,source_id,job_type,schedule,status,job_config)
    VALUES($1,$2,'price_check','daily_light','paused','{"collector_kind":"official_site"}') RETURNING *`,
    [product.id,otherSource])).rows[0];
  const job=async()=>(await client.query('SELECT * FROM collector_jobs WHERE id=$1',[jobId])).rows[0];
  const web=async()=>(await client.query("SELECT * FROM region_prices WHERE billing_platform='web'")).rows[0];
  const ios=(await client.query("SELECT * FROM region_prices WHERE billing_platform='ios'")).rows[0];
  const lifecycle=async()=>({
    product:(await client.query('SELECT status FROM products WHERE id=$1',[product.id])).rows[0].status,
    plan:(await client.query('SELECT status FROM plans WHERE id=$1',[plan.id])).rows[0].status,
  });
  const initialLifecycle=await lifecycle(),initialWeb=await web();
  const temp=await mkdtemp(path.join(tmpdir(),'geosub-claude-admission-'));
  try {
    const empty=path.join(temp,'empty.env'),log=path.join(temp,'http.jsonl');
    await writeFile(empty,'');await writeFile(log,'');
    const env={...process.env,DATABASE_URL:databaseUrl,GEOSUB_BACKEND_DIR:backend,
      GEOSUB_FRONTEND_DIR:path.resolve(backend,'../ai-price-site'),GEOSUB_ENV_FILE:empty,GEOSUB_COLLECTOR_ENV_FILE:empty,
      GEOSUB_DB_NAME:client.connectionParameters.database,GEOSUB_DB_CONTAINER:'admission-test-no-fallback',
      GEOSUB_COLLECTOR_JOB_LIMIT:'1',GEOSUB_CONTENT_DISTRIBUTION:'local',
      GEOSUB_COLLECTOR_LOCK_DIR:path.join(temp,'lock'),GEOSUB_COLLECTOR_LOCK_FILE:path.join(temp,'lock/collector.lock')};
    const command=(operation,token)=>{
      const args=[path.join(backend,'scripts/reuse-claude-pro-job.mjs'),'--id',jobId,'--operation',operation,'--actor-id',actorId];
      if(token)args.push('--fingerprint',token);
      const result=spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:30000});
      assert.equal(result.status,0);
      return JSON.parse(result.stdout);
    };
    const configure=(preview,apply)=>{
      const checked=command(preview);assert.equal(checked.ok,true,checked.error_code);
      const result=command(apply,checked.result.configuration_fingerprint);assert.equal(result.ok,true,result.error_code);
      return result.result;
    };
    const run=async(mode='valid',due=true,extra=[])=>{
      if(due)await client.query('UPDATE collector_jobs SET next_run_at=NOW() WHERE id=$1',[jobId]);
      const result=spawnSync('bash',[path.join(backend,'deploy/linux-arm64/run-collector-jobs.sh'),'-JobId',jobId,...extra],{
        env:{...env,GEOSUB_CLAUDE_SCHEDULER_FIXTURE:'1',GEOSUB_CLAUDE_SCHEDULER_MODE:mode,
          GEOSUB_CLAUDE_SCHEDULER_LOG:log,NODE_OPTIONS:'--import='+path.join(backend,'tests/claude-pro-scheduler-fixture.mjs')},
        encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,
      });
      return result.status;
    };
    const latestRun=async()=>(await client.query(`SELECT raw_payload FROM collector_job_runs
      WHERE job_id=$1 ORDER BY started_at DESC LIMIT 1`,[jobId])).rows[0].raw_payload;
    const review=async()=>(await latestRun()).markets[0].auto_review;
    const clear=()=>client.query('DELETE FROM price_observations WHERE product_id=$1',[product.id]);
    const pricing=await readFile(new URL('../scripts/fixtures/claude-pro-pricing.html',import.meta.url),'utf8');
    const help=await readFile(new URL('../scripts/fixtures/claude-pro-help.html',import.meta.url),'utf8');
    const database={product,plans:new Map([['pro',plan]]),countries:new Map([['US',country]])};
    const seed=async hours=>{
      const snapshot=await fetchClaudeProSnapshot(market,{now:()=>new Date(Date.now()-hours*3600000),
        fetchImpl:async address=>new Response(address===market.url?pricing:help,{headers:{'content-type':'text/html'}})});
      assert.equal((await insertMarketObservations({client,source,market,database,sourceId,snapshot,force:false})).inserted,1);
    };
    configure('enable-preview','enable');
    assert.equal(await run(),0);
    const ordinary=(await client.query('SELECT * FROM price_observations')).rows[0];
    assert.equal(ordinary.status,'pending');assert.equal(ordinary.raw_payload.publication_eligible,false);
    assert.equal((await latestRun()).published_price_count,0);
    await client.query("UPDATE collector_jobs SET status='paused' WHERE id=$1",[jobId]);
    cases.push('default canonical execution remains pending-only');

    await client.query("UPDATE region_prices SET primary_source_id=$1 WHERE billing_platform='web'",[otherSource]);
    assert.equal(command('review-preview').error_code,'claude_review_source_replacement_not_allowed');
    await client.query("UPDATE region_prices SET primary_source_id=$1 WHERE billing_platform='web'",[sourceId]);
    cases.push('admission rejects replacement of an existing formal source');
    const admissionBaseline=await web();

    const before=await job(),preview=command('review-preview');
    assert.equal(preview.result.state,'review_admission_preview');assert.deepEqual(await job(),before);
    await client.query(`UPDATE collector_jobs SET job_config=job_config || '{"changed_fixture":true}'::jsonb WHERE id=$1`,[jobId]);
    assert.equal(command('review-apply',preview.result.configuration_fingerprint).error_code,'job_configuration_changed');
    await client.query("UPDATE collector_jobs SET job_config=job_config - 'changed_fixture' WHERE id=$1",[jobId]);
    cases.push('admission preview is read-only and stale confirmation cannot apply');

    const viewer=(await client.query(`INSERT INTO admin_users(email,password_hash,name,role,status)
      VALUES('review-viewer@local.test','unused fixture credential','Viewer fixture','viewer','active') RETURNING id`)).rows[0].id;
    await assert.rejects(reuseClaudeProSnapshotJob({client,jobId,intent:'review',execute:true,
      expectedFingerprint:command('review-preview').result.configuration_fingerprint,actorId:viewer}),/review_actor_not_authorized/);
    assert.equal((await job()).job_config.official_web_review_policy,undefined);
    cases.push('review mutation requires an active management-role audit identity');

    const fresh=command('review-preview').result.configuration_fingerprint;
    const broken={connectionParameters:client.connectionParameters,async query(sql,args){
      if(sql.includes('INSERT INTO audit_logs'))throw Error('fixture_admission_audit_failure');
      return client.query(sql,args);
    }};
    const beforeFailure=await job();
    await assert.rejects(reuseClaudeProSnapshotJob({client:broken,jobId,intent:'review',execute:true,
      expectedFingerprint:fresh,actorId}),/fixture_admission_audit_failure/);
    assert.deepEqual(await job(),beforeFailure);
    cases.push('admission audit failure rolls back its configuration change');

    const admitted=configure('review-preview','review-apply');
    assert.equal(admitted.state,'review_admitted_paused');assert.equal((await job()).status,'paused');
    assert.equal((await job()).job_config.official_web_review_policy,claudeReviewPolicy);
    assert.equal(configure('review-preview','review-apply').updated_jobs,0);
    const rejected=command('enable',command('enable-preview').result?.configuration_fingerprint ?? 'a'.repeat(64));
    assert.equal(rejected.error_code,'review_policy_requires_explicit_control');
    configure('review-enable-preview','review-enable');
    assert.equal((await job()).status,'active');
    assert.equal(await run(),0);
    assert.equal((await review()).published,0);
    assert.deepEqual(await web(),admissionBaseline);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM price_observations WHERE status='approved'")).rows[0].n,0);
    cases.push('admission stays paused, is idempotent, and normal activation cannot bypass explicit review control');
    cases.push('legacy pending-only evidence cannot satisfy the admitted review');

    await clear();assert.equal(await run(),0);
    assert.equal((await review()).published,0);
    assert.equal((await review()).decisions[0].reason,'awaiting_samples');
    const first=(await client.query('SELECT * FROM price_observations')).rows[0];
    assert.equal(first.raw_payload.review_admission_policy,claudeReviewPolicy);
    assert.equal(first.raw_payload.publication_eligible,true);
    assert.equal(first.status,'pending');
    assert.equal(await run(),0);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM price_observations')).rows[0].n,1);
    cases.push('normal admitted CLI marks evidence and waits; rapid retries cannot inflate sample count');

    await clear();await seed(25);await seed(13);
    const beforeSkip=await web();
    assert.equal(await run('valid',true,['-SkipAutoReview']),0);
    assert.deepEqual(await web(),beforeSkip);assert.equal((await latestRun()).published_price_count,0);
    assert.equal(await run(),0);
    assert.equal((await review()).published,1);
    assert.equal(Number((await web()).local_price),20);
    assert.deepEqual(await lifecycle(),initialLifecycle);
    assert.deepEqual((await client.query("SELECT * FROM region_prices WHERE billing_platform='ios'")).rows[0],ios);
    cases.push('three independent samples update Web only through the actual scheduler; SkipAutoReview still works');
    const stable=await web();
    assert.equal(await run(),0);assert.equal((await review()).published,0);assert.deepEqual(await web(),stable);
    cases.push('repeated canonical review is idempotent');

    await clear();await seed(25);await seed(13);
    const missing=(await client.query('SELECT id FROM price_observations ORDER BY observed_at DESC LIMIT 1')).rows[0].id;
    await client.query('DELETE FROM source_evidence WHERE observation_id=$1 AND final_url=$2',[missing,claudeProHelpUrl]);
    assert.equal(await run(),0);assert.equal((await review()).published,0);
    assert.equal((await review()).decisions[0].reason,'incomplete_or_anomalous_evidence');
    assert.deepEqual(await web(),stable);
    cases.push('missing corroborating evidence blocks the normal review and preserves the formal price');

    assert.notEqual(await run('mismatch'),0);assert.deepEqual(await web(),stable);
    const failed=await job();assert.equal(failed.error_count,1);
    assert.equal((failed.next_run_at-failed.last_run_at)/60000,30);
    // Synthetic fixture history only: later independent valid samples occur after this failure.
    await client.query('DELETE FROM price_observations WHERE NOT anomaly_flag');
    await client.query(`UPDATE price_observations SET observed_at=NOW()-INTERVAL '49 hours'
      WHERE anomaly_flag`);
    await client.query(`UPDATE source_evidence e SET captured_at=o.observed_at
      FROM price_observations o WHERE e.observation_id=o.id AND o.anomaly_flag`);
    await seed(25);await seed(13);assert.equal(await run(),0);
    assert.equal((await review()).published,1);assert.equal((await job()).error_count,0);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM price_observations WHERE anomaly_flag AND status='ignored'")).rows[0].n,1);
    cases.push('source disagreement preserves price and retries; later valid evidence automatically recovers and closes old anomaly');

    await clear();
    await client.query("UPDATE region_prices SET local_price=30,price_usd=30 WHERE billing_platform='web'");
    const largeBaseline=await web();
    await seed(25);await seed(13);assert.equal(await run(),0);
    assert.equal((await review()).published,0);
    assert.equal((await review()).decisions[0].reason,'large_change_extended_observation');
    assert.deepEqual(await web(),largeBaseline);
    await clear();for(const hours of [73,55,37,19])await seed(hours);
    assert.equal(await run(),0);assert.equal((await review()).published,1);
    assert.equal(Number((await web()).local_price),20);
    cases.push('greater-than-30-percent change waits for five samples spanning 72 hours');

    const beforeRevoke=await web(),history=(await client.query('SELECT count(*)::int AS n FROM collector_job_runs')).rows[0].n;
    assert.equal(configure('review-revoke-preview','review-revoke').state,'review_disabled_paused');
    assert.equal((await job()).status,'paused');assert.equal((await job()).job_config.official_web_review_policy,undefined);
    assert.equal(configure('review-revoke-preview','review-revoke').updated_jobs,0);
    const requests=(await readFile(log,'utf8')).trim().split('\n').length;
    assert.equal(await run('valid',false),0);
    assert.equal((await readFile(log,'utf8')).trim().split('\n').length,requests);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM collector_job_runs')).rows[0].n,history);
    assert.deepEqual(await web(),beforeRevoke);
    cases.push('revocation is idempotent, pauses execution and preserves price/history');

    await clear();configure('enable-preview','enable');assert.equal(await run(),0);
    const downgraded=(await client.query('SELECT * FROM price_observations')).rows[0];
    assert.equal(downgraded.status,'pending');assert.equal(downgraded.raw_payload.publication_eligible,false);
    assert.equal(downgraded.raw_payload.review_admission_policy,undefined);
    assert.deepEqual(await web(),beforeRevoke);
    cases.push('ordinary collection after revocation returns to pending-only without publication');

    for(const action of ['admit_claude_review','revoke_claude_review']){
      const audit=(await client.query('SELECT actor_id,target_id FROM audit_logs WHERE action=$1',[action])).rows;
      assert.equal(audit.length,1);assert.equal(audit[0].actor_id,actorId);assert.equal(audit[0].target_id,jobId);
    }
    assert.deepEqual((await client.query('SELECT * FROM collector_jobs WHERE id=$1',[otherJob.id])).rows[0],otherJob);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM collector_jobs')).rows[0].n,2);
    assert.deepEqual(await lifecycle(),initialLifecycle);
    assert.deepEqual((await client.query("SELECT * FROM region_prices WHERE billing_platform='ios'")).rows[0],ios);
    assert.equal(base.auto_review,undefined);
    return {passed:true,cases,scope:'owned disposable database',http:'fixed fixtures only',
      synthetic_history:'declared independent-sample fixtures, not real elapsed observation',
      admission_audits:1,revocation_audits:1,new_tasks:0,ios_unchanged:true,lifecycle_unchanged:true,
      final_mode:'pending-only',final_web_price:20,initial_web_price:Number(initialWeb.local_price)};
  } finally {
    assert.equal(path.dirname(temp),tmpdir());assert.ok(path.basename(temp).startsWith('geosub-claude-admission-'));
    await rm(temp,{recursive:true,force:true});
  }
}
