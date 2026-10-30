/* Disposable local schemas only; no history is rewritten during the migration. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Client } = require('pg');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sql = fs.readFileSync('../geosub-backend/sql/schema/059_audit_actor_compatibility.sql', 'utf8');
assert.equal(sql, fs.readFileSync('prisma/migrations/20261026090000_audit_actor_compatibility/migration.sql', 'utf8'));
const url = new URL(process.env.DATABASE_URL);
assert(['127.0.0.1', 'localhost'].includes(url.hostname) && /^\/geosub_release_\d{8}$/.test(url.pathname));
(async () => {
  const db = new Client({ connectionString: url.href }); await db.connect();
  try {
    for (const shape of ['legacy', 'account', 'mixed', 'wrong_type', 'orphan', 'wrong_fk']) {
      const schema = 'audit_qa_' + randomUUID().replaceAll('-', '');
      await db.query('BEGIN');
      try {
        await db.query(`CREATE SCHEMA ${schema}; CREATE TABLE ${schema}.admin_users(id uuid PRIMARY KEY)`);
        const actor = randomUUID();
        await db.query(`INSERT INTO ${schema}.admin_users VALUES ($1)`, [actor]);
        const columns = shape === 'legacy' ? 'actor text' : shape === 'account' ? 'actor_id uuid' : shape === 'wrong_type' ? 'actor text, actor_id text' : 'actor text, actor_id uuid';
        await db.query(`CREATE TABLE ${schema}.audit_logs(id uuid PRIMARY KEY, ${columns}, action text, old_value jsonb, new_value jsonb, note text, created_at timestamptz)`);
        if (shape === 'wrong_fk') await db.query(`ALTER TABLE ${schema}.audit_logs ADD FOREIGN KEY(actor_id) REFERENCES ${schema}.admin_users(id) ON DELETE CASCADE`);
        const before = { id: randomUUID(), action: 'historical', old_value: { status: 'review' }, new_value: { status: 'published' }, note: 'Keep exact history', created_at: '2025-01-02T03:04:05Z' };
        if (shape !== 'account') before.actor = 'Historical operator (unknown account)';
        if (shape !== 'legacy') before.actor_id = shape === 'orphan' ? randomUUID() : actor;
        const keys = Object.keys(before);
        await db.query(`INSERT INTO ${schema}.audit_logs (${keys.join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')})`, keys.map(k => before[k]));
        const snapshot = (await db.query(`SELECT to_jsonb(t) AS row FROM ${schema}.audit_logs t`)).rows;
        await db.query('SAVEPOINT migration');
        const migration = sql.replaceAll('public.', schema + '.');
        if (['wrong_type', 'orphan', 'wrong_fk'].includes(shape)) {
          await assert.rejects(db.query(migration));
          await db.query('ROLLBACK TO SAVEPOINT migration');
          assert.deepEqual((await db.query(`SELECT to_jsonb(t) AS row FROM ${schema}.audit_logs t`)).rows, snapshot);
        } else {
          await db.query(migration); await db.query(migration);
          const after = (await db.query(`SELECT to_jsonb(t) AS row FROM ${schema}.audit_logs t`)).rows;
          assert.equal(after.length, snapshot.length);
          for (const [key, value] of Object.entries(snapshot[0].row)) assert.deepEqual(after[0].row[key], value);
          if (shape === 'legacy') assert.equal(after[0].row.actor_id, null);
          if (shape === 'account') assert.equal(after[0].row.actor, null);
          // Both old SQL and new account-linked writers work after the bridge.
          await db.query(`INSERT INTO ${schema}.audit_logs(id,actor,action) VALUES ($1,'old SQL writer','legacy')`, [randomUUID()]);
          await db.query(`INSERT INTO ${schema}.audit_logs(id,actor_id,action) VALUES ($1,$2,'modern')`, [randomUUID(), actor]);
          await db.query('SAVEPOINT invalid_actor');
          await assert.rejects(db.query(`INSERT INTO ${schema}.audit_logs(id,actor_id) VALUES ($1,$2)`, [randomUUID(), randomUUID()]));
          await db.query('ROLLBACK TO SAVEPOINT invalid_actor');
          await db.query(`DELETE FROM ${schema}.admin_users WHERE id=$1`, [actor]);
          assert.equal(Number((await db.query(`SELECT count(*) AS count FROM ${schema}.audit_logs`)).rows[0].count), 3);
        }
        console.log('PASS audit compatibility: ' + shape);
      } finally { await db.query('ROLLBACK'); }
    }
  } finally { await db.end(); }
  const lockTest = spawnSync(process.execPath, [path.join(__dirname, 'test-audit-lock-timeout.cjs')], {
    env: process.env, stdio: 'inherit',
  });
  assert.equal(lockTest.status, 0, 'Standalone SQL runner lock timeout regression');
})().catch(error => { console.error(error); process.exitCode = 1; });
