#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { assertLocalPreflightConnection } from './preflight-official-web-prices.mjs';
import { reuseClaudeProSnapshotJob } from './lib/claude-pro-job-reuse.mjs';

export const reuseErrorCodes = new Set([
  'local_preflight_database_required','claude_job_reuse_requires_disposable_database','valid_job_id_required',
  'configure_price_task_before_enabling','review_policy_requires_explicit_control',
  'review_actor_not_authorized',
  'claude_review_admission_requires_disposable_database','unknown_claude_review_admission_policy',
  'claude_review_source_replacement_not_allowed','claude_review_archived_price','claude_review_price_identity_ambiguous',
  'reviewed_configuration_fingerprint_required','job_configuration_changed','pause_target_job_before_conversion',
  'another_price_job_already_exists','target_job_still_running','one_off_repair_job_not_reusable',
  'target_must_be_existing_snapshot_job','target_job_not_found_for_claude','canonical_product_not_eligible',
  'canonical_pro_monthly_plan_not_eligible','canonical_us_currency_mismatch','missing_canonical_product',
  'missing_canonical_plans','missing_canonical_countries','canonical_plan_billing_cycle_mismatch',
]);

async function main() {
  const options = new Map();
  for (let index=2;index<process.argv.length;index+=2) {
    const key=process.argv[index],value=process.argv[index+1];
    if (!['--id','--operation','--fingerprint','--actor-id'].includes(key) || !value || value.startsWith('--')) {
      throw Error('invalid_reuse_arguments');
    }
    options.set(key,value);
  }
  const operation=options.get('--operation');
  const intents={
    preview:'reuse',apply:'reuse','enable-preview':'enable',enable:'enable',
    'review-preview':'review','review-apply':'review',
    'review-enable-preview':'enable-review','review-enable':'enable-review',
    'review-revoke-preview':'revoke-review','review-revoke':'revoke-review',
  };
  if (!Object.hasOwn(intents,operation)) throw Error('invalid_reuse_arguments');
  const execute=['apply','enable','review-apply','review-enable','review-revoke'].includes(operation);
  const actorId=options.get('--actor-id');
  if (execute && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(actorId ?? '')) {
    throw Error('invalid_reuse_arguments');
  }
  const url=new URL(process.env.DATABASE_URL);
  if (!['postgres:','postgresql:'].includes(url.protocol)) throw Error('local_preflight_database_required');
  assertLocalPreflightConnection({host:url.hostname==='[::1]'?'::1':url.hostname,port:url.port,database:url.pathname.slice(1)});
  const frontend=process.env.GEOSUB_FRONTEND_DIR || fileURLToPath(new URL('../../ai-price-site/',import.meta.url));
  const requireFromSite=createRequire(path.join(frontend,'package.json'));
  const {Client}=requireFromSite('pg');
  const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:5_000});
  assertLocalPreflightConnection(client.connectionParameters);
  if (execute && !/^geosub_collector_test_claude_scheduler_[a-z0-9_]+$/.test(client.connectionParameters.database)) {
    throw Error('claude_job_reuse_requires_disposable_database');
  }
  try {
    await client.connect();
    const result=await reuseClaudeProSnapshotJob({client,jobId:options.get('--id'),execute,intent:intents[operation],
      expectedFingerprint:options.get('--fingerprint'),actorId:execute?actorId:undefined});
    console.log(JSON.stringify({ok:true,result}));
  } finally { await client.end().catch(()=>{}); }
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(error=>{
    const code=String(error?.message ?? '').split(':')[0];
    console.log(JSON.stringify({ok:false,error_code:reuseErrorCodes.has(code)?code:'reuse_operation_failed'}));
  });
}
