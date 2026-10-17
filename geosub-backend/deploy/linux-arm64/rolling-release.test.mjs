import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retainAssets, route, checkMigrationChanges, safePath } from './rolling-release-lib.mjs';
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
