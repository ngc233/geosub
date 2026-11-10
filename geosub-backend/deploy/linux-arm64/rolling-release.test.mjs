import { spawnSync } from 'node:child_process';
import './release-candidate.test.mjs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {webRuntime,webRuntimeEnv,ownedTaskTimers} from './component-release-lib.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, symlinkSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retainAssets, route, checkMigrationChanges, safePath, contentRollbackCompatible, taskUnitText, taskLaunch, taskIsBusy, CLOUDFLARE_EDGE_RANGES } from './rolling-release-lib.mjs';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'geosub-release-'));
  t.after(() => rmSync(root, {
    recursive: true,
    force: true
  }));
  for (const p of ['old', 'next', 'shared']) mkdirSync(join(root, p));
  return root;
}

const sitemapSentinels = [
  'https://geosub.org/zh/ai-pricing/chatgpt',
  'https://geosub.org/en/ai-pricing/chatgpt',
  'https://geosub.org/zh/streaming-pricing/netflix',
];

// Synthetic XML only. Execute the actual gate block without sourcing a server
// environment, accessing a database, or making HTTP requests.
function sitemapXml({ count = 189, position = 'middle', padding = 0, missing, extra = [] } = {}) {
  const required = sitemapSentinels.map(url => url === missing ? `${url}-missing-fixture` : url);
  const filler = Array.from({ length: count - required.length - extra.length }, (_, i) => `https://geosub.org/zh/guides/synthetic-${i}`);
  const at = position === 'start' ? 0 : position === 'end' ? filler.length : Math.floor(filler.length / 2);
  const urls = [...filler.slice(0, at), ...required, ...filler.slice(at)];
  urls.unshift(...extra);
  const before = position === 'start' ? 0 : position === 'end' ? padding : Math.floor(padding / 2);
  return `<urlset>\n<!--${'x'.repeat(before)}-->\n${urls.map(url => `<url><loc>${url}</loc></url>`).join('\n')}\n<!--${'x'.repeat(padding - before)}-->\n</urlset>`;
}

