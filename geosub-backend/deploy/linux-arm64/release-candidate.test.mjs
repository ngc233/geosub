import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseUpgradeCommit, verifyUpgradeCommit } from './rolling-release-lib.mjs';

const expected = 'a'.repeat(40);
const other = 'b'.repeat(40);
const rolling = new URL('./rolling-release.mjs', import.meta.url).pathname;
const upgrade = new URL('./upgrade.sh', import.meta.url).pathname;

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'geosub-candidate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['repo/.git', 'repo/ai-price-site', 'repo/geosub-backend', 'release', 'bin', 'app/.next']) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  writeFileSync(join(root, 'release/current.env'), '');
  writeFileSync(join(root, 'settings.sh'), '');
  return root;
}

test('upgrade accepts only a single full candidate SHA and binds the fetched identity', () => {
  assert.equal(parseUpgradeCommit(['--commit', expected]), expected);
  assert.equal(verifyUpgradeCommit(expected, expected), expected);
  assert.throws(() => verifyUpgradeCommit(expected, other), error =>
    error.message.includes(expected) && error.message.includes(other));
  for (const args of [[], ['--commit'], ['--commit', 'main'], ['--commit', expected.slice(1)],
    ['--commit', expected + 'a'], ['--commit', expected.toUpperCase()], ['--commit', expected + '\n'],
    ['--commit', expected, '--commit', other], ['--wrong', expected]]) {
    assert.throws(() => parseUpgradeCommit(args), /exact 40-character candidate SHA/);
  }
});

test('both actual upgrade entry points reject missing or malformed identity before configuration', () => {
  for (const args of [[], ['--commit', 'main'], ['--commit', expected, '--commit', other]]) {
    for (const [bin, command] of [[process.execPath, [rolling, 'upgrade']], ['/bin/bash', [upgrade]]]) {
      const result = spawnSync(bin, [...command, ...args], { encoding: 'utf8', timeout: 5000 });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /exact 40-character candidate SHA/);
    }
  }
});

// Run the real controller with isolated files and strict boundary doubles.
// No source extraction, production config, network, systemd, build or migration.
function runRolling(t, fetched) {
  const root = fixture(t);
  const config = join(root, 'rolling.json');
  const settings = join(root, 'settings.sh');
  const trace = join(root, 'trace.jsonl');
  writeFileSync(config, JSON.stringify({ routeFile: join(root, 'route.conf'), proxyBin: '/test/nginx',
    proxyArgs: [], origin: 'http://127.0.0.1' }));
  writeFileSync(join(root, 'app/.next/BUILD_ID'), 'retained-build');
  writeFileSync(join(root, 'release/rolling-state.json'), JSON.stringify({ active: {
    id: 'retained', app: join(root, 'app'), dist: '.next', buildId: 'retained-build', assets: [], port: 3000,
  }}));
  const preload = join(root, 'boundary.mjs');
  writeFileSync(preload, `
import fs from 'node:fs';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const record = value => fs.appendFileSync(${JSON.stringify(trace)}, JSON.stringify(value)+'\\n');
Object.defineProperty(process, 'platform', { value: 'linux' });
process.getuid = () => 0;
const realStat = fs.statSync;
fs.statSync = (file, ...args) => {
  const stat = realStat(file, ...args);
  return [${JSON.stringify(config)}, ${JSON.stringify(settings)}].includes(file) ? { ...stat, uid: 0 } : stat;
};
globalThis.fetch = async () => ({ status: 200 });
cp.spawnSync = (bin, args) => {
  if (bin === 'systemctl' && args.join(' ') === 'is-active --quiet basic.target') return { status: 0 };
  throw Error('Unexpected spawn: '+bin);
};
cp.execFileSync = (bin, args) => {
  if (bin === 'git' && args.includes('status')) return '';
  if (bin === 'sudo' && args.includes('fetch')) { record('fetch'); return ''; }
  if (bin === 'git' && args.includes('rev-parse') && args.at(-1) === 'FETCH_HEAD') return ${JSON.stringify(fetched)};
  if (bin === 'node' && args[0].endsWith('/scripts/check-release-version.mjs')) {
    record({ versionGate: args[args.indexOf('--ref') + 1] });
    throw Error('TEST_STOP_AFTER_COMMIT_GATE');
  }
  throw Error('Unexpected command: '+bin);
};
syncBuiltinESMExports();
`);
  const result = spawnSync(process.execPath, ['--import', preload, rolling, 'upgrade', '--commit', expected], {
    encoding: 'utf8', timeout: 5000,
    env: { ...process.env, GEOSUB_RELEASE_DIR: join(root, 'release'), GEOSUB_REPO_DIR: join(root, 'repo'),
      GEOSUB_ENV_FILE: settings, GEOSUB_ROLLING_CONFIG: config, GEOSUB_ASSET_DIR: join(root, 'assets'),
      GEOSUB_RUN_BACKFILLS: 'false', GEOSUB_RUN_CONTENT_MIGRATIONS: 'false' },
  });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(existsSync(join(root, 'release/attempts')), false);
  assert.equal(existsSync(join(root, 'release/rolling.lock')), false);
  assert.equal(existsSync(join(root, 'route.conf')), false);
  return { result, calls: readFileSync(trace, 'utf8').trim().split('\n').map(JSON.parse) };
}

