import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {webRuntime,webRuntimeEnv,ownedTaskTimers} from './component-release-lib.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, symlinkSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retainAssets, route, checkMigrationChanges, safePath, contentRollbackCompatible, taskUnitText, taskLaunch, taskIsBusy } from './rolling-release-lib.mjs';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'geosub-release-'));
  t.after(() => rmSync(root, {
    recursive: true,
    force: true
  }));
  for (const p of ['old', 'next', 'shared']) mkdirSync(join(root, p));
  return root;
}
test('both release asset sets survive rollback without overwriting', t => {
  const r = fixture(t);
  writeFileSync(join(r, 'old', 'old.js'), 'old');
  writeFileSync(join(r, 'next', 'new.js'), 'new');
  retainAssets(join(r, 'old'), join(r, 'shared'));
  retainAssets(join(r, 'next'), join(r, 'shared'));
  retainAssets(join(r, 'old'), join(r, 'shared'));
  assert.equal(readFileSync(join(r, 'shared', 'new.js'), 'utf8'), 'new');
  assert.equal(readFileSync(join(r, 'shared', 'old.js'), 'utf8'), 'old');
});
test('conflicting bytes reject the entire copy before adding files', t => {
  const r = fixture(t);
  writeFileSync(join(r, 'shared', 'z.js'), 'old');
  writeFileSync(join(r, 'next', 'a.js'), 'new');
  writeFileSync(join(r, 'next', 'z.js'), 'different');
  assert.throws(() => retainAssets(join(r, 'next'), join(r, 'shared')), /collision/);
  assert.throws(() => readFileSync(join(r, 'shared', 'a.js')), /ENOENT/);
  assert.equal(readFileSync(join(r, 'shared', 'z.js'), 'utf8'), 'old');
});
test('static symlinks cannot escape resource store', t => {
  const r = fixture(t);
  symlinkSync('/etc/passwd', join(r, 'next', 'x'));
  assert.throws(() => retainAssets(join(r, 'next'), join(r, 'shared')), /Symbolic/);
});
test('only approved exact additive migration passes', () => {
  const p = 'geosub-backend/sql/schema/057.sql';
  checkMigrationChanges([{
    status: 'A',
    path: p,
    hash: 'a'
  }], {
    [p]: 'a'
  });
  for (const status of ['M', 'D', 'R100']) assert.throws(() => checkMigrationChanges([{
    status,
    path: p,
    hash: 'a'
  }], {
    [p]: 'a'
  }));
  assert.throws(() => checkMigrationChanges([{
    status: 'A',
    path: p,
    hash: 'b'
  }], {
    [p]: 'a'
  }));
  assert.throws(() => checkMigrationChanges([{
    status: 'A',
    path: 'ai-price-site/prisma/migrations/new/migration.sql',
    hash: 'a'
  }], {}));
});
test('proxy uses retained static files and does not cache application responses', () => {
  const s = route(3001, '/srv/assets');
  assert.match(s, /alias \/srv\/assets\//);
  assert.match(s, /proxy_cache off/);
  assert.match(s, /X-Geosub-Release "3001"/);
  assert.throws(() => route(80, '/srv/assets'));
  assert.throws(() => safePath('/tmp/../etc'));
  assert.throws(() => safePath('/srv/assets;evil'));
});

test('content rollback keeps default-only restriction for unknown, reversed or modified readers', t => {
  const r = fixture(t);
  writeFileSync(join(r, 'old', 'reader'), 'old');
  writeFileSync(join(r, 'next', 'reader'), 'new');
  const fp = text => createHash('sha256').update('reader:' + createHash('sha256').update(text).digest('hex')).digest('hex');
  const policy = {files:['reader'], approvedPairs:[{from:fp('new'), to:fp('old')}]};
  assert.equal(contentRollbackCompatible(join(r,'next'), join(r,'old'), policy), true);
  assert.equal(contentRollbackCompatible(join(r,'old'), join(r,'next'), policy), false);
  writeFileSync(join(r,'old','reader'), 'changed');
  assert.equal(contentRollbackCompatible(join(r,'next'), join(r,'old'), policy), false);
  assert.equal(contentRollbackCompatible('/missing', join(r,'old'), policy), false);
  assert.equal(contentRollbackCompatible(join(r,'next'), join(r,'old'), {files:[],approvedPairs:[]}), false);
});

test('legacy and current task units launch 0644 scripts through Bash, including nested commands', t => {
  const r=fixture(t); const wrapper=join(r,'wrapper.sh'), child=join(r,'child.sh');
  writeFileSync(wrapper,'#!/bin/bash\nshift 2\nexec "$@"\n',{mode:0o644});
  writeFileSync(child,'#!/bin/bash\nprintf "%s" "$1"\nexit 7\n',{mode:0o644});
  const unit=taskUnitText(`[Service]\nExecStart=${wrapper} fixture -- ${child} preserved\n`,r,r);
  const launch=taskLaunch(unit);
  assert.equal(launch.scripts.length,2);
  const args=unit.match(/^ExecStart=(.+)$/m)[1].split(' ');
  const result=spawnSync(args.shift(),args,{encoding:'utf8'});
  assert.equal(result.status,7);assert.equal(result.stdout,'preserved');
  assert.throws(()=>taskLaunch(`[Service]\nExecStart=${wrapper} fixture -- ${child}`),/explicit Bash/);
});
test('all shipped scheduled task templates have explicit interpreters and readable shell sources', () => {
  const dir=new URL('./systemd/',import.meta.url);
  for(const file of readdirSync(dir).filter(x=>x.endsWith('.service')&&x!=='geosub-web.service')) {
    const text=readFileSync(new URL(file,dir),'utf8');
    const launch=taskLaunch(text); assert.equal(launch.executable,'/bin/bash',file);
    for(const script of launch.scripts){
      const source=new URL('../../../'+script.replace('/opt/geosub/',''),import.meta.url);
      assert.equal(spawnSync('/bin/bash',['-n',source.pathname]).status,0,file+': '+script);
    }
  }
});

test('oneshot activating and stopping states block migration until the task terminates', () => {
  for(const state of ['activating','active','deactivating','reloading','unknown','']) assert.equal(taskIsBusy(state),true,state);
  for(const state of ['inactive','failed']) assert.equal(taskIsBusy(state),false,state);
});

test('scheduled task environment targets the active slot after upgrade and rollback', t => {
  const root=fixture(t), envFile=join(root,'base.env'), live=join(root,'live');
  writeFileSync(envFile,'export GEOSUB_WEB_HEALTH_URL=http://127.0.0.1:3000/api/health\n');
  const source=readFileSync(new URL('./rolling-release.mjs',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('function taskUnits(release) {'),source.indexOf('function installWeb(release) {'));
  let wrapper;
  const taskUnits=runInNewContext(body+'; taskUnits',{root,envFile,live,timers:[],path:{join},webRuntime,webRuntimeEnv,ownedTaskTimers,fs:{existsSync:()=>true},atomic:(file,text)=>{if(file===join(root,'task.env'))wrapper=text;},run:()=>{}});
  for(const port of [3001,3002,3001]) {
    taskUnits({port,dist:'.next',app:join(root,'active-web','ai-price-site')});writeFileSync(join(root,'task.env'),wrapper);
    const result=spawnSync('/bin/bash',['-c','source "$1"; printf "%s|%s|%s" "$GEOSUB_WEB_HEALTH_URL" "$GEOSUB_NEXT_DIST_DIR" "$GEOSUB_FRONTEND_DIR"','test',join(root,'task.env')],{encoding:'utf8'});
    assert.equal(result.status,0);assert.equal(result.stdout,`http://127.0.0.1:${port}/api/health|.next|${root}/active-web/ai-price-site`);
  }
});
