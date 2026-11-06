import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { collectorUnit, collectorEnvironment, webRuntime, webRuntimeEnv, ownedTaskTimers } from '../../geosub-backend/deploy/linux-arm64/component-release-lib.mjs';
import { taskUnitText } from '../../geosub-backend/deploy/linux-arm64/rolling-release-lib.mjs';
import { recordCompleteSync } from '../../geosub-backend/scripts/sync-exchange-rates.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const deploy = path.join(root, 'geosub-backend/deploy/linux-arm64');
const tasks = ['collector-jobs', 'db-backup', 'price-pipeline', 'exchange-rate-sync'];

test('real web taskUnits and collector activation/restoration preserve every installed drop-in', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'geosub-heartbeat-release-'));
  try {
    const files = new Map();
    for (const task of tasks) {
      const value = execFileSync('python3', ['-c', `import importlib.util,sys; s=importlib.util.spec_from_file_location('i',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);sys.stdout.buffer.write(m.dropin(sys.argv[2],'a'*40))`, path.join(deploy, 'install-task-heartbeats.py'), task]);
      files.set(`/etc/systemd/system/geosub-${task}.service.d/50-geosub-heartbeat.conf`, value);
    }
    const expected = new Map(files);
    const atomic = (name, bytes) => {
      const target = path.join(temp, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
      files.set(name, Buffer.from(bytes));
    };
    for (const [name, bytes] of files) atomic(name, bytes);
    const source = fs.readFileSync(path.join(deploy, 'rolling-release.mjs'), 'utf8');
    const fn = source.slice(source.indexOf('function taskUnits(release) {'), source.indexOf('function installWeb(release) {'));
    for (const independent of [false, true]) {
      const calls = [];
      const taskUnits = runInNewContext(fn + '; taskUnits', {
        root: '/release', live: '/release/live', envFile: '/env', path, webRuntime, webRuntimeEnv, ownedTaskTimers,
        timers: tasks.map(task => `geosub-${task}.timer`), taskUnitText, atomic,
        fs: { existsSync: () => independent, readFileSync: (file) => fs.readFileSync(path.join(deploy, 'systemd', path.basename(file)), 'utf8') },
        run: (cmd, args) => calls.push([cmd, ...args]),
      });
      for (const name of ['new', 'old']) {
        taskUnits({ app: `/release/build-${name}/ai-price-site`, dir: `/release/build-${name}`, port: 3002, dist: '.next' });
        for (const [file, bytes] of expected) assert.deepEqual(fs.readFileSync(path.join(temp, file)), bytes);
        assert.ok(calls.some(call => call.join(' ') === 'systemctl daemon-reload'));
      }
    }
    // Run the controller's actual activate and restore closures, with filesystem/process IO doubles.
    const collector = fs.readFileSync(path.join(deploy, 'collector-release.mjs'), 'utf8');
    const activate = collector.slice(collector.indexOf('activate:async release=>{') + 'activate:'.length, collector.indexOf('\n    verify:async release=>'));
    const restore = collector.slice(collector.indexOf('restore:async snapshot=>{') + 'restore:'.length, collector.indexOf('\n    resume:'));
    const context = { root: '/release', envFile: '/env', collectorEnv: '/release/collector.env', service: 'geosub-collector-jobs.service', unitFile: '/etc/systemd/system/geosub-collector-jobs.service',
      restoreCollectorRecords: () => {}, priorRecords: {}, evidence: () => {}, point: () => {}, run: () => {}, atomic, collectorEnvironment, collectorUnit, path,
      fs: { readFileSync: () => fs.readFileSync(path.join(deploy, 'systemd/geosub-collector-jobs.service'), 'utf8') },
      restoreFile: (file, value) => atomic(file, value),
    };
    // Closures perform synchronous writes before returning resolved promises.
    await runInNewContext('(' + activate.replace(/,\s*$/, '') + ')', context)({ dir: '/release/new' });
    await runInNewContext('(' + restore.replace(/,\s*$/, '') + ')', context)({ link: '/release/old', unit: '[Service]\nType=oneshot\n', env: 'old environment' });
    for (const [file, bytes] of expected) assert.deepEqual(fs.readFileSync(path.join(temp, file)), bytes);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('Node FX completion records only a fully successful real sync, never partial or dry-run', () => {
  const env = { GEOSUB_TASK_HEARTBEAT_TASK: 'exchange-rate-sync', GEOSUB_TASK_HEARTBEAT_HELPER: '/opt/geosub-task-heartbeats/' + 'a'.repeat(40) + '/task-heartbeat.py' };
  const calls = [];
  const run = (...args) => { calls.push(args); return { status: 0 }; };
  for (const status of ['partial', 'failed']) recordCompleteSync({ status, dryRun: false }, env, run);
  recordCompleteSync({ status: 'succeeded', dryRun: true }, env, run);
  assert.equal(calls.length, 0);
  recordCompleteSync({ status: 'succeeded', dryRun: false }, env, run);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1].slice(1), ['record', 'exchange-rate-sync']);
  assert.doesNotThrow(() => recordCompleteSync({ status: 'succeeded' }, env, () => { throw Error('synthetic'); }));
});