test('actual rolling controller continues with the exact SHA after a matching fetch', t => {
  const { result, calls } = runRolling(t, expected);
  assert.match(result.stderr, /TEST_STOP_AFTER_COMMIT_GATE/);
  assert.deepEqual(calls, ['fetch', { versionGate: expected }]);
});

test('actual rolling controller rejects a moved branch before the version gate or release changes', t => {
  const { result, calls } = runRolling(t, other);
  assert.match(result.stderr, /Candidate commit mismatch/);
  assert.ok(result.stderr.includes(expected) && result.stderr.includes(other));
  assert.deepEqual(calls, ['fetch']);
});

test('maintenance entry enforces the same identity with fetch and with skip-git-pull', t => {
  for (const skip of ['false', 'true']) {
    for (const fetched of [expected, other]) {
      const root = fixture(t);
      writeFileSync(join(root, 'bin/id'), '#!/bin/bash\necho 0\n', { mode: 0o755 });
      writeFileSync(join(root, 'bin/sudo'), `#!/bin/bash
case " $* " in
  *" status "*|*" fetch "*|*" merge-base "*) exit 0 ;;
  *" rev-parse "*) echo '${fetched}' ;;
  *) echo 'Unexpected sudo' >&2; exit 99 ;;
esac
`, { mode: 0o755 });
      writeFileSync(join(root, 'bin/node'), '#!/bin/bash\necho "TEST_VERSION_GATE $*" >&2\nexit 37\n', { mode: 0o755 });
      const result = spawnSync('/bin/bash', [upgrade, '--commit', expected], {
        encoding: 'utf8', timeout: 5000,
        env: { ...process.env, PATH: join(root, 'bin') + ':' + process.env.PATH,
          GEOSUB_ENV_FILE: join(root, 'settings.sh'), GEOSUB_REPO_DIR: join(root, 'repo'),
          GEOSUB_BACKEND_DIR: join(root, 'repo/geosub-backend'), GEOSUB_FRONTEND_DIR: join(root, 'repo/ai-price-site'),
          GEOSUB_RELEASE_DIR: join(root, 'release'), GEOSUB_DEPLOY_MODE: 'maintenance-v1', GEOSUB_SKIP_GIT_PULL: skip },
      });
      assert.equal(existsSync(join(root, 'release/attempts')), false);
      if (fetched === expected) {
        assert.equal(result.status, 37, result.stderr);
        assert.match(result.stderr, new RegExp('TEST_VERSION_GATE .*--ref ' + expected));
      } else {
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /Candidate commit mismatch/);
        assert.ok(result.stderr.includes(expected) && result.stderr.includes(other));
        assert.doesNotMatch(result.stderr, /TEST_VERSION_GATE/);
      }
    }
  }
});

test('actual upgrade wrapper forwards the exact candidate to the rolling controller', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'bin/id'), '#!/bin/bash\necho 0\n', { mode: 0o755 });
  writeFileSync(join(root, 'bin/node'), '#!/bin/bash\nprintf "%s\\n" "$@"\n', { mode: 0o755 });
  const result = spawnSync('/bin/bash', [upgrade, '--commit', expected], {
    encoding: 'utf8', timeout: 5000,
    env: { ...process.env, PATH: join(root, 'bin') + ':' + process.env.PATH,
      GEOSUB_ENV_FILE: join(root, 'settings.sh'), GEOSUB_DEPLOY_MODE: 'rolling-v1' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [rolling, 'upgrade', '--commit', expected]);
});