function runSitemapGate(t, xml, { matcherExit, producerExit } = {}) {
  const source = readFileSync(new URL('./post-deploy-check.sh', import.meta.url), 'utf8');
  const strict = source.match(/^set -euo pipefail$/m);
  assert.ok(strict, 'The real script must retain errexit, nounset and pipefail');
  const start = source.indexOf('    sitemap_url_count="$(');
  const split = source.indexOf('    required_sitemap_urls=(', start);
  const end = source.indexOf('    sitemap_urls="$(', split);
  assert.ok(start >= 0 && split > start && end > split, 'Extract the complete real count and three URL checks');
  const limits = ['MIN', 'MAX'].map(name => {
    const line = source.match(new RegExp(`^${name}_SITEMAP_URLS=.*$`, 'm'));
    assert.ok(line, `Missing ${name} sitemap limit`);
    return line[0];
  });
  const root = fixture(t), file = join(root, 'sitemap.xml');
  writeFileSync(file, xml);
  // Fault injection happens after the count check, so producer failure is
  // exercised in all three URL checks, including grep's legitimate exit 1.
  const faults = [
    matcherExit === undefined ? '' : `grep() { cat >/dev/null; return ${matcherExit}; }`,
    producerExit === undefined ? '' : `printf() { builtin printf "$@"; return ${producerExit}; }`,
  ].join('\n');
  const program = `${strict[0]}
${limits.join('\n')}
CANONICAL_SITE_URL=https://geosub.org
failures=0
pass() { builtin printf 'OK %s\\n' "$1"; }
fail() { failures=$((failures + 1)); builtin printf 'FAIL %s\\n' "$1"; }
sitemap_content="$(cat "$1")"
${source.slice(start, split)}
${faults}
${source.slice(split, end)}
if (( failures > 0 )); then exit 1; fi
`;
  const env = { ...process.env };
  delete env.GEOSUB_MIN_SITEMAP_URLS;
  delete env.GEOSUB_MAX_SITEMAP_URLS;
  const result = spawnSync('/bin/bash', ['-c', program, 'sitemap-gate-test', file], {
    env, encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, '', result.stderr);
  return result;
}

test('sitemap gate accepts complete small and pipe-sized XML with sentinels at any position', t => {
  for (const position of ['start', 'middle', 'end']) {
    // Exercise hits before and after the pipe buffer, including a long unread
    // tail. Small fixtures alone missed the real 31 KB sitemap's SIGPIPE race.
    for (const padding of [0, 32 * 1024, 2 * 1024 * 1024]) {
      const result = runSitemapGate(t, sitemapXml({ position, padding }));
      assert.equal(result.status, 0, `${position}, padding=${padding}: ${result.stdout}`);
      for (const url of sitemapSentinels) assert.ok(result.stdout.includes(`OK public sitemap dynamic sentinel: ${url}\n`));
      assert.match(result.stdout, /OK public sitemap excludes staged locale URLs/);
      assert.match(result.stdout, /OK public sitemap contains canonical path URLs only/);
      assert.doesNotMatch(result.stdout, /FAIL/);
    }
  }
});

test('sitemap gate retains the exact 80 through 192 URL budget', t => {
  for (const [count, accepted] of [[79, false], [80, true], [192, true], [193, false]]) {
    const result = runSitemapGate(t, sitemapXml({ count }));
    assert.equal(result.status, accepted ? 0 : 1, result.stdout);
    assert.ok(result.stdout.includes(accepted
      ? `OK public sitemap URL budget: ${count} (80-192)`
      : `FAIL public sitemap URL count outside release range: ${count} (80-192)`));
  }
});

test('sitemap gate rejects each genuinely missing sentinel at an otherwise valid URL count', t => {
  for (const missing of sitemapSentinels) {
    const result = runSitemapGate(t, sitemapXml({ missing, padding: 32 * 1024 }));
    assert.equal(result.status, 1);
    assert.match(result.stdout, /OK public sitemap URL budget: 189/);
    assert.ok(result.stdout.includes(`FAIL public sitemap missing dynamic sentinel: ${missing}\n`));
    assert.equal(result.stdout.split('\n').filter(line => line.startsWith('FAIL')).length, 1, result.stdout);
  }
});

test('sitemap gate rejects every staged locale even when an early match precedes a large tail', t => {
  for (const locale of ['zh-tw', 'ja', 'ko', 'es', 'tr', 'ar', 'fr', 'it', 'de', 'pt']) {
    for (const suffix of ['', '/ai-pricing/chatgpt']) {
      const result = runSitemapGate(t, sitemapXml({ extra: [`https://geosub.org/${locale}${suffix}`], padding: 2 * 1024 * 1024 }));
      assert.equal(result.status, 1, `${locale}${suffix}: ${result.stdout}`);
      assert.match(result.stdout, /FAIL public sitemap contains staged locale URLs/);
      assert.doesNotMatch(result.stdout, /OK public sitemap excludes staged locale URLs/);
    }
  }
});

test('sitemap gate rejects query-string URLs even when an early match precedes a large tail', t => {
  for (const query of ['?displayCurrency=USD', '?']) {
    const result = runSitemapGate(t, sitemapXml({ extra: [`https://geosub.org/zh/ai-pricing/chatgpt${query}`], padding: 2 * 1024 * 1024 }));
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stdout, /FAIL public sitemap contains query-string URLs/);
    assert.doesNotMatch(result.stdout, /OK public sitemap contains canonical path URLs only/);
  }
});

test('sitemap gate treats matcher execution errors as failures in all three URL checks', t => {
  for (const matcherExit of [2, 127]) {
    const result = runSitemapGate(t, sitemapXml(), { matcherExit });
    assert.equal(result.status, 1);
    assert.equal(result.stdout.split('\n').filter(line => line.startsWith('FAIL')).length, 5, result.stdout);
    for (const kind of ['sentinel', 'locale', 'query-string']) {
      assert.ok(result.stdout.includes(`public sitemap ${kind} check failed (producer=0, matcher=${matcherExit})`), result.stdout);
    }
    assert.doesNotMatch(result.stdout, /missing dynamic sentinel|OK public sitemap excludes|OK public sitemap contains canonical/);
  }
});

