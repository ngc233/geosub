import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const req=createRequire(path.resolve(import.meta.dirname,'../../ai-price-site/package.json'));
const report=fs.readFileSync(path.join(import.meta.dirname,'../deploy/linux-arm64/production-health-report.sh'),'utf8');
const sqlFor=name=>report.split(`${name}="$(psql_scalar "`)[1]?.split('\")"')[0];
test('real monitoring SQL distinguishes overdue, executing, recovered and archived jobs', {skip:!process.env.DATABASE_URL}, async()=>{
 const url=new URL(process.env.DATABASE_URL);
 assert.ok(['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname),'isolated local database required');
 const {Client}=req('pg');const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try {
  await db.query('BEGIN');
  await db.query(`CREATE TEMP TABLE collector_jobs(id text,status text,next_run_at timestamptz);
   CREATE TEMP TABLE collector_job_runs(id int,job_id text,status text,started_at timestamptz);
   CREATE TEMP TABLE system_task_runs(task_key text,status text,finished_at timestamptz);
   INSERT INTO collector_jobs VALUES ('overdue','active',now()-interval '3 hours'),('executing','active',now()-interval '3 hours'),('future','active',now()+interval '1 hour'),('archived','archived',now()-interval '3 hours');
   INSERT INTO collector_job_runs VALUES (1,'executing','running',now()-interval '1 minute'),(2,'overdue','failed',now()-interval '1 hour'),(3,'archived','failed',now());`);
  assert.equal(Number((await db.query(sqlFor('overdue_collector_jobs'))).rows[0].count),1);
  assert.equal(Number((await db.query(sqlFor('unrecovered_collector_jobs'))).rows[0].count),1);
  await db.query("INSERT INTO collector_job_runs VALUES (4,'overdue','succeeded',now())");
  assert.equal(Number((await db.query(sqlFor('unrecovered_collector_jobs'))).rows[0].count),0);
  assert.equal(Number((await db.query(sqlFor('missing_task_success'))).rows[0].count),10);
  await db.query("INSERT INTO system_task_runs VALUES ('analytics_aggregation','succeeded',now()),('collector_runner','running',now()),('discovery_scan','succeeded',now()-interval '4 hours')");
  assert.equal(Number((await db.query(sqlFor('missing_task_success'))).rows[0].count),9);
 } finally {await db.query('ROLLBACK');await db.end();}
});
test('real due-job SQL selects legacy official snapshots without admitting unrelated jobs', {skip:!process.env.DATABASE_URL}, async()=>{
 const url=new URL(process.env.DATABASE_URL);assert.ok(['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname));
 const out=spawnSync('pwsh',['-NoProfile','-File',path.join(import.meta.dirname,'../tests/collector-batch-reliability.ps1')],{encoding:'utf8',env:{...process.env,GEOSUB_TEST_DUE_SQL:'true'}});assert.equal(out.status,0,out.stderr);const sql=JSON.parse(out.stdout.trim());
 const {Client}=req('pg');const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try {await db.query('BEGIN');await db.query(`CREATE TEMP TABLE products(id text,slug text,name text);
 CREATE TEMP TABLE price_sources(id text,type text,base_url text);
 CREATE TEMP TABLE collector_jobs(id text,product_id text,source_id text,job_type text,schedule text,status text,next_run_at timestamptz,error_count int,last_error text,job_config jsonb,priority int,created_at timestamptz);
 CREATE TEMP TABLE collector_job_runs(id text,job_id text,status text,started_at timestamptz);
 INSERT INTO products VALUES ('p','chatgpt','ChatGPT');
 INSERT INTO price_sources VALUES ('s','official_site','https://openai.com/');
 INSERT INTO collector_jobs SELECT n,'p','s',kind,'daily',state,now()-interval '1 hour',0,NULL,config,1,now() FROM (VALUES
 ('legacy','price_check','active','{"collector_kind":"official_site"}'::jsonb),
 ('unrelated','price_check','active','{"collector_kind":"app_store"}'::jsonb),
 ('paused','ai_pricing','paused','{"collector_kind":"official_site"}'::jsonb)
 ) x(n,kind,state,config);`);
 const rows=(await db.query(sql)).rows[0].coalesce;
 assert.deepEqual(rows.map(x=>x.id),['legacy']);
 } finally {await db.query('ROLLBACK');await db.end();}
});

test('health report resolves the active rolling release and rejects malformed identity', async()=>{
 const os=await import('node:os');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'geosub-report-'));
 const block=report.slice(report.indexOf('rolling_state='),report.indexOf('generated_at='));
 const script=`set -euo pipefail\nENV_FILE=/unused\n${block}\nprintf '%s|%s|%s|%s' "$REPO_DIR" "$WEB_SERVICE" "$LOCAL_URL" "$rolling_version"`;
 const state=path.join(dir,'rolling-state.json');
 const active={envFile:'/opt/geosub/releases/environments/new.sh',dir:'/opt/geosub/releases/builds/new',unit:'geosub-web-new.service',port:3002,version:'2.13.1',commit:'a'.repeat(40)};
 try {
  fs.writeFileSync(state,JSON.stringify({active}));
  const run=()=>spawnSync('bash',['-c',script],{encoding:'utf8',env:{...process.env,GEOSUB_RELEASE_DIR:dir}});
  let r=run();assert.equal(r.status,0,r.stderr);
  assert.equal(r.stdout,'/opt/geosub/releases/builds/new|geosub-web-new.service|http://127.0.0.1:3002/api/health|2.13.1');
  fs.writeFileSync(state,JSON.stringify({active:{...active,unit:'unrelated.service'}}));
  r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/Invalid active rolling release identity/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
