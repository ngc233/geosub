import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import { acquireCollectorBatchLock } from './collector-batch-lock.mjs';
import { executeMigrationPlan } from './component-release-lib.mjs';
import { finalizeExistingCandidate } from './rolling-finalize-lib.mjs';

const cli = fs.readFileSync(new URL('./rolling-release.mjs', import.meta.url), 'utf8');
const lockModule = new URL('./collector-batch-lock.mjs', import.meta.url).href;
function fixture(t) {
  assert.equal(process.platform, 'linux', 'Execute the controller suite in Linux (CI, installer or local Linux container)');
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'geosub-batch-lock-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'collector.lock');
  fs.writeFileSync(file, 'synthetic lock contents\n', { mode: 0o600 });
  return { dir, file };
}
function available(file) {
  const result = spawnSync('flock', ['-n', file, '/bin/true'], { timeout: 2000 });
  assert.equal(result.error, undefined);
  assert.ok([0, 1].includes(result.status), String(result.stderr));
  return result.status === 0;
}
async function child(t, code, args = []) {
  const proc = spawn(process.execPath, ['--input-type=module', '-e', code, ...args], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stderr = '';
  proc.stderr.on('data', chunk => { stderr += chunk; });
  const finished = once(proc, 'exit');
  const timer = setTimeout(() => proc.kill('SIGKILL'), 8000);
  t.after(() => { clearTimeout(timer); proc.kill('SIGKILL'); });
  await once(proc.stdout, 'data');
  assert.equal(stderr, '');
  return { proc, finished };
}

// Extract the unchanged real shell gate. Only its database boundary is stubbed
// with a synthetic count; SQL, comparison, failure accounting and pipefail run.
function exactLocalGate(count) {
  const source = fs.readFileSync(new URL('./post-deploy-check.sh', import.meta.url), 'utf8');
  const start = source.indexOf('  unrefreshed_exact_local_prices="$(');
  const end = source.indexOf('\n  fi', start) + '\n  fi'.length;
  assert.ok(start > 0 && end > start);
  const script = `set -euo pipefail
MIN_PUBLISHED_SUBSCRIPTION_USD=0.25
failures=0
psql_scalar() { printf '%s' "$1" > /dev/null; printf '%s' "$SYNTHETIC_COUNT"; }
pass() { printf 'OK %s\\n' "$1"; }
fail() { failures=$((failures + 1)); printf 'FAIL %s\\n' "$1"; }
${source.slice(start, end)}
(( failures == 0 ))
`;
  return spawnSync('/bin/bash', ['-c', script], {
    env: { ...process.env, SYNTHETIC_COUNT: String(count) }, encoding: 'utf8', timeout: 2000,
  });
}

test('real Linux admission waits for the batch review, not merely the observation write', async t => {
  const { dir, file } = fixture(t), phase = path.join(dir, 'phase');
  const { finished } = await child(t, `
    import fs from 'node:fs';
    import { acquireCollectorBatchLock } from ${JSON.stringify(lockModule)};
    const held = acquireCollectorBatchLock({lockFile:process.argv[1]});
    fs.writeFileSync(process.argv[2], '3');
    process.stdout.write('observed');
    const timer = setInterval(() => {
      if (!fs.existsSync(process.argv[2] + '.review')) return;
      clearInterval(timer);
      setTimeout(() => { fs.writeFileSync(process.argv[2], '0'); held.release(); }, 100);
    }, 10);
  `, [file, phase]);
  // Reproduce the old race before fixing admission: three same-price rows fail.
  assert.equal(exactLocalGate(fs.readFileSync(phase, 'utf8')).status, 1);
  fs.writeFileSync(phase + '.review', 'complete this synthetic batch');
  const lock = acquireCollectorBatchLock({ lockFile: file, timeoutSeconds: 2 });
  try {
    assert.equal(fs.readFileSync(phase, 'utf8'), '0');
    assert.equal(exactLocalGate('0').status, 0);
    assert.equal(available(file), false, 'next collector cannot enter during verification');
  } finally { lock.release(); }
  assert.deepEqual(await finished, [0, null]);
  assert.equal(available(file), true);
});

test('same-price gate still fails on 1 or 3 blockers after batch completion; malformed counts fail closed', t => {
  const { file } = fixture(t);
  for (const count of [1, 3, '', 'not-a-count']) {
    const lock = acquireCollectorBatchLock({ lockFile: file });
    try {
      const gate = exactLocalGate(count);
      assert.equal(gate.status, 1, gate.stdout);
      assert.match(gate.stdout, /FAIL published App Store prices have newer exact-local observations/);
      assert.equal(available(file), false);
    } finally { lock.release(); }
    assert.equal(available(file), true);
  }
});

test('bounded wait fails without stopping the current batch or leaking a lock', async t => {
  const { file } = fixture(t);
  const { proc, finished } = await child(t, `
    import { acquireCollectorBatchLock } from ${JSON.stringify(lockModule)};
    const held=acquireCollectorBatchLock({lockFile:process.argv[1]});
    process.stdout.write('ready');
    process.stdin.resume(); process.stdin.on('end',()=>held.release());
  `, [file]);
  const started = performance.now();
  assert.throws(() => acquireCollectorBatchLock({ lockFile: file, timeoutSeconds: 0.1 }), /did not finish/);
  assert.ok(performance.now() - started < 3000);
  assert.equal(proc.exitCode, null, 'batch was not killed');
  proc.stdin.end();
  assert.deepEqual(await finished, [0, null]);
  assert.equal(available(file), true);
});

test('lock is existing-file only, unchanged, regular and no-follow; timeout cannot exceed 120s', t => {
  const { dir, file } = fixture(t), original = fs.statSync(file);
  for (const timeoutSeconds of [0, -1, 121, Infinity, NaN, '120']) {
    assert.throws(() => acquireCollectorBatchLock({ lockFile: file, timeoutSeconds }), /timeout/);
  }
  const missing = path.join(dir, 'missing');
  assert.throws(() => acquireCollectorBatchLock({ lockFile: missing }), /ENOENT/);
  assert.equal(fs.existsSync(missing), false);
  fs.symlinkSync(file, path.join(dir, 'symlink'));
  assert.throws(() => acquireCollectorBatchLock({ lockFile: path.join(dir, 'symlink') }));
  assert.throws(() => acquireCollectorBatchLock({ lockFile: dir }), /not a regular file/);
  assert.equal(spawnSync('mkfifo', [path.join(dir, 'fifo')]).status, 0);
  assert.throws(() => acquireCollectorBatchLock({ lockFile: path.join(dir, 'fifo') }), /not a regular file/);
  const lock = acquireCollectorBatchLock({ lockFile: file });
  assert.equal(fs.readFileSync(file, 'utf8'), 'synthetic lock contents\n');
  const after = fs.statSync(file);
  for (const key of ['mode', 'uid', 'gid', 'ino', 'mtimeMs']) assert.equal(after[key], original[key]);
  lock.release(); lock.release();
  assert.throws(() => lock.assertHeld(), /no longer held/);
});

test('missing flock and non-timeout flock failures are not treated as a completed batch', t => {
  const { dir, file } = fixture(t);
  const program = `import {acquireCollectorBatchLock} from ${JSON.stringify(lockModule)}; acquireCollectorBatchLock({lockFile:process.argv[1]});`;
  for (const mode of ['missing', 'exit-2']) {
    if (mode === 'exit-2') fs.writeFileSync(path.join(dir, 'flock'), '#!/bin/sh\nexit 2\n', { mode: 0o755 });
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', program, file], {
      env: { ...process.env, PATH: dir }, encoding: 'utf8', timeout: 2000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /could not be acquired/);
    assert.equal(available(file), true);
  }
});

