import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateRuntimeScriptManifest } from './check-runtime-script-manifest.mjs';

const productionBackendDir = path.resolve(import.meta.dirname, '..');

async function makeFixture(manifest) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'geosub-runtime-manifest-'));
  await mkdir(path.join(rootDir, 'scripts'), { recursive: true });
  await mkdir(path.join(rootDir, 'deploy/linux-arm64'), { recursive: true });
  await writeFile(path.join(rootDir, 'scripts/example.ps1'), 'Write-Host "legacy"\n');
  await writeFile(
    path.join(rootDir, 'deploy/linux-arm64/run-example.sh'),
    'pwsh -File "$BACKEND_DIR/scripts/example.ps1"\n',
  );
  const manifestPath = path.join(rootDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest));
  return { rootDir, manifestPath };
}

function validManifest() {
  return {
    version: 1,
    scripts: [
      {
        path: 'scripts/example.ps1',
        kind: 'data-sync',
        migrationPhase: 1,
        replacement: 'scripts/example.mjs',
        databaseEffect: 'writes-data',
        networkEffect: 'provider',
        dryRun: true,
      },
    ],
    productionEntrypoints: [
      {
        task: 'example',
        wrapper: 'deploy/linux-arm64/run-example.sh',
        legacyScript: 'scripts/example.ps1',
        replacement: 'scripts/example.mjs',
        status: 'legacy-active',
      },
    ],
  };
}

test('accepts a fully classified legacy production entrypoint', async () => {
  const fixture = await makeFixture(validManifest());
  const result = await validateRuntimeScriptManifest(fixture);
  assert.deepEqual(result.errors, []);
});

test('rejects an unclassified PowerShell script', async () => {
  const manifest = validManifest();
  manifest.scripts = [];
  const fixture = await makeFixture(manifest);
  const result = await validateRuntimeScriptManifest(fixture);
  assert.match(result.errors.join('\n'), /not classified/);
});

test('requires shadow replacements to exist before cutover', async () => {
  const manifest = validManifest();
  manifest.productionEntrypoints[0].status = 'shadow-ready';
  const fixture = await makeFixture(manifest);
  const result = await validateRuntimeScriptManifest(fixture);
  assert.match(result.errors.join('\n'), /Shadow-ready replacement does not exist/);
});

test('exchange-rate wrapper keeps a gated and reversible Node cutover path', async () => {
  const wrapper = await import('node:fs/promises').then(({ readFile }) =>
    readFile(
      path.join(productionBackendDir, 'deploy/linux-arm64/run-exchange-rate-sync.sh'),
      'utf8',
    ),
  );

  assert.match(wrapper, /GEOSUB_EXCHANGE_RATE_RUNTIME:-legacy/);
  assert.match(wrapper, /check-exchange-rate-shadow-evidence\.mjs.*--required-cycles 3/);
  assert.match(wrapper, /sync-exchange-rates\.mjs/);
  assert.match(wrapper, /RUNTIME_MODE.*legacy/);
  assert.match(wrapper, /RUNTIME_MODE.*node/);
});
