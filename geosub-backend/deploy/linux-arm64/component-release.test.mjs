import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {migrationPlan,executeMigrationPlan,collectorEnvironment,collectorUnit,ownedTaskTimers,switchCollector,webRuntime,webRuntimeEnv} from './component-release-lib.mjs';

test('database detection covers deletions, Prisma-only edits, manifest and runner changes',()=>{
 for(const file of ['geosub-backend/sql/schema/058.sql','geosub-backend/sql/migration-layout.json','ai-price-site/prisma/schema.prisma','ai-price-site/prisma/migrations/a/migration.sql','ai-price-site/scripts/prepare-prisma-baseline.cjs','geosub-backend/scripts/migration-manifest.cjs','geosub-backend/deploy/linux-arm64/db-apply-sql.sh'])
  for(const status of ['A','M','D']) assert.equal(migrationPlan([{path:file,status}]).required,true,file);
 assert.equal(migrationPlan(['VERSION','geosub-backend/scripts/run-collector-jobs.ps1','ai-price-site/app/page.tsx','docs/change.md','geosub-backend/sql/isolated/test.sql']).required,false);
});
test('unchanged DB performs no pause, backup or migration; backup failure prevents migration',async()=>{
 const calls=[];const actions={pause:async()=>calls.push('pause'),backup:async()=>calls.push('backup'),migrate:async()=>calls.push('migrate'),skipped:()=>calls.push('skipped')};
 await executeMigrationPlan({required:false,reason:'unchanged'},actions);assert.deepEqual(calls,['skipped']);
 calls.length=0;await executeMigrationPlan({required:true},actions);assert.deepEqual(calls,['pause','backup','migrate']);
 calls.length=0;await assert.rejects(executeMigrationPlan({required:true},{...actions,backup:async()=>{throw Error('backup failed');}}));assert.deepEqual(calls,['pause']);
});
function fixture(failAt) {
 const calls=[];let active='old',state='old';
 const io={snapshot:async()=>({active:'old',state:'old',timer:false}),pause:async()=>calls.push('pause'),drain:async()=>{calls.push('drain');if(failAt==='drain')throw Error('busy');},acquire:async()=>{calls.push('lock');return async()=>calls.push('unlock');},activate:async target=>{active=target;calls.push('activate');if(failAt==='activate')throw Error('switch failed');},verify:async()=>{calls.push('verify');if(failAt==='verify')throw Error('unhealthy');},record:async value=>{state=value.active;calls.push('record');if(failAt==='record')throw Error('record failed');},resume:async snapshot=>{assert.equal(snapshot.timer,false);calls.push('restore-timer');},restore:async snapshot=>{active=snapshot.active;state=snapshot.state;calls.push('restore');}};
 return {io,calls,result:()=>({active,state})};
}
test('collector switch and rollback use same transaction without website operations',async()=>{
 const f=fixture();await switchCollector(f.io,'new','old');assert.deepEqual(f.result(),{active:'new',state:'new'});assert.deepEqual(f.calls,['pause','drain','lock','activate','verify','record','restore-timer','unlock']);
 await switchCollector(f.io,'old','new');assert.deepEqual(f.result(),{active:'old',state:'old'});
});
test('busy batch prevents switching; activation, validation and record failures restore runtime and state',async()=>{
 for(const stage of ['drain','activate','verify','record']) {
  const f=fixture(stage);await assert.rejects(switchCollector(f.io,'new','old'));assert.deepEqual(f.result(),{active:'old',state:'old'});
  assert.ok(f.calls.includes('restore-timer'));
  if(stage==='drain')assert.ok(!f.calls.includes('activate'));else assert.equal(f.calls.at(-1),'unlock');
 }
});
test('incomplete recovery is visible and still releases admission lock',async()=>{
 const f=fixture('verify');f.io.restore=async()=>{throw Error('restore failed');};await assert.rejects(switchCollector(f.io,'new','old'),/recovery incomplete/);assert.equal(f.calls.at(-1),'unlock');
});
test('web task update preserves independent collector unit and writes matching immutable web runtime',()=>{
 const source=fs.readFileSync(new URL('./rolling-release.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function taskUnits(release) {'),source.indexOf('function installWeb(release) {'));
 const files=new Map(),units=['geosub-collector-jobs.timer','geosub-db-backup.timer'];
 const taskUnits=runInNewContext(fn+'; taskUnits',{root:'/release',live:'/release/live',envFile:'/env',path,webRuntime,webRuntimeEnv,ownedTaskTimers,timers:units,fs:{existsSync:()=>true,readFileSync:()=> 'fixture'},taskUnitText:()=> 'other-unit',atomic:(f,s)=>files.set(f,s),run:()=>{}});
 taskUnits({app:'/release/build-new/ai-price-site',dir:'/release/build-new',port:3002,dist:'.next'});
 assert.ok(!files.has('/etc/systemd/system/geosub-collector-jobs.service'));assert.ok(files.has('/etc/systemd/system/geosub-db-backup.service'));
 assert.deepEqual(JSON.parse(files.get('/release/web-runtime.json')),{app:'/release/build-new/ai-price-site',dist:'.next',healthUrl:'http://127.0.0.1:3002/api/health'});
});
test('collector environment and service refer to the independent pointer, without changing schedule',()=>{
 const source=fs.readFileSync(new URL('./systemd/geosub-collector-jobs.service',import.meta.url),'utf8');
 const unit=collectorUnit(source,'/release');assert.match(unit,/GEOSUB_ENV_FILE=\/release\/collector.env/);assert.match(unit,/\/release\/collector-live\/geosub-backend/);assert.doesNotMatch(unit,/\/release\/live\//);
 const env=collectorEnvironment('/release','/env');assert.match(env,/source '\/release\/web-runtime.env'/);assert.match(env,/GEOSUB_COLLECTOR_LOCK_FILE='\/run\/geosub\/collector-jobs.lock'/);
 assert.throws(()=>collectorEnvironment('/bad;command','/env'));
});
test('actual shell entry waits for lock, resolves new symlink after admission, and passes arguments unchanged',async t=>{
 if(process.platform!=='linux'){t.skip('real flock coverage runs on Linux CI and the production controller installer');return;}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'geosub-collector-entry-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 for(const p of ['old/scripts','new/scripts','bin'])fs.mkdirSync(path.join(dir,p),{recursive:true});
 const link=path.join(dir,'live');fs.symlinkSync(path.join(dir,'old'),link);
 const env=path.join(dir,'collector.env');fs.writeFileSync(env,`export GEOSUB_BACKEND_DIR='${link}'\nexport GEOSUB_COLLECTOR_LOCK_DIR='${dir}'\nexport GEOSUB_COLLECTOR_LOCK_FILE='${dir}/lock'\n`);
 fs.writeFileSync(path.join(dir,'bin','pwsh'),'#!/bin/bash\nprintf "%s\\n" "$GEOSUB_BACKEND_DIR" "$@"\n',{mode:0o755});
 const holder=spawn('flock',[path.join(dir,'lock'),'bash','-c','printf ready; cat >/dev/null'],{stdio:['pipe','pipe','pipe']});t.after(()=>holder.kill());
 await new Promise((resolve,reject)=>{holder.stdout.once('data',resolve);holder.once('error',reject);});
 const child=spawn('bash',[new URL('./run-collector-jobs.sh',import.meta.url).pathname,'-JobId','job-with-space value','-SkipAutoReview'],{env:{...process.env,PATH:path.join(dir,'bin')+':'+process.env.PATH,GEOSUB_COLLECTOR_ENV_FILE:env},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',x=>output+=x);const finished=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
 await new Promise(r=>setTimeout(r,100));assert.equal(output,'');fs.unlinkSync(link);fs.symlinkSync(path.join(dir,'new'),link);holder.stdin.end();
 assert.equal(await finished,0);assert.match(output,new RegExp(dir+'/new/scripts/run-collector-jobs.ps1'));assert.match(output,/job-with-space value\n-SkipAutoReview/);
});
test('collector CLI parses without executing any production command',()=>{
 const file=new URL('./collector-release.mjs',import.meta.url).pathname;
 assert.equal(spawnSync(process.execPath,['--check',file]).status,0);
});

test('first integration pauses only collector while preserving full timer baseline for health checks',async()=>{
 const source=fs.readFileSync(new URL('./rolling-release.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('async function pauseTimers('),source.indexOf('function restoreTimers()'));
 const all=['geosub-collector-jobs.timer','geosub-db-backup.timer'],baseline=Object.fromEntries(all.map(x=>[x,{active:true,enabled:'enabled'}]));
 const calls=[],attempt={};let saved;
 const pause=runInNewContext(fn+'; pauseTimers',{timers:all,root:'/release',path,attempt,paused:false,json:()=>baseline,save:(file,value)=>{saved=value;},serviceActive:()=>true,enabled:()=> 'enabled',evidence:()=>{},run:(bin,args)=>calls.push(args),read:()=> 'inactive',taskIsBusy:x=>x!=='inactive',sleep:async()=>{}});
 await pause(['geosub-collector-jobs.timer']);assert.deepEqual(Object.keys(saved),all);assert.deepEqual(Object.keys(attempt.timers),['geosub-collector-jobs.timer']);assert.deepEqual(Array.from(calls[0]),['stop','geosub-collector-jobs.timer']);assert.equal(calls.length,1);
});