test('lock replacement is detected before the release can record success', t => {
  const { file } = fixture(t), lock = acquireCollectorBatchLock({ lockFile: file });
  try {
    fs.renameSync(file, `${file}.old`);
    fs.writeFileSync(file, 'different inode');
    assert.throws(() => lock.assertHeld(), /replaced/);
    assert.equal(available(`${file}.old`), false);
  } finally { lock.release(); }
  assert.equal(available(`${file}.old`), true);
});

test('controller SIGKILL releases admission without an orphan lock-holder process', async t => {
  const { file } = fixture(t);
  const { proc, finished } = await child(t, `
    import { acquireCollectorBatchLock } from ${JSON.stringify(lockModule)};
    acquireCollectorBatchLock({lockFile:process.argv[1]});
    process.stdout.write('ready'); setInterval(()=>{},1000);
  `, [file]);
  assert.equal(available(file), false);
  proc.kill('SIGKILL');
  assert.deepEqual(await finished, [null, 'SIGKILL']);
  assert.equal(available(file), true);
});

// Execute the controller's actual top-level try/catch/finally and admission
// function. External systemd/build/HTTP/DB boundaries are doubles; lock/flock
// and the actual gate shell block above are real. No production commands run.
async function releaseFlow(t, { failAt, recoveryFails = false, independent = true, migration = false, operation = 'upgrade' } = {}) {
  const { dir, file } = fixture(t), events = [];
  const previous = { id: 'old', dir: '/retained', app: '/retained/app', port: 3001, commit: 'a'.repeat(40), version: 'old' };
  const target = { id: 'new', dir: '/candidate', app: '/candidate/app', port: 3002, commit: 'b'.repeat(40), version: 'new' };
  const prior = { id: '20261110T110000Z-001', operation: 'upgrade', status: 'succeeded', target, previous, migration: { required: false } };
  if (operation === 'finalize') Object.assign(prior, { status: 'failed', detail: 'post-deploy-check.sh; recovery=incomplete' });
  const current = operation === 'rollback' ? { active: target, previous } : { active: previous };
  let busy;
  if (failAt === 'timeout') busy = acquireCollectorBatchLock({ lockFile: file });
  const boundary = (name, needsAdmission = false) => {
    events.push(name);
    if (needsAdmission && independent) assert.equal(available(file), false, `${name} must hold batch admission`);
    if ((name === failAt && name !== 'gate') || (recoveryFails && name === 'recovery')) throw Error(`fixture failure: ${name}`);
  };
  const context = {
    operation, args: operation === 'upgrade' ? ['--commit', target.commit] : ['--attempt', prior.id, '--confirm', prior.id, ...(operation === 'finalize' ? ['--commit', target.commit] : [])],
    root: dir, repo: '/test/repo', here: '/test/controller', stateFile: 'state', live: '/live', config: { routeFile: '/route', origin: 'http://127.0.0.1' },
    assets: '/assets', env: {}, envFile: '/env', path, process: { exitCode: 0 }, console: { log() {}, error(message) { events.push(`error:${message}`); } },
    structuredClone, timers: [], state: undefined, attempt: undefined, old: undefined, beforeState: undefined,
    switched: false, paused: false, lock: false, collectorAdmission: undefined,
    fs: {
      existsSync: p => p.endsWith('collector-state.json') ? independent : true,
      statfsSync: () => ({ bavail: 4 * 1024 ** 3, bsize: 1 }),
      mkdirSync() {}, rmdirSync: () => boundary('release-operation-lock'),
      readFileSync: p => p === '/route' ? 'route' : p.endsWith('VERSION') ? 'new' : 'build',
      realpathSync: () => target.dir, readdirSync: () => [prior.id, 'geosub_app_fixture.dump'],
    },
    checkedConfig: () => { context.lock = true; }, parseUpgradeCommit: () => target.commit, verifyUpgradeCommit: (a,b) => { assert.equal(a,b); return a; },
    safePath() {}, checkMigrationChanges() {}, migrationPlan: () => ({ required: migration, reason: 'fixture' }),
    executeMigrationPlan, finalizeExistingCandidate,
    json: p => p.endsWith('rolling.json') ? prior : p === 'state' ? current : p.endsWith('web-runtime.json') ? {} : {},
    route: () => 'route', webRuntime: () => ({}),
    read: (bin, args) => args.includes('rev-parse') ? target.commit : '',
    run: (bin, args) => {
      if (args[0]?.endsWith('post-deploy-check.sh')) {
        boundary('gate', true);
        const gate = exactLocalGate(failAt === 'gate' ? 3 : 0);
        if (gate.status !== 0) throw Error(`post-deploy-check.sh: ${gate.stdout.trim()}`);
      }
    },
    user() {}, script: (release, name) => boundary(name),
    save() {}, enabled: () => 'enabled', serviceActive: () => true, envWrapper: () => '/env', envFor: () => ({}),
    retainAssets: () => [], validateTaskUnits() {}, identity() {}, contentGate() {}, health: async () => {},
    pauseTimers: async () => { context.paused = true; boundary('pause'); },
    restoreTimers: () => { context.paused = false; boundary('restore-timers'); },
    installWeb: () => boundary('candidate-start', true),
    proxySwitch: release => boundary(release === previous ? 'recovery' : 'switch', true),
    proxyHealth: async () => {}, point() {}, taskUnits() {},
    rollbackFence: () => boundary('rollback-fence'),
    record: release => boundary(release === previous && operation !== 'rollback' ? 'record-old' : 'record', true),
    evidence: step => events.push(step), ok: () => true,
    acquireCollectorBatchLock: () => {
      boundary('acquire');
      const held = acquireCollectorBatchLock({ lockFile: file, timeoutSeconds: 0.1 });
      return { assertHeld: held.assertHeld, release: () => { boundary('unlock'); held.release(); } };
    },
  };
  const admission = cli.slice(cli.indexOf('function waitForCollectorBatch() {'), cli.indexOf('function point(dir) {'));
  const main = cli.slice(cli.indexOf("try {\n  const expectedUpgradeCommit"));
  assert.ok(admission.startsWith('function') && main.startsWith('try {'));
  try { await runInNewContext(`${admission}\n(async()=>{${main}})()`, context); }
  finally { busy?.release(); }
  assert.equal(available(file), true, 'all terminal paths release admission');
  return { events, exitCode: context.process.exitCode };
}

