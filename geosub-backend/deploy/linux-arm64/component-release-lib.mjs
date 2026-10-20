import { createHash } from 'node:crypto';
import { safePath, taskUnitText } from './rolling-release-lib.mjs';

// Include executable migration inputs, not just newly added SQL filenames.
export function isDatabaseInput(file) {
  return (file.startsWith('geosub-backend/sql/') && !file.startsWith('geosub-backend/sql/isolated/')) ||
    file.startsWith('ai-price-site/prisma/') ||
    ['geosub-backend/scripts/migration-manifest.cjs', 'geosub-backend/scripts/migration-manifest.json',
      'ai-price-site/scripts/prepare-prisma-baseline.cjs', 'geosub-backend/deploy/linux-arm64/db-apply-sql.sh'].includes(file);
}
export function migrationPlan(changes) {
  const files = changes.map(row => typeof row === 'string' ? row : row.path).filter(isDatabaseInput);
  return { required: files.length > 0, files, reason: files.length ? 'database-inputs-changed' : 'database-inputs-unchanged' };
}
export async function executeMigrationPlan(plan, actions) {
  if (!plan.required) { actions.skipped(plan.reason); return; }
  await actions.pause();
  await actions.backup();
  await actions.migrate();
}
export function webRuntime(release) {
  safePath(release.app);
  if (!Number.isInteger(release.port) || release.port < 1024 || release.port > 65535 || release.dist !== '.next') throw Error('Invalid web runtime');
  return { app: release.app, dist: release.dist, healthUrl: `http://127.0.0.1:${release.port}/api/health` };
}
export function webRuntimeEnv(release) {
  const r = webRuntime(release);
  return `export GEOSUB_FRONTEND_DIR='${r.app}'\nexport GEOSUB_NEXT_DIST_DIR='${r.dist}'\nexport GEOSUB_WEB_HEALTH_URL='${r.healthUrl}'\n`;
}
export function collectorEnvironment(root, envFile) {
  safePath(root); safePath(envFile);
  return `source '${envFile}'\nsource '${root}/web-runtime.env'\nexport GEOSUB_BACKEND_DIR='${root}/collector-live/geosub-backend'\nexport GEOSUB_COLLECTOR_LOCK_DIR='/run/geosub'\nexport GEOSUB_COLLECTOR_LOCK_FILE='/run/geosub/collector-jobs.lock'\nexport GEOSUB_WEB_RUNTIME_FILE='${root}/web-runtime.json'\nexport GEOSUB_COLLECTOR_ENV_FILE='${root}/collector.env'\nexport GEOSUB_ENV_FILE='${root}/collector.env'\n`;
}
export function collectorUnit(source, root) {
  if (!source.includes('RuntimeDirectoryPreserve=')) source = source.replace('RuntimeDirectoryMode=0700', 'RuntimeDirectoryMode=0700\nRuntimeDirectoryPreserve=yes');
  return taskUnitText(source, `${root}/collector-live`, root).replace(`GEOSUB_ENV_FILE=${root}/task.env`, `GEOSUB_ENV_FILE=${root}/collector.env`);
}
export function ownedTaskTimers(all, independentCollector) {
  return independentCollector ? all.filter(x => x !== 'geosub-collector-jobs.timer') : all;
}
export function sourceHash(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

// Only these collector-scoped actions are available to the transaction. There
// is deliberately no web restart, proxy reload, migration or global timer API.
export async function switchCollector(io, target, previous) {
  const snapshot = await io.snapshot();
  let unlock, changed = false;
  try {
    await io.pause();
    await io.drain();
    unlock = await io.acquire();
    changed = true;
    await io.activate(target);
    await io.verify(target);
    await io.record({ active: target, previous });
    await io.resume(snapshot);
  } catch (error) {
    try {
      if (changed) await io.restore(snapshot);
      await io.resume(snapshot);
    } catch { throw Error(`${error.message}; collector recovery incomplete`); }
    throw error;
  } finally { if (unlock) await unlock(); }
}
