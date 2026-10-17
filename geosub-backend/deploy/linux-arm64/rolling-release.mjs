#!/usr/bin/env node
// Root-owned control plane; application builds and processes run as geosub.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomic, retainAssets, route, timers, safePath, digest, checkMigrationChanges, contentRollbackCompatible } from './rolling-release-lib.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const run = (bin, args = [], options = {}) => execFileSync(bin, args, {
  stdio: 'inherit',
  ...options
});
const read = (bin, args = []) => run(bin, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8'
}).trim();
const ok = (bin, args) => spawnSync(bin, args, {
  stdio: 'ignore'
}).status === 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const json = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const save = (f, v) => atomic(f, JSON.stringify(v, null, 2) + '\n');
const env = process.env;
const root = safePath(env.GEOSUB_RELEASE_DIR || '/opt/geosub/releases');
const repo = safePath(env.GEOSUB_REPO_DIR || '/opt/geosub/geosub');
const envFile = safePath(env.GEOSUB_ENV_FILE || '/etc/geosub/geosub.env');
const configFile = safePath(env.GEOSUB_ROLLING_CONFIG || '/etc/geosub/rolling.json');
const stateFile = path.join(root, 'rolling-state.json'),
  assets = safePath(env.GEOSUB_ASSET_DIR || path.join(root, 'assets')),
  live = path.join(root, 'live');
const [operation, ...args] = process.argv.slice(2);
let config,
  state,
  beforeState,
  attempt,
  old,
  switched = false,
  paused = false,
  lock = false;