test('actual upgrade holds admission before starting candidate through gates and success record', async t => {
  const { events, exitCode } = await releaseFlow(t);
  assert.equal(exitCode, 0, events.join('\n'));
  for (const [a,b] of [['build','acquire'],['migration_skipped','acquire'],['acquire','candidate-start'],['candidate-start','switch'],['switch','gate'],['gate','record'],['record','unlock'],['unlock','release-operation-lock']]) {
    assert.ok(events.indexOf(a) >= 0 && events.indexOf(a) < events.indexOf(b), `${a} before ${b}: ${events}`);
  }
  assert.ok(!events.includes('pause'));
});

test('actual upgrade admission timeout prevents candidate start, traffic switch and gate', async t => {
  const { events, exitCode } = await releaseFlow(t, { failAt: 'timeout' });
  assert.equal(exitCode, 1);
  assert.ok(events.some(x => x.includes('did not finish')));
  for (const event of ['candidate-start','switch','gate','record']) assert.ok(!events.includes(event), event);
});

test('actual gate/record failures recover the old runtime under the same admission and then unlock', async t => {
  for (const failAt of ['gate', 'record']) {
    const { events, exitCode } = await releaseFlow(t, { failAt });
    assert.equal(exitCode, 1);
    for (const event of [failAt, 'recovery', 'record-old', 'unlock']) assert.ok(events.includes(event), events.join('\n'));
    assert.ok(events.indexOf('record-old') < events.indexOf('unlock'));
  }
});

