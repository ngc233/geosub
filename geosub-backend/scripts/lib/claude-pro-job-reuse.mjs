import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { assertLocalPreflightConnection } from '../preflight-official-web-prices.mjs';
import { assertClaudeProSource } from './claude-pro-official-web.mjs';
import { ensureSource, loadDatabaseContext } from '../collect-official-web-prices.mjs';

import {
  assertClaudeReviewDatabase, claudeReviewPolicy, resolveClaudeReviewAdmission,
} from './claude-pro-review-admission.mjs';

const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const source = JSON.parse(readFileSync(new URL('../../data/official-web-price-sources.json', import.meta.url), 'utf8')).sources['claude-us-pro'];

export async function reuseClaudeProSnapshotJob({
  client, jobId, execute = false, expectedFingerprint, actorId, intent = 'reuse',
}) {
  if (!['reuse','enable','review','enable-review','revoke-review'].includes(intent)) throw Error('invalid_reuse_intent');
  if (execute && intent !== 'reuse' && !actorId) throw Error('valid_actor_id_required');
  assertLocalPreflightConnection(client.connectionParameters);
  if (['review','enable-review','revoke-review'].includes(intent)) {
    assertClaudeReviewDatabase(client.connectionParameters);
  }
  // Writes are deliberately unavailable to the existing preview and production databases.
  if (execute && !/^geosub_collector_test_claude_scheduler_[a-z0-9_]+$/.test(client.connectionParameters.database)) {
    throw Error('claude_job_reuse_requires_disposable_database');
  }
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(jobId ?? '')) throw Error('valid_job_id_required');
  if (execute && !/^[a-f0-9]{64}$/.test(expectedFingerprint ?? '')) throw Error('reviewed_configuration_fingerprint_required');
  if (actorId && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(actorId)) throw Error('valid_actor_id_required');
  assertClaudeProSource(source);
  if (source.auto_review) throw Error('claude_job_reuse_must_remain_pending_only');
  const result = { job_id: jobId, updated_jobs: 0, activated_jobs: 0, automatic_review: false, publication_count: 0 };
  await client.query(execute ? 'BEGIN' : 'BEGIN READ ONLY');
  let committed = false;
  try {
    await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'");
    const actual = (await client.query('SELECT current_database() AS name')).rows[0]?.name;
    if (actual !== client.connectionParameters.database) throw Error('reuse_database_identity_mismatch');
    if (!execute) {
      const mode = (await client.query('SHOW transaction_read_only')).rows[0]?.transaction_read_only;
      if (mode !== 'on') throw Error('reuse_preview_requires_read_only_transaction');
    }
    if (execute && ['review','enable-review','revoke-review'].includes(intent)) {
      const actor=(await client.query(`SELECT role::text,status::text FROM admin_users WHERE id=$1 FOR SHARE`,[actorId])).rows[0];
      if (!actor || actor.status !== 'active' || !['owner','admin'].includes(actor.role)) {
        throw Error('review_actor_not_authorized');
      }
    }
    const database = await loadDatabaseContext(client, source, ['US']);
    // Holding the product row during isolated application also blocks new FK-linked jobs/runs.
    const lock = execute ? ' FOR UPDATE' : '';
    const product = (await client.query(`SELECT category::text,status::text FROM products WHERE id=$1${lock}`,
      [database.product.id])).rows[0];
    if (product?.category !== 'ai' || product.status === 'archived') throw Error('canonical_product_not_eligible');
    const sharedLock = execute ? ' FOR SHARE' : '';
    const plans = (await client.query(`SELECT slug,billing_cycle::text,status::text FROM plans
      WHERE product_id=$1 AND slug='pro'${sharedLock}`, [database.product.id])).rows;
    if (plans.length !== 1 || plans[0].billing_cycle !== 'monthly' || plans[0].status === 'archived') {
      throw Error('canonical_pro_monthly_plan_not_eligible');
    }
    const country = (await client.query(`SELECT currency FROM countries WHERE code='US'${sharedLock}`)).rows[0];
    if (country?.currency !== 'USD') throw Error('canonical_us_currency_mismatch');
    const jobs = (await client.query(`SELECT id,product_id,source_id,job_type,schedule,status,job_config,error_count,updated_at
      FROM collector_jobs WHERE product_id=$1 ORDER BY id${lock}`, [database.product.id])).rows;
    const job = jobs.find(row => row.id === jobId);
    if (!job) throw Error('target_job_not_found_for_claude');
    const reviewPolicy=job.job_config?.official_web_review_policy;
    if (intent === 'enable' && reviewPolicy!==undefined && reviewPolicy!==null) {
      throw Error('review_policy_requires_explicit_control');
    }
    result.configuration_fingerprint = fingerprint({intent,job});
    if (execute && expectedFingerprint !== result.configuration_fingerprint) throw Error('job_configuration_changed');
    if (job.status !== 'paused' && !(['enable','enable-review','revoke-review'].includes(intent) && job.status === 'active')) {
      throw Error('pause_target_job_before_conversion');
    }
    if (['anomaly_watch','stale_refresh','coverage_refresh'].includes(job.schedule)) throw Error('one_off_repair_job_not_reusable');
    if (jobs.some(row => row.id !== job.id && row.status !== 'archived'
      && row.job_config?.collector_kind === 'pricing_page')) throw Error('another_price_job_already_exists');
    const running = (await client.query(`SELECT id FROM collector_job_runs
      WHERE job_id=$1 AND status='running' LIMIT 1`, [job.id])).rows;
    if (running.length) throw Error('target_job_still_running');
    const binding = job.source_id ? (await client.query('SELECT source_key FROM price_sources WHERE id=$1',
      [job.source_id])).rows[0]?.source_key : null;
    const configured = binding === source.source_key && job.job_type === 'ai_pricing'
      && job.job_config?.collector_kind === 'pricing_page'
      && job.job_config?.official_web_source_key === 'claude-us-pro'
      && JSON.stringify(job.job_config?.country_codes) === '["US"]';
    if (['review','enable-review'].includes(intent)) {
      const prices=(await client.query(`SELECT primary_source_id,status::text FROM region_prices
        WHERE product_id=$1 AND plan_id=$2 AND country_id=$3 AND billing_platform='web' AND price_type='list_price'
        ${execute?'FOR SHARE':''}`,[database.product.id,database.plans.get('pro').id,database.countries.get('US').id])).rows;
      if (prices.length > 1) throw Error('claude_review_price_identity_ambiguous');
      if (prices.some(price=>price.status === 'archived')) throw Error('claude_review_archived_price');
      if (prices.some(price=>price.primary_source_id && price.primary_source_id !== job.source_id)) {
        throw Error('claude_review_source_replacement_not_allowed');
      }
    }
    if (['review','revoke-review'].includes(intent)) {
      if (!configured) throw Error('configure_price_task_before_enabling');
      const admit=intent === 'review';
      if (admit) resolveClaudeReviewAdmission({source,policy:claudeReviewPolicy,
        connectionParameters:client.connectionParameters});
      const current=job.job_config?.official_web_review_policy;
      if (admit && current === claudeReviewPolicy) return {...result,state:'already_review_admitted'};
      if (!admit && !Object.hasOwn(job.job_config ?? {},'official_web_review_policy') && job.status === 'paused') return {...result,state:'already_review_disabled'};
      if (!execute) return {...result,state:admit?'review_admission_preview':'review_revocation_preview',
        review_policy:admit?claudeReviewPolicy:null,task_status_after_confirmation:'paused',
        automatic_review_after_confirmation:admit};
      const updated=await client.query(`UPDATE collector_jobs
        SET status='paused',next_run_at=NULL,updated_at=NOW(),
          job_config=CASE WHEN $2::boolean THEN job_config || jsonb_build_object('official_web_review_policy',$3::text)
            ELSE job_config - 'official_web_review_policy' END
        WHERE id=$1 RETURNING id`,[job.id,admit,claudeReviewPolicy]);
      if (updated.rowCount !== 1) throw Error('target_job_not_updated');
      await client.query(`INSERT INTO audit_logs(actor_id,action,target_type,target_id,note)
        VALUES($1,$2,'collector_job',$3,$4)`,[actorId,admit?'admit_claude_review':'revoke_claude_review',job.id,
          admit?'Admitted isolated Claude review; kept paused.':'Revoked isolated Claude review and paused task; retained prices and evidence.']);
      await client.query('COMMIT');
      committed=true;
      return {...result,state:admit?'review_admitted_paused':'review_disabled_paused',updated_jobs:1};
    }
    if (['enable','enable-review'].includes(intent)) {
      const policy=job.job_config?.official_web_review_policy;
      if (intent === 'enable-review') resolveClaudeReviewAdmission({source,policy,
        connectionParameters:client.connectionParameters});
      if (!configured) throw Error('configure_price_task_before_enabling');
      if (job.status === 'active') return {...result,state:'already_enabled',automatic_review:intent==='enable-review'};
      if (!execute) return {...result,state:'activation_preview',automatic_review_after_confirmation:intent==='enable-review'};
      const activated = await client.query(`UPDATE collector_jobs
        SET status='active',next_run_at=NOW(),updated_at=NOW()
        WHERE id=$1 AND status='paused' RETURNING id`, [job.id]);
      if (activated.rowCount !== 1) throw Error('target_job_not_updated');
      await client.query(`INSERT INTO audit_logs(actor_id,action,target_type,target_id,note)
        VALUES($1,'enable_official_web_collection','collector_job',$2,$3)`, [actorId,job.id,
          intent==='enable-review'?'Enabled isolated Claude automatic review; awaiting canonical scheduler.'
            :'Enabled pending-only Claude US Pro collection; awaiting canonical scheduler, no publication.']);
      await client.query('COMMIT');
      committed = true;
      return {...result,state:'collection_enabled',updated_jobs:1,activated_jobs:1,automatic_review:intent==='enable-review'};
    }
    if (configured) return { ...result, state: 'already_configured_paused' };
    if (job.job_config?.collector_kind !== 'official_site') throw Error('target_must_be_existing_snapshot_job');
    result.task_type_suggestion = 'ai_pricing';
    result.resets_legacy_retry_state = true;
    result.task_config_suggestion = {
      collector_kind: 'pricing_page', official_web_source_key: 'claude-us-pro', country_codes: ['US'],
    };
    if (!execute) return { ...result, state: 'conversion_preview' };
    const sourceId = await ensureSource(client, source);
    const updated = await client.query(`UPDATE collector_jobs
      SET source_id=$1,job_type='ai_pricing',next_run_at=NULL,error_count=0,last_error=NULL,
        job_config=(job_config - 'url' - 'official_web_review_policy' - 'operational_state' - 'operational_note'
          - 'retry_attempt' - 'retry_country_codes' - 'last_failure_at' - 'last_recovered_at'
          - 'recovery_failure_count') || $2::jsonb || jsonb_build_object(
            'official_web_conversion',jsonb_build_object('from','official_site',
              'previous_consecutive_errors',$4::int,'configured_at',NOW())),updated_at=NOW()
      WHERE id=$3 AND status='paused' RETURNING id`,
      [sourceId, JSON.stringify(result.task_config_suggestion), job.id, job.error_count]);
    if (updated.rowCount !== 1) throw Error('target_job_not_updated');
    if (actorId) {
      await client.query(`INSERT INTO audit_logs(actor_id,action,target_type,target_id,note)
        VALUES($1,'reuse_official_web_job','collector_job',$2,
          'Reused Claude snapshot task for pending-only US Pro Web collection; kept paused.')`, [actorId,job.id]);
    }
    await client.query('COMMIT');
    committed = true;
    return { ...result, state: 'converted_paused', updated_jobs: 1, source_upserted: true };
  } finally {
    if (!committed) await client.query('ROLLBACK');
  }
}