const controlEnv = process.env;
const enabled = name => spawnSync('systemctl', ['is-enabled', name], {
  encoding: 'utf8'
}).stdout.trim();
function proxy(args, capture = false) {
  const bin = config.proxyContainer ? 'docker' : config.proxyBin;
  const argv = config.proxyContainer ? ['exec', config.proxyContainer, config.proxyBin, ...args, ...config.proxyArgs] : [...args, ...config.proxyArgs];
  return capture ? read(bin, argv) : run(bin, argv);
}
function serviceActive(name) {
  return ok('systemctl', ['is-active', '--quiet', name]);
}
function envFor(release) {
  return {
    ...controlEnv,
    GEOSUB_ENV_FILE: release.envFile
  };
}
function user(release, command, args = []) {
  run('sudo', ['-u', 'geosub', '--', 'bash', '-c', 'set -ae; source "$1"; shift; cd "$1"; shift; exec "$@"', 'geosub', release.envFile, release.app, command, ...args]);
}
function script(release, name, args = []) {
  run('bash', [path.join(release.dir, 'geosub-backend/deploy/linux-arm64', name), ...args], {
    env: envFor(release)
  });
}
function evidence(step, status = 'running', detail = '') {
  attempt = {
    ...attempt,
    step,
    status,
    detail,
    updatedAt: new Date().toISOString()
  };
  save(path.join(root, 'attempts', attempt.id, 'rolling.json'), attempt);
}
function point(dir) {
  const tmp = `${live}.pending`;
  fs.rmSync(tmp, {
    force: true
  });
  fs.symlinkSync(dir, tmp);
  fs.renameSync(tmp, live);
}
function envWrapper(release) {
  const f = path.join(root, 'environments', `${release.id}.sh`);
  atomic(f, `source '${envFile}'\nexport GEOSUB_BACKEND_DIR='${release.dir}/geosub-backend'\nexport GEOSUB_FRONTEND_DIR='${release.app}'\nexport GEOSUB_NEXT_DIST_DIR='${release.dist}'\nexport GEOSUB_WEB_SERVICE='${release.unit}'\nexport GEOSUB_WEB_HEALTH_URL='http://127.0.0.1:${release.port}/api/health'\nexport GEOSUB_TIMER_STATE_FILE='${root}/timers.json'\n`, 0o640);
  run('chown', ['root:geosub', f]);
  return f;
}
async function health(release) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${release.port}/api/health`, {
        redirect: 'error',
        signal: AbortSignal.timeout(3000)
      });
      if (r.status === 200) {
        const login = await fetch(`http://127.0.0.1:${release.port}/admin-login`, {
          redirect: 'error',
        signal: AbortSignal.timeout(3000)
        });
        if (login.status === 200) return;
      }
    } catch {}
    await sleep(500);
  }
  throw Error(`Candidate health failed: ${release.id}`);
}
async function proxyHealth(release) {
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(`${config.origin}/api/health`, {
        redirect: 'error',
        signal: AbortSignal.timeout(3000),
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (r.status === 200 && r.headers.get('x-geosub-release') === String(release.port)) {
        const html = await (await fetch(`${config.origin}/admin-login`, {
          redirect: 'error',
        signal: AbortSignal.timeout(3000)
        })).text();
        if (html.includes(release.buildId)) return; // pages embed buildId only on some Next versions; fall back to an exact candidate asset.
        const asset = release.assets.find(a => a.file.endsWith('.js'));
        const a = await fetch(`${config.origin}/_next/static/${asset.file}`, {
          redirect: 'error',
        signal: AbortSignal.timeout(3000)
        });
        if (a.status === 200 && Buffer.from(await a.arrayBuffer()).equals(fs.readFileSync(path.join(assets, asset.file)))) return;
      }
    } catch {}
    await sleep(500);
  }
  throw Error('Proxy health/static readback failed');
}
function proxySwitch(release) {
  atomic(config.routeFile, route(release.port, config.proxyAssets || assets), 0o644);
  proxy(['-t']);
  const dump = proxy(['-T'], true);
  if (!dump.includes(route(release.port, config.proxyAssets || assets).trim())) throw Error('Proxy mounted configuration is stale or differs from candidate route');
  proxy(['-s', 'reload']);
}
async function pauseTimers() {
  const snapshot = {};
  for (const timer of timers) {
    snapshot[timer] = {
      active: serviceActive(timer),
      enabled: enabled(timer)
    };
  }
  save(path.join(root, 'timers.json'), snapshot);
  attempt.timers = snapshot;
  paused = true;
  evidence('pause_timers');
  for (const timer of timers) if (snapshot[timer].active) run('systemctl', ['stop', timer]);
  for (let i = 0; i < 120; i++) {
    if (timers.every(t => !serviceActive(t.replace('.timer', '.service')))) return;
    await sleep(1000);
  }
  throw Error('Scheduled task still running; migration was not started');
}
function restoreTimers() {
  for (const [timer, value] of Object.entries(attempt.timers || {})) {
    if (value.active) run('systemctl', ['start', timer]);else run('systemctl', ['stop', timer]);
    if (enabled(timer) !== value.enabled) throw Error('Timer enabled state changed');
  }
  paused = false;
}
function taskUnits(release) {
  for (const timer of timers) {
    const unit = timer.replace('.timer', '.service');
    const source = path.join(release.dir, 'geosub-backend/deploy/linux-arm64/systemd', unit);
    let text = fs.readFileSync(source, 'utf8').replaceAll('/opt/geosub/geosub-backend', `${live}/geosub-backend`).replaceAll('/opt/geosub/ai-price-site', `${live}/ai-price-site`).replace('[Service]', '[Service]\nEnvironment=GEOSUB_ENV_FILE=' + root + '/task.env');
    atomic(`/etc/systemd/system/${unit}`, text, 0o644);
  }
  atomic(path.join(root, 'task.env'), `source '${envFile}'\nexport GEOSUB_BACKEND_DIR='${live}/geosub-backend'\nexport GEOSUB_FRONTEND_DIR='${live}/ai-price-site'\n`, 0o640);
  run('chown', ['root:geosub', path.join(root, 'task.env')]);
  run('systemctl', ['daemon-reload']);
}
function installWeb(release) {
  const unit = `[Unit]\nDescription=GeoSub retained release ${release.id}\nAfter=network-online.target\n[Service]\nUser=geosub\nGroup=geosub\nWorkingDirectory=${release.app}\nExecStart=/bin/bash -c 'set -ae; source "${release.envFile}"; exec ${process.execPath} node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${release.port}'\nRestart=on-failure\nRestartSec=3\nEnvironment=NODE_ENV=production\nMemoryMax=2200M\nNoNewPrivileges=true\nPrivateTmp=true\n[Install]\nWantedBy=multi-user.target\n`;
  atomic(`/etc/systemd/system/${release.unit}`, unit, 0o644);
  run('systemctl', ['daemon-reload']);
  run('systemctl', ['enable', '--now', release.unit]);
}
function identity(release) {
  if (fs.readFileSync(path.join(release.app, release.dist, 'BUILD_ID'), 'utf8').trim() !== release.buildId) throw Error('Retained build identity changed');
  for (const a of release.assets) if (digest(path.join(assets, a.file)) !== a.hash) throw Error('Retained static asset changed');
}
function rollbackFence(from, to) {
  const policy = json(path.join(here, 'rolling-content-compatibility.json'));
  const compatible = contentRollbackCompatible(from.dir, to.dir, policy);
  // Both operations close admission under the same DB lock. Only an exact reviewed
  // reader/schema pair may retain non-default content when switching application code.
  attempt.contentRollbackPolicy = compatible ? 'audited-compatible-readers' : 'code-default-required';
  evidence('content_fence');
  user(from, 'node', ['scripts/content-deploy-fence.cjs', compatible ? 'upgrade' : 'rollback']);
}
function record(release) {
  atomic(path.join(root, 'current.env'), `GEOSUB_VERSION=${release.version}\nGEOSUB_COMMIT=${release.commit}\nGEOSUB_BRANCH=rolling-v1\nGEOSUB_DEPLOYED_AT=${new Date().toISOString()}\n`);
  save(stateFile, state);
}
function checkedConfig() {
  if (process.getuid() !== 0 || process.platform !== 'linux') throw Error('Linux root required');
  if (!['upgrade', 'rollback', 'adopt'].includes(operation)) throw Error('Use upgrade, rollback --attempt ID --confirm ID, or adopt --confirm SHA');
  for (const f of [configFile, envFile]) {
    const s = fs.statSync(f);
    if (s.uid !== 0 || s.mode & 0o022) throw Error('Configuration must be root-owned and not group/world writable');
  }
  config = json(configFile);
  safePath(config.routeFile);
  safePath(config.proxyBin);
  if (config.proxyAssets) safePath(config.proxyAssets);
  if (config.proxyRouteFile) safePath(config.proxyRouteFile);
  if (config.proxyContainer && !/^[a-zA-Z0-9_.-]+$/.test(config.proxyContainer)) throw Error('Invalid proxy container');
  if (!Array.isArray(config.proxyArgs) || config.proxyArgs.some(x => typeof x !== 'string')) throw Error('proxyArgs required');
  const origin = new URL(config.origin);
  if (!['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.protocol !== 'http:') throw Error('Origin probe must use local HTTP listener');
  if (env.GEOSUB_RUN_BACKFILLS === 'true' || env.GEOSUB_RUN_CONTENT_MIGRATIONS === 'true') throw Error('Backfills forbidden in rolling deployment');
  if (!fs.existsSync(path.join(root, 'current.env'))) throw Error('Successful release record required');
  if (!ok('systemctl', ['is-active', '--quiet', 'basic.target'])) throw Error('Real systemd is required');
  fs.mkdirSync(root, {
    recursive: true
  });
  fs.mkdirSync(path.join(root, 'rolling.lock'));
  lock = true;
}
try {
  checkedConfig();
  if (operation === 'adopt') {
    if (fs.existsSync(stateFile)) throw Error('Already adopted');
    const commit = read('git', ['-c', `safe.directory=${repo}`, '-C', repo, 'rev-parse', 'HEAD']);
    if (args.join(' ') !== `--confirm ${commit}`) throw Error('Explicit current commit confirmation required');
    if (read('git', ['-c', `safe.directory=${repo}`, '-C', repo, 'status', '--porcelain'])) throw Error('Current checkout must be clean');
    run('node', [path.join(repo, 'scripts/check-release-version.mjs'), '--root', repo]);
    const current = fs.readFileSync(path.join(root, 'current.env'), 'utf8');
    if (!current.includes(`GEOSUB_COMMIT=${commit}\n`) && !current.includes(`GEOSUB_COMMIT=${commit.slice(0, 7)}\n`)) throw Error('Current release record differs from checkout');
    const release = {
      id: `adopted-${commit.slice(0, 12)}`,
      dir: repo,
      app: path.join(repo, 'ai-price-site'),
      dist: env.GEOSUB_NEXT_DIST_DIR || '.next',
      port: 3000,
      unit: 'geosub-web.service',
      commit,
      version: fs.readFileSync(path.join(repo, 'VERSION'), 'utf8').trim()
    };
    release.buildId = fs.readFileSync(path.join(release.app, release.dist, 'BUILD_ID'), 'utf8').trim();
    release.envFile = envWrapper(release);
    await health(release);
    release.assets = retainAssets(path.join(release.app, release.dist, 'static'), assets);
    // The site's include is installed separately in the approved adoption window.
    // Validate that this exact file participates in the running proxy configuration.
    const before = fs.existsSync(config.routeFile) ? fs.readFileSync(config.routeFile) : null;
    try {
      atomic(config.routeFile, route(3000, config.proxyAssets || assets), 0o644);
      const dump = proxy(['-T'], true);
      if (!dump.includes(`# configuration file ${config.proxyRouteFile || config.routeFile}:`)) throw Error('Proxy does not include managed route file');
      proxy(['-t']);
      proxy(['-s', 'reload']);
      await proxyHealth(release);
    } catch (error) {
      if (before) atomic(config.routeFile, before, 0o644);else fs.rmSync(config.routeFile, {
        force: true
      });
      throw error;
    }
    point(repo);
    state = {
      active: release,
      previous: null
    };
    record(release);
    console.log('Existing release adopted; no application restart.');
  } else {
    state = json(stateFile);
    beforeState = structuredClone(state);
    old = state.active;
    identity(old);
    await health(old);
    let pinned;
    if (operation === 'upgrade') {
      if (args.length) throw Error('Upgrade takes no positional arguments');
      if (read('git', ['-c', `safe.directory=${repo}`, '-C', repo, 'status', '--porcelain', '--untracked-files=normal'])) throw Error('Release repository must be clean');
      run('sudo', ['-u', 'geosub', 'git', '-C', repo, 'fetch', 'origin', env.GEOSUB_GIT_BRANCH || 'main']);
      const commit = read('git', ['-c', `safe.directory=${repo}`, '-C', repo, 'rev-parse', 'FETCH_HEAD']);
      run('node', [path.join(repo, 'scripts/check-release-version.mjs'), '--root', repo, '--ref', commit, '--current', path.join(root, 'current.env')]);
      const changes = read('git', ['-c', `safe.directory=${repo}`, '-C', repo, 'diff', '--name-status', '--no-renames', old.commit, commit]).split('\n').filter(Boolean).map(line => {
        const [status, p] = line.split('\t');
        return {
          status,
          path: p,
          hash: ''
        };
      });
      const approved = json(path.join(here, 'rolling-migrations.json'));
      // Hash exact git blobs; whitespace normalization is deliberately not used here.
      for (const row of changes) {
        if (row.status !== 'D' && (row.path.startsWith('geosub-backend/sql/') || row.path.startsWith('ai-price-site/prisma/migrations/'))) {
          const bytes = run('git', ['-c', `safe.directory=${repo}`, '-C', repo, 'show', `${commit}:${row.path}`], {
            stdio: ['ignore', 'pipe', 'pipe']
          });
          const {
            createHash
          } = await import('node:crypto');
          row.hash = createHash('sha256').update(bytes).digest('hex');
        }
      }
      checkMigrationChanges(changes, approved);
      if (fs.statfsSync(root).bavail * fs.statfsSync(root).bsize < 3 * 1024 ** 3) throw Error('At least 3 GiB free space required; retained resources will not be deleted');
      pinned = commit;
    }
    const stamp = new Date().toISOString();
    const id = stamp.replace(/[-:]/g, '').replace(/\.(\d+)Z$/, 'Z-$1');
    attempt = {
      id,
      operation,
      previous: old,
      status: 'started',
      createdAt: new Date().toISOString()
    };
    evidence('preflight');
    if (operation === 'upgrade') {
      const commit = pinned;
      const dir = path.join(root, 'builds', `${commit.slice(0, 12)}-${id}`);
      safePath(dir);
      fs.mkdirSync(dir, {
        recursive: true
      });
      run('bash', ['-o', 'pipefail', '-c', 'git -c safe.directory="$1" -C "$1" archive "$2" | tar -x -C "$3"', 'archive', repo, commit, dir]);
      run('chown', ['-R', 'geosub:geosub', dir]);
      const release = {
        id: `${commit.slice(0, 12)}-${id}`,
        dir,
        app: path.join(dir, 'ai-price-site'),
        dist: '.next',
        port: old.port === 3001 ? 3002 : 3001,
        unit: `geosub-web-${commit.slice(0, 12)}-${id}.service`,
        commit,
        version: fs.readFileSync(path.join(dir, 'VERSION'), 'utf8').trim()
      };
      release.envFile = envWrapper(release);
      attempt.target = release;
      evidence('build');
      if (state.previous?.port === release.port) {
        run('systemctl', ['disable', '--now', state.previous.unit]);
      }
      // Build is deliberately before the content fence, task pause and migration.
      run('sudo', ['-u', 'geosub', '--', 'bash', '-c', 'cd "$1" && npm ci --omit=dev', 'backend', path.join(dir, 'geosub-backend')]);
      user(release, 'npm', ['ci']);
      user(release, 'npx', ['prisma', 'generate']);
      user(release, 'npm', ['run', 'build']);
      release.buildId = fs.readFileSync(path.join(release.app, '.next/BUILD_ID'), 'utf8').trim();
      release.assets = retainAssets(path.join(release.app, '.next/static'), assets);
      run('chown', ['-R', 'root:geosub', dir]);
      fs.mkdirSync(path.join(release.app, '.next/cache'), {
        recursive: true
      });
      run('chown', ['-R', 'geosub:geosub', path.join(release.app, '.next/cache')]);
      evidence('content_fence');
      user(old, 'node', ['scripts/content-deploy-fence.cjs', 'upgrade']);
      await pauseTimers();
      evidence('backup');
      script(release, 'db-backup.sh');
      const backupDir = env.GEOSUB_BACKUP_DIR || '/opt/geosub/backups';
      const backups = fs.readdirSync(backupDir).filter(x => x.startsWith(`${env.GEOSUB_DB_NAME || 'geosub_app'}_`) && x.endsWith('.dump')).sort();
      if (!backups.length) throw Error('No verified backup');
      attempt.backup = path.join(backupDir, backups.at(-1));
      run('sha256sum', ['-c', attempt.backup + '.sha256']);
      evidence('migrate');
      script(release, 'db-apply-sql.sh', ['schema']);
      user(release, 'node', ['scripts/prepare-prisma-baseline.cjs']);
      user(release, 'npx', ['prisma', 'migrate', 'deploy']);
      script(release, 'db-smoke-check.sh');
      user(release, 'npm', ['run', 'sync:logos']);
      evidence('candidate_start');
      installWeb(release);
      await health(release);
      identity(release);
    } else {
      const opt = Object.fromEntries(Array.from({
        length: args.length / 2
      }, (_, i) => [args[i * 2], args[i * 2 + 1]]));
      const ref = opt['--attempt'];
      if (!/^\d{8}T\d{6}Z(?:-\d{3})?$/.test(ref || '') || opt['--confirm'] !== ref || Object.keys(opt).length !== 2) throw Error('Explicit --attempt ID --confirm ID required');
      const prior = json(path.join(root, 'attempts', ref, 'rolling.json'));
      if (prior.status !== 'succeeded' || prior.operation !== 'upgrade' || old.id !== prior.target?.id || state.previous?.id !== prior.previous?.id) throw Error('Stale or already rolled-back attempt');
      if (!prior.backup) throw Error('Rollback backup missing');
      run('sha256sum', ['-c', prior.backup + '.sha256']);
      attempt.target = prior.previous;
      attempt.backup = prior.backup;
      identity(attempt.target);
      evidence('content_fence');
      rollbackFence(old, attempt.target);
      await pauseTimers();
      run('systemctl', ['start', attempt.target.unit]);
      await health(attempt.target);
    }
    evidence('switch');
    switched = true;
    proxySwitch(attempt.target);
    await proxyHealth(attempt.target);
    point(attempt.target.dir);
    taskUnits(attempt.target);
    restoreTimers();
    evidence('post_deploy');
    run('bash', [path.join(here, 'post-deploy-check.sh')], {
      env: envFor(attempt.target)
    });
    state = {
      active: attempt.target,
      previous: old
    };
    record(attempt.target);
    evidence('complete', 'succeeded');
    if (beforeState.previous && ![old.id, attempt.target.id].includes(beforeState.previous.id)) ok('systemctl', ['disable', '--now', beforeState.previous.unit]);
    console.log(`Release ${attempt.target.version} ${operation} verified; previous build retained.`);
  }
} catch (error) {
  console.error(error.message);
  if (attempt) {
    let recovered = true;
    try {
      if (switched) {
        rollbackFence(attempt.target, old);
        proxySwitch(old);
        await proxyHealth(old);
        point(old.dir);
        taskUnits(old);
        state = beforeState;
        record(old);
      }
      if (paused || switched) restoreTimers();
      if (attempt.target && attempt.target.id !== old.id && operation === 'upgrade' && fs.existsSync('/etc/systemd/system/' + attempt.target.unit)) run('systemctl', ['disable', '--now', attempt.target.unit]);
    } catch (recovery) {
      recovered = false;
      console.error(`Recovery requires attention: ${recovery.message}`);
    }
    evidence(attempt.step, 'failed', `${error.message}; recovery=${recovered ? 'verified' : 'incomplete'}`);
  }
  process.exitCode = 1;
} finally {
  if (lock) fs.rmdirSync(path.join(root, 'rolling.lock'));
}
