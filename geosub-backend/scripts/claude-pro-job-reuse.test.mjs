import assert from 'node:assert/strict';
import test from 'node:test';
import { reuseClaudeProSnapshotJob } from './lib/claude-pro-job-reuse.mjs';

const jobId = '12345678-1234-4234-8234-123456789abc';
function client(parameters = {}) {
  return { calls: [], connectionParameters: {
    host: '127.0.0.1', port: 55433, database: 'geosub_collector_test_claude_scheduler_reuse_fixture', ...parameters,
  }, async query(sql) {
    this.calls.push(sql);
    if (sql === 'SELECT current_database() AS name') return { rows: [{name:this.connectionParameters.database}] };
    if (sql === 'SHOW transaction_read_only') return { rows: [{transaction_read_only:'on'}] };
    if (sql.includes('FROM products')) return { rows: [] };
    return {rows: []};
  }};
}

test('Claude task reuse cannot apply to the existing preview even with a valid fingerprint', async () => {
  const db = client({database:'geosub_admin_preview_20261028'});
  await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId,execute:true,expectedFingerprint:'a'.repeat(64)}), /requires_disposable_database/);
  assert.equal(db.calls.length, 0);
});

test('Claude task reuse rejects remote hosts, other ports and unknown databases before queries', async () => {
  for (const parameters of [{host:'remote.invalid'}, {port:5432}, {database:'geosub_app'}]) {
    const db = client(parameters);
    await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId}), /local_preflight_database_required/);
    assert.equal(db.calls.length, 0);
  }
});

test('Claude task reuse requires an explicit target and reviewed fingerprint for application', async () => {
  const db = client();
  await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId:'invalid'}), /valid_job_id_required/);
  await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId,execute:true}), /reviewed_configuration_fingerprint_required/);
  assert.equal(db.calls.length, 0);
});

test('Claude task reuse defaults to a read-only preview and rolls back failed catalog checks', async () => {
  const db = client({database:'geosub_admin_preview_20261028'});
  await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId}), /missing_canonical_product/);
  assert.equal(db.calls[0], 'BEGIN READ ONLY');
  assert.equal(db.calls.at(-1), 'ROLLBACK');
  assert.ok(db.calls.every(sql => /^(BEGIN READ ONLY|SET LOCAL|SELECT |SHOW |ROLLBACK)/.test(sql)));
});

test('backend reuse command rejects remote connections without returning credentials',async()=>{
  const {spawnSync}=await import('node:child_process');
  const {fileURLToPath}=await import('node:url');
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./reuse-claude-pro-job.mjs',import.meta.url)),
    '--operation','preview','--id',jobId],{encoding:'utf8',env:{...process.env,
    DATABASE_URL:'postgresql://private-user:private-password@remote.invalid:55433/geosub_admin_preview_20261028'}});
  const response=JSON.parse(result.stdout);
  assert.equal(response.ok,false);
  assert.equal(response.error_code,'local_preflight_database_required');
  assert.doesNotMatch(result.stdout+result.stderr,/private-user|private-password|remote\.invalid/);
});

test('backend reuse command refuses existing-preview application before trying to authenticate to its database',async()=>{
  const {spawnSync}=await import('node:child_process');
  const {fileURLToPath}=await import('node:url');
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./reuse-claude-pro-job.mjs',import.meta.url)),
    '--operation','apply','--id',jobId,'--fingerprint','a'.repeat(64),'--actor-id',jobId],
    {encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://not-a-real-user@127.0.0.1:55433/geosub_admin_preview_20261028'}});
  assert.equal(JSON.parse(result.stdout).error_code,'claude_job_reuse_requires_disposable_database');
});

test('conversion rejects malformed audit actor identity before any query',async()=>{
  const db=client();
  await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId,execute:true,expectedFingerprint:'a'.repeat(64),actorId:'invalid'}),
    /valid_actor_id_required/);
  assert.equal(db.calls.length,0);
});


test('activation requires a known intent and authenticated audit actor before queries',async()=>{
  const db=client();
  await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId,intent:'unknown'}),/invalid_reuse_intent/);
  await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId,intent:'enable',execute:true,
    expectedFingerprint:'a'.repeat(64)}),/valid_actor_id_required/);
  assert.equal(db.calls.length,0);
});

test('activation retains the existing local-only write boundary',async()=>{
  const db=client({database:'geosub_admin_preview_20261028'});
  await assert.rejects(reuseClaudeProSnapshotJob({client:db,jobId,intent:'enable',execute:true,
    expectedFingerprint:'a'.repeat(64),actorId:jobId}),/requires_disposable_database/);
  assert.equal(db.calls.length,0);
});


test('false, empty or unknown policies cannot bypass ordinary activation; null retains pending-only behavior',async()=>{
  for(const policy of [false,0,'',{},'unknown',null,undefined]) {
    const db=client();
    db.query=async function(sql) {
      this.calls.push(sql);
      if(sql==='SELECT current_database() AS name') return {rows:[{name:this.connectionParameters.database}]};
      if(sql==='SHOW transaction_read_only') return {rows:[{transaction_read_only:'on'}]};
      if(sql.includes('FROM products')) return {rows:[{id:'product',slug:'claude',category:'ai',status:'review'}]};
      if(sql.includes('FROM plans')) return {rows:[{id:'plan',slug:'pro',billing_cycle:'monthly',status:'review'}]};
      if(sql.includes('FROM countries')) return {rows:[{id:'country',code:'US',currency:'USD'}]};
      if(sql.includes('FROM price_sources')) return {rows:[{source_key:'claude-us-pro-official-web'}]};
      if(sql.includes('FROM collector_jobs')) return {rows:[{id:jobId,source_id:'source',job_type:'ai_pricing',
        status:'paused',schedule:'daily_light',job_config:{collector_kind:'pricing_page',
          official_web_source_key:'claude-us-pro',country_codes:['US'],official_web_review_policy:policy}}]};
      return {rows:[]};
    };
    const operation=reuseClaudeProSnapshotJob({client:db,jobId,intent:'enable'});
    if(policy===null || policy===undefined) assert.equal((await operation).state,'activation_preview');
    else await assert.rejects(operation,/review_policy_requires_explicit_control/);
    assert.equal(db.calls.at(-1),'ROLLBACK');
    assert.ok(db.calls.every(sql=>!sql.startsWith('UPDATE') && !sql.startsWith('INSERT')));
  }
});