test('migration pause/drain remains before admission, and legacy timer behavior remains intact', async t => {
  const migrated = await releaseFlow(t, { migration: true });
  assert.equal(migrated.exitCode, 0, migrated.events.join('\n'));
  for (const step of ['pause', 'backup', 'migrate']) assert.ok(migrated.events.indexOf(step) < migrated.events.indexOf('acquire'));
  const legacy = await releaseFlow(t, { independent: false });
  assert.equal(legacy.exitCode, 0, legacy.events.join('\n'));
  assert.ok(legacy.events.includes('pause'));
  assert.ok(!legacy.events.includes('acquire'));
});

test('actual retained rollback and finalize also hold admission through their complete checks', async t => {
  for (const operation of ['rollback', 'finalize']) {
    const { events, exitCode } = await releaseFlow(t, { operation });
    assert.equal(exitCode, 0, events.join('\n'));
    for (const [a,b] of [['acquire','gate'],['gate','record'],['record','unlock']]) assert.ok(events.indexOf(a) < events.indexOf(b), events.join('\n'));
  }
});


test('candidate startup and recovery failures still release admission without pretending success', async t => {
  for (const options of [{ failAt: 'candidate-start' }, { failAt: 'gate', recoveryFails: true }]) {
    const { events, exitCode } = await releaseFlow(t, options);
    assert.equal(exitCode, 1);
    assert.ok(events.includes('unlock'));
    assert.ok(!events.includes('record'));
    if (options.recoveryFails) assert.ok(events.some(x => x.includes('Recovery requires attention')));
    else assert.ok(!events.includes('switch'));
  }
});

test('real queued collector shell cannot start its batch until release admission is relinquished', async t => {
  const { dir, file } = fixture(t);
  const bin = path.join(dir, 'bin'); fs.mkdirSync(bin);
  fs.mkdirSync(path.join(dir, 'scripts'));
  const marker = path.join(dir, 'batch-started');
  fs.writeFileSync(path.join(bin, 'pwsh'), '#!/bin/bash\nprintf "batch started" > "$SYNTHETIC_MARKER"\n', { mode: 0o755 });
  const environment = path.join(dir, 'collector.env');
  fs.writeFileSync(environment, `export GEOSUB_BACKEND_DIR='${dir}'\nexport GEOSUB_COLLECTOR_LOCK_DIR='${dir}'\nexport GEOSUB_COLLECTOR_LOCK_FILE='${file}'\n`);
  const held = acquireCollectorBatchLock({ lockFile: file });
  const proc = spawn('/bin/bash', [new URL('./run-collector-jobs.sh', import.meta.url).pathname], {
    env: { ...process.env, PATH: bin + ':' + process.env.PATH, SYNTHETIC_MARKER: marker, GEOSUB_COLLECTOR_ENV_FILE: environment },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const finished = once(proc, 'exit');
  const timeout = setTimeout(() => proc.kill('SIGKILL'), 5000);
  t.after(() => { clearTimeout(timeout); proc.kill('SIGKILL'); held.release(); });
  await delay(100);
  assert.equal(proc.exitCode, null);
  assert.equal(fs.existsSync(marker), false);
  held.release();
  assert.deepEqual(await finished, [0, null]);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'batch started');
});
