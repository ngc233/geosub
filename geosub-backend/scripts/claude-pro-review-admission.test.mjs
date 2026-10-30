import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {
  assertClaudeReviewDatabase,claudeReviewConnectionFromUrl,claudeReviewPolicy,resolveClaudeReviewAdmission,
} from './lib/claude-pro-review-admission.mjs';
import {claudeProRule} from './lib/claude-pro-official-web.mjs';
import {reviewOfficialWebMarket} from './lib/official-web-auto-review.mjs';
import {reuseClaudeProSnapshotJob} from './lib/claude-pro-job-reuse.mjs';

const registry=JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json',import.meta.url),'utf8'));
const source=registry.sources['claude-us-pro'];
const parameters={host:'127.0.0.1',port:55433,database:'geosub_collector_test_claude_scheduler_admission_fixture'};
const url='postgresql://127.0.0.1:55433/'+parameters.database;
const jobId='12345678-1234-4234-8234-123456789abc';
function admit(overrides={}) {
  return resolveClaudeReviewAdmission({source,policy:claudeReviewPolicy,connectionParameters:parameters,...overrides});
}

test('Claude review admission is explicit and leaves the maintained source pending-only',()=>{
  const original=JSON.stringify(source),candidate=admit();
  assert.equal(candidate.auto_review.rule_id,claudeProRule);
  assert.equal(candidate.auto_review.publish_product,false);
  assert.equal(candidate.review_admission_policy,claudeReviewPolicy);
  assert.equal(source.auto_review,undefined);assert.equal(JSON.stringify(source),original);
  assert.notEqual(candidate,source);
});

test('review admission accepts only the dedicated loopback port and scheduler test namespace',()=>{
  for(const update of [{host:'remote.invalid'},{host:'/var/run/postgresql'},{port:5432},
    {database:'geosub_admin_preview_20261028'},{database:'geosub_collector_test_claude_unrelated'},{}]) {
    const value=Object.keys(update).length?{...parameters,...update}:undefined;
    assert.throws(()=>assertClaudeReviewDatabase(value),/requires_disposable_database/);
  }
  for(const host of ['localhost','127.0.0.1','::1']) assert.doesNotThrow(()=>assertClaudeReviewDatabase({...parameters,host}));
});

test('review policy cannot broaden the product, market, parser or product-publication scope',()=>{
  assert.throws(()=>admit({policy:'unknown'}),/unknown_claude_review_admission_policy/);
  for(const changed of [{...source,product_slug:'chatgpt'},{...source,parser_version:'unknown'},
    {...source,required_plan_slugs:['pro','max']},
    {...source,markets:[{...source.markets[0],country_code:'CA'}]},
    {...source,auto_review:{rule_id:claudeProRule,publish_product:true}}]) {
    assert.throws(()=>admit({source:changed}),/not_allowlisted|policy_mismatch/);
  }
  assert.throws(()=>admit({source:admit()}),/requires_pending_source/);
});

test('URL admission parsing never echoes connection credentials',()=>{
  for(const value of [undefined,'invalid','https://127.0.0.1:55433/'+parameters.database,
    'postgresql://private-user:private-secret@remote.invalid:55433/'+parameters.database]) {
    assert.throws(()=>claudeReviewConnectionFromUrl(value),error=>{
      assert.doesNotMatch(String(error),/private-user|private-secret|remote\.invalid/);return true;
    });
  }
  assert.deepEqual(claudeReviewConnectionFromUrl(url),{...parameters,port:'55433'});
});

test('review and revocation previews cannot query the existing preview database',async()=>{
  for(const intent of ['review','enable-review','revoke-review']) {
    let calls=0;
    const client={connectionParameters:{...parameters,database:'geosub_admin_preview_20261028'},
      async query(){calls++;throw Error('must not query');}};
    await assert.rejects(reuseClaudeProSnapshotJob({client,jobId,intent}),/requires_disposable_database/);
    assert.equal(calls,0);
  }
});

test('admitted review rechecks the actual database before touching price data',async()=>{
  let calls=0;
  const client={connectionParameters:parameters,async query(){
    calls++;return {rows:[{database_name:'geosub_admin_preview_20261028'}]};
  }};
  await assert.rejects(reviewOfficialWebMarket({client,source:admit()}),/database_identity_mismatch/);
  assert.equal(calls,1);
});

test('normal collection CLI rejects remote admission and driver host overrides before connecting',()=>{
  const cli=fileURLToPath(new URL('./collect-official-web-prices.mjs',import.meta.url));
  for(const connection of [
    'postgresql://private-user:private-secret@remote.invalid:55433/'+parameters.database,
    url+'?host=remote.invalid',
    'postgresql://not-real@127.0.0.1:55433/geosub_admin_preview_20261028',
  ]) {
    const result=spawnSync(process.execPath,[cli,'--source-key','claude-us-pro','--review-policy',claudeReviewPolicy],{
      env:{...process.env,DATABASE_URL:connection},encoding:'utf8',timeout:10000});
    assert.notEqual(result.status,0);assert.match(result.stderr,/requires_disposable_database/);
    assert.doesNotMatch(result.stdout+result.stderr,/private-user|private-secret|remote\.invalid|password authentication/);
  }
});

test('review admission cannot silently fall back to environment files or dry-run',()=>{
  const cli=fileURLToPath(new URL('./collect-official-web-prices.mjs',import.meta.url));
  const absent=spawnSync(process.execPath,[cli,'--source-key','claude-us-pro','--review-policy',claudeReviewPolicy],{
    env:{...process.env,DATABASE_URL:''},encoding:'utf8',timeout:10000});
  assert.match(absent.stderr,/requires_explicit_database/);
  const dry=spawnSync(process.execPath,[cli,'--source-key','claude-us-pro','--review-policy',claudeReviewPolicy,'--dry-run'],{
    env:{...process.env,DATABASE_URL:url},encoding:'utf8',timeout:10000});
  assert.match(dry.stderr,/requires_collection/);
});
