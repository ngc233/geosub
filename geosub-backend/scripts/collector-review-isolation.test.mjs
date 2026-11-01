import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('review failures do not recollect or contaminate unrelated jobs', () => {
  const result = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-File',
    path.resolve(import.meta.dirname, '../tests/collector-review-isolation.ps1')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
