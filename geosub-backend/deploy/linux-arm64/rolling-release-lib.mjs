import contentContract from './content-release-contract.cjs';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, existsSync, mkdirSync, copyFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
export const timers = ['exchange-rate-sync', 'price-pipeline', 'collector-jobs', 'discovery-scan', 'analytics-aggregation', 'operations-brief', 'db-backup', 'event-retention'].map(x => `geosub-${x}.timer`);
export const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
export function atomic(file, text, mode = 0o600) {
  mkdirSync(dirname(file), {
    recursive: true
  });
  const temp = `${file}.pending-${process.pid}`;
  writeFileSync(temp, text, {
    mode
  });
  renameSync(temp, file);
}
export function safePath(p) {
  if (!/^\/[a-zA-Z0-9_./-]+$/.test(p) || p.split('/').includes('..')) throw Error('Unsafe absolute deployment path');
  return p;
}
export function files(root, prefix = '') {
  return readdirSync(join(root, prefix)).flatMap(name => {
    const rel = join(prefix, name),
      s = lstatSync(join(root, rel));
    if (s.isSymbolicLink()) throw Error('Symbolic link in static assets');
    return s.isDirectory() ? files(root, rel) : [rel];
  });
}
export function retainAssets(source, target) {
  const entries = files(source);
  if (!entries.length) throw Error('Empty static asset set');
  for (const file of entries) {
    const from = join(source, file),
      to = join(target, file);
    if (existsSync(to) && digest(from) !== digest(to)) throw Error(`Static asset collision: ${file}`);
  }
  for (const file of entries) {
    const from = join(source, file),
      to = join(target, file);
    if (!existsSync(to)) {
      mkdirSync(dirname(to), {
        recursive: true,
        mode: 0o755
      });
      copyFileSync(from, to);
    }
  }
  return entries.map(file => ({
    file,
    hash: digest(join(source, file))
  }));
}
// Cloudflare edge ranges from https://www.cloudflare.com/ips/ (checked 2026-10-28).
// Only these peers may supply CF-Connecting-IP; direct-to-origin clients keep their
// own TCP address, so X-Real-IP is the visitor either way.
export const CLOUDFLARE_EDGE_RANGES = Object.freeze([
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
  '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'
]);
export function route(port, assets) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid release port');
  safePath(assets);
  return `# Managed by GeoSub rolling-v1. Include inside this site's server block only.
${CLOUDFLARE_EDGE_RANGES.map(range => `set_real_ip_from ${range};`).join('\n')}
real_ip_header CF-Connecting-IP;
location ^~ /_next/static/ {
  alias ${assets}/;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
location ^~ / {
  proxy_pass http://127.0.0.1:${port};
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header REMOTE-HOST $remote_addr;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $http_connection;
  proxy_set_header X-Forwarded-Port $server_port;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_http_version 1.1;
  proxy_hide_header X-Geosub-Release;
  add_header X-Geosub-Release "${port}" always;
  proxy_buffering off;
  proxy_cache off;
}
`;
}
export function checkMigrationChanges(changes, approved) {
  for (const row of changes) {
    if (!(row.path.startsWith('geosub-backend/sql/') && !row.path.startsWith('geosub-backend/sql/isolated/') && row.path.endsWith('.sql')) && !row.path.startsWith('ai-price-site/prisma/migrations/')) continue;
    if (row.status !== 'A' || approved[row.path] !== row.hash) throw Error(`Unapproved or non-additive migration: ${row.path}`);
  }
}

/** Legacy boolean API; v2 callers must also enforce the per-target capability plan. */
export function contentRollbackCompatible(from, to, policy) {
  return contentContract.rollbackPlan(from, to, policy).mode === 'audited-compatible-readers';
}

/** Normalize both new templates and retained legacy units during rollback. */
export function taskUnitText(source, releaseRoot, controlRoot) {
  safePath(releaseRoot); safePath(controlRoot);
  return normalizeTaskLaunch(source).replaceAll('/opt/geosub/geosub-backend', `${releaseRoot}/geosub-backend`)
    .replaceAll('/opt/geosub/ai-price-site', `${releaseRoot}/ai-price-site`)
    .replace('[Service]', '[Service]\nEnvironment=GEOSUB_ENV_FILE=' + controlRoot + '/task.env');
}
export function normalizeTaskLaunch(source) {
  return source.replace(/^ExecStart=(\/\S+\.sh)(?=\s|$)/gm, 'ExecStart=/bin/bash $1')
    .replace(/ -- (\/\S+\.sh)(?=\s|$)/g, ' -- /bin/bash $1')
;
}
export function taskLaunch(text) {
  const commands = [...text.matchAll(/^ExecStart=(.+)$/gm)];
  if (commands.length !== 1) throw Error('Exactly one task ExecStart required');
  const args = commands[0][1].trim().split(/\s+/);
  const scripts = args.filter((arg, i) => {
    if (!arg.endsWith('.sh')) return false;
    safePath(arg);
    if (!['/bin/bash', 'bash'].includes(args[i-1])) throw Error('Task shell script must use explicit Bash');
    return true;
  });
  if (!scripts.length) throw Error('Task audit wrapper missing');
  return {user: text.match(/^User=(.+)$/m)?.[1] || 'root', executable: args[0], scripts};
}

// systemctl is-active exits nonzero for an executing Type=oneshot service.
// Only terminal states are safe; unknown states fail closed.
export const taskIsBusy = state => !['inactive', 'failed'].includes(state);
