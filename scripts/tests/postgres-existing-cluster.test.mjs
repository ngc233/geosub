import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('../../geosub-backend/deploy/linux-arm64/postgres-existing-cluster-entrypoint.sh', import.meta.url));
const cases = {
  'existing cluster': () => {},
  'missing directory': (f) => { f.env.PGDATA = join(f.root, 'missing'); },
  'empty directory': (f) => { f.env.PGDATA = join(f.root, 'empty'); mkdirSync(f.env.PGDATA); },
  'missing control': (f) => rmSync(join(f.data, 'global/pg_control')),
  'missing base': (f) => rmSync(join(f.data, 'base'), { recursive: true }),
  'wrong major version': (f) => writeFileSync(join(f.data, 'PG_VERSION'), '17\n'),
  'missing identity': (f) => rmSync(f.identity),
  'invalid identity': (f) => writeFileSync(f.identity, '123\n456\n'),
  'wrong cluster': (f) => { f.env.CONTROL_ID = '987654321'; },
  'unreadable control': (f) => { f.env.CONTROL_FAIL = '1'; },
};
for (const [name, mutate] of Object.entries(cases)) {
  test(name, () => {
    const root = mkdtempSync(join(tmpdir(), 'geosub-pg-guard-'));
    try {
      const data = join(root, 'data');
      const identity = join(root, 'identity');
      mkdirSync(join(data, 'global'), { recursive: true });
      mkdirSync(join(data, 'base'));
      writeFileSync(join(data, 'PG_VERSION'), '16\n');
      writeFileSync(join(data, 'global/pg_control'), 'fixture');
      writeFileSync(identity, '123456789\n');
      writeFileSync(join(root, 'pg_controldata'), '#!/bin/sh\n[ "${CONTROL_FAIL:-0}" = 0 ] || exit 1\nprintf "Database system identifier: %s\\n" "${CONTROL_ID:-123456789}"\n', { mode: 0o700 });
      const env = { ...process.env, PGDATA: data, GEOSUB_PG_SYSTEM_ID_FILE: identity, PATH: `${root}:/usr/bin:/bin` };
      mutate({ root, data, identity, env });
      const before = readdirSync(root, { recursive: true }).sort();
      const result = spawnSync('sh', [script, '--check-only'], { env, encoding: 'utf8' });
      assert.equal(result.status, name === 'existing cluster' ? 0 : 78, result.stderr);
      assert.deepEqual(readdirSync(root, { recursive: true }).sort(), before);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}