test('sitemap gate rejects producer errors including exit 1 paired with no grep match', t => {
  for (const producerExit of [1, 74]) {
    const result = runSitemapGate(t, sitemapXml(), { producerExit });
    assert.equal(result.status, 1);
    assert.equal(result.stdout.split('\n').filter(line => line.startsWith('FAIL')).length, 5, result.stdout);
    assert.ok(result.stdout.includes(`sentinel check failed (producer=${producerExit}, matcher=0)`), result.stdout);
    for (const kind of ['locale', 'query-string']) {
      assert.ok(result.stdout.includes(`${kind} check failed (producer=${producerExit}, matcher=1)`), result.stdout);
    }
    assert.doesNotMatch(result.stdout, /missing dynamic sentinel|OK public sitemap excludes|OK public sitemap contains canonical/);
  }
});

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
test('proxy restores the visitor IP only from Cloudflare edges', () => {
  const s = route(3001, '/srv/assets');
  const trusted = [...s.matchAll(/^set_real_ip_from (\S+);$/gm)].map(m => m[1]);
  assert.deepEqual(trusted, [...CLOUDFLARE_EDGE_RANGES]);
  assert.equal(trusted.length, 22);
  for (const broad of ['0.0.0.0/0', '::/0', '127.0.0.1', '10.0.0.0/8']) assert.ok(!trusted.includes(broad));
  assert.match(s, /^real_ip_header CF-Connecting-IP;$/m);
  assert.doesNotMatch(s, /real_ip_header X-Forwarded-For/);
  assert.ok(s.indexOf('real_ip_header') < s.indexOf('location '), 'server-level, before locations');
  assert.match(s, /proxy_set_header X-Real-IP \$remote_addr;/);
  assert.match(s, /proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/);
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


test('finalization rejects stale, migrated, recovered or differently routed candidates before writing', async () => {
  const {finalizeExistingCandidate} = await import('./rolling-finalize-lib.mjs');
  const previous={id:'old',commit:'b'.repeat(40)};
  const target={id:'new',commit:'a'.repeat(40),dir:'/retained/new'};
  const input={prior:{id:'attempt',operation:'upgrade',status:'failed',detail:'Command failed: post-deploy-check.sh; recovery=incomplete',migration:{required:false},previous,target},state:{active:previous},expectedCommit:target.commit,latestAttempt:'attempt',liveDir:target.dir,routeMatches:true,runtimeMatches:true};
  for(const mutate of [x=>x.prior.status='succeeded',x=>x.prior.operation='rollback',x=>x.prior.detail='recovery=verified',x=>x.prior.migration.required=true,x=>x.prior.timers={timer:{active:true}},x=>x.expectedCommit='c'.repeat(40),x=>x.latestAttempt='later',x=>x.state.active.id='other',x=>x.liveDir='/other',x=>x.routeMatches=false,x=>x.runtimeMatches=false]) {
    const value=JSON.parse(JSON.stringify(input));mutate(value);
    let calls=0;
    await assert.rejects(finalizeExistingCandidate(value,{verify:()=>{calls++;},record:()=>{calls++;}}));
    assert.equal(calls,0);
  }
  let writes=0;
  await assert.rejects(finalizeExistingCandidate(input,{verify:()=>{throw Error('gate still fails');},record:()=>{writes++;}}),/gate still fails/);
  assert.equal(writes,0);
  const calls=[];
  await finalizeExistingCandidate(input,{verify:async release=>{assert.deepEqual(release,target);calls.push('verify');},record:next=>{assert.deepEqual(next,{active:target,previous});calls.push('record');}});
  assert.deepEqual(calls,['verify','record']);
  assert.equal(input.prior.status,'failed','original failure must remain intact');
});

test('v2 exact contracts bind both file scopes and per-target token capability', async t => {
  const {fingerprint,rollbackPlan}=await import('./content-release-contract.cjs').then(m=>m.default);
  const r=fixture(t),from=join(r,'next'),to=join(r,'old');
  writeFileSync(join(from,'reader'),'current tokens');writeFileSync(join(to,'reader'),'retained plain');
  writeFileSync(join(from,'gate'),'all three targets');
  const files=['reader','gate'],toFiles=['reader'];
  const pair={format:2,from:fingerprint(from,files),to:fingerprint(to,toFiles),toFiles,targets:[{id:'overview:zh:claude',facts:false}],reason:'Synthetic exact pair',evidence:'local synthetic test'};
  const policy={files,approvedPairs:[pair]};
  assert.equal(rollbackPlan(from,to,policy).mode,'audited-compatible-readers');
  assert.equal(rollbackPlan(from,to,policy).targets[0].facts,false);
  assert.equal(rollbackPlan(to,from,policy).mode,'code-default-required');
  assert.equal(rollbackPlan(from,to,{...policy,approvedPairs:[{...pair,targets:[{id:'evil',facts:true}]}]}).mode,'code-default-required');
  writeFileSync(join(from,'gate'),'changed gate');
  assert.equal(rollbackPlan(from,to,policy).mode,'code-default-required');
  writeFileSync(join(from,'gate'),'all three targets');writeFileSync(join(to,'reader'),'one changed byte');
  assert.equal(rollbackPlan(from,to,policy).mode,'code-default-required');
  assert.throws(()=>fingerprint(from,['../reader']));
  assert.throws(()=>fingerprint(from,['reader','reader']));
  rmSync(join(from,'gate'));symlinkSync(join(from,'reader'),join(from,'gate'));
  assert.throws(()=>fingerprint(from,files));
});
test('missing files in another retained scope do not hide a later exact pair', async t => {
  const {fingerprint,rollbackPlan}=await import('./content-release-contract.cjs').then(m=>m.default);
  const r=fixture(t),from=join(r,'next'),to=join(r,'old');
  writeFileSync(join(from,'reader'),'current');writeFileSync(join(to,'reader'),'retained');
  const pair={
    format:2,from:fingerprint(from,['reader']),to:fingerprint(to,['reader']),toFiles:['reader'],
    targets:[{id:'overview:en:chatgpt',facts:false}],reason:'Exact synthetic pair',evidence:'local test',
  };
  const other={...pair,toFiles:['reader','absent-in-this-release']};
  const policy={files:['reader'],approvedPairs:[other,pair]};
  assert.deepEqual(rollbackPlan(from,to,policy).targets,pair.targets);
  assert.equal(rollbackPlan(from,to,{...policy,approvedPairs:[other]}).mode,'code-default-required');
  writeFileSync(join(to,'reader'),'changed');
  assert.equal(rollbackPlan(from,to,policy).mode,'code-default-required');
  rmSync(join(to,'reader'));
  assert.equal(rollbackPlan(from,to,policy).mode,'code-default-required');
});

test('controller gates precede every switch and finalization uses all-target read-only verification', () => {
  const code=readFileSync(new URL('./rolling-release.mjs',import.meta.url),'utf8');
  assert.ok(code.includes("contentGate(old, ['upgrade'])"));
  assert.ok(code.includes("contentGate(old, ['verify-closed', '--production'])"));
  assert.ok(code.includes("contentGate(attempt.target, ['verify-origin', `http://127.0.0.1:${attempt.target.port}`, '--production']);\n    evidence('switch')"));
  assert.ok(code.includes("contentGate(release, ['verify-closed', '--production'])"));
  assert.ok(code.includes("path.join(here, 'content-release-fence.cjs')"));
  assert.ok(!code.includes("['scripts/content-deploy-fence.cjs', compatible"));
});
