import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const backend = path.resolve(import.meta.dirname, '..');
const database = process.env.GEOSUB_IDENTITY_TEST_DATABASE_URL;

test('automatic identity lifecycle against real PostgreSQL and existing auto-review', {skip: !database}, () => {
  const url = new URL(database);
  assert.ok(['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname));
  assert.match(url.pathname, /^\/geosub_identity_test(?:_\w+)?$/,
    'use a dedicated local identity test database');
  const schema = `identity_test_${process.pid}`;
  const psql = process.env.GEOSUB_TEST_PSQL || 'psql';
  const run = (sql, scoped = true) => {
    const out = spawnSync(psql, ['-Xq', '-v', 'ON_ERROR_STOP=1', '-d', database], {
      input: sql, encoding: 'utf8', timeout: 30_000,
      env: {...process.env, PGOPTIONS: scoped ? `-c search_path=${schema},public` : ''},
    });
    assert.equal(out.error, undefined);
    assert.equal(out.status, 0, `${out.stdout}\n${out.stderr}`);
    return out.stdout + out.stderr;
  };
  run(`CREATE SCHEMA ${schema};`, false);
  try {
    const files = fs.readdirSync(path.join(backend, 'sql/schema'));
    for (const prefix of ['001', '002', '006', '010', '026', '034', '048', '058']) {
      const file = files.find(name => name.startsWith(`${prefix}_`));
      run(fs.readFileSync(path.join(backend, 'sql/schema', file), 'utf8'));
    }
    const output = run(fs.readFileSync(path.join(backend, 'tests/automatic-identity-lifecycle.sql'), 'utf8'));
    assert.match(output, /PASS: real existing automatic reviewer restores clean price without human approval/);
    assert.match(output, /PASS: unrelated review ticket remains pending/);
    assert.match(output, /PASS: 13 scenarios/);
  } finally {
    run(`DROP SCHEMA ${schema} CASCADE;`, false);
  }
});
