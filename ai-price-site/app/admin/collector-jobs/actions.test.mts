import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { canAdmin } from '../../../lib/admin-permissions.ts';
import { formatActivationPreflightError } from '../../../lib/admin-product-scope-policy.ts';
import { AdminSaveConflict } from '../../../lib/admin-save.ts';

const nodeRequire = createRequire(import.meta.url);

function fixture({ role = 'OWNER', claudePrice = true, failAudit = false } = {}) {
  const queries: string[] = [];
  const txQueries: string[] = [];
  const audits: Array<Record<string, unknown>> = [];
  const started: string[] = [];
  const invalidated: string[] = [];
  const revalidated: string[] = [];
  let txCount = 0;

  const runRaw = async (parts: TemplateStringsArray, inTx: boolean) => {
    const sql = parts.join('?');
    queries.push(sql);
    if (inTx) txQueries.push(sql);
    return sql.includes('SELECT') && sql.includes('job.id::text') && claudePrice
      ? [{ id: 'fixture', product_slug: 'claude', preflight_message: null }]
      : [];
  };

  const prismaStub = {
    $queryRaw: (parts: TemplateStringsArray) => runRaw(parts, false),
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failAudit) throw new Error('audit insert failed');
        audits.push(data);
      },
    },
    $transaction: async <T,>(
      callback: (tx: {
        $queryRaw: (parts: TemplateStringsArray) => Promise<unknown>;
        auditLog: { create: (args: { data: Record<string, unknown> }) => Promise<void> };
      }) => Promise<T>,
    ) => {
      txCount += 1;
      return callback({
        $queryRaw: (parts: TemplateStringsArray) => runRaw(parts, true),
        auditLog: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            if (failAudit) throw new Error('audit insert failed');
            audits.push(data);
          },
        },
      });
    },
  };

  const adminCommandCode = ts.transpileModule(
    readFileSync(new URL('../../../lib/admin-command.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const adminCommandModule = { exports: {} as Record<string, unknown> };
  new Function('require', 'module', 'exports', adminCommandCode)(
    (name: string) => {
      if (name === 'server-only') return {};
      if (name === 'next/cache') return { revalidatePath: (p: string) => revalidated.push(p) };
      if (name === './admin-auth') {
        return {
          requireAdmin: async (capability: 'manage') => {
            if (!canAdmin(role, capability)) throw new Error('permission denied');
            return { id: '12345678-1234-4234-8234-123456789abc' };
          },
        };
      }
      if (name === './admin-read-model-cache') {
        return {
          invalidateAdminPricingReadModels: () => invalidated.push('pricing'),
          invalidateAdminCatalogReadModels: () => invalidated.push('catalog'),
          invalidateAdminSeoReadModels: () => invalidated.push('seo'),
          invalidateAdminSystemReadModels: () => invalidated.push('system'),
        };
      }
      if (name === './admin-save') return { AdminSaveConflict };
      if (name === './prisma') return { adminPrisma: prismaStub };
      return nodeRequire(name);
    },
    adminCommandModule,
    adminCommandModule.exports,
  );

  const actionsCode = ts.transpileModule(
    readFileSync(new URL('./actions.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const compiledModule = {
    exports: {} as { runCollectorJobNow: (data: FormData) => Promise<unknown> },
  };
  new Function('require', 'module', 'exports', actionsCode)(
    (name: string) => {
      if (name.endsWith('/admin-command')) return adminCommandModule.exports;
      if (name.endsWith('/admin-product-scope')) {
        return {
          activationPreflightConditionSql: () => 'PREFLIGHT_CONDITION',
          formatActivationPreflightError,
        };
      }
      if (name.endsWith('/prisma')) return { adminPrisma: prismaStub };
      if (name.endsWith('/collection-runner')) {
        return {
          startCollectorJobRunInBackground: async (id: string) => {
            started.push(id);
          },
        };
      }
      throw new Error('Unexpected import ' + name);
    },
    compiledModule,
    compiledModule.exports,
  );

  const form = new FormData();
  form.set('id', '12345678-1234-4234-8234-123456789abc');
  return {
    run: () => compiledModule.exports.runCollectorJobNow(form),
    queries,
    txQueries,
    audits,
    started,
    invalidated,
    revalidated,
    getTxCount: () => txCount,
  };
}

test('generic run entry cannot bypass the Claude price activation preflight', async () => {
  const f = fixture();
  const result = (await f.run()) as { ok: boolean; error: string };
  assert.equal(result.ok, false);
  assert.match(result.error, /检查启用条件/);
  assert.equal(f.queries.length, 1);
  assert.equal(f.getTxCount(), 0);
  assert.equal(f.started.length, 0);
  assert.ok(f.queries.every((sql) => !sql.includes('UPDATE') && !sql.includes('INSERT')));
});

test('generic run entry updates job and records audit log atomically before starting worker', async () => {
  const f = fixture({ claudePrice: false });
  await f.run();
  assert.equal(f.getTxCount(), 1);
  assert.ok(f.txQueries.some((sql) => sql.includes('UPDATE collector_jobs')));
  assert.equal(f.audits.length, 1);
  assert.equal(f.audits[0].action, 'run_now');
  assert.equal(f.audits[0].targetType, 'collector_job');
  assert.deepEqual(f.invalidated, ['pricing']);
  assert.equal(f.started.length, 1);
});

test('generic run entry does not spawn worker if transactional audit insert fails', async () => {
  const f = fixture({ claudePrice: false, failAudit: true });
  const result = (await f.run()) as { ok: boolean; error: string };
  assert.equal(result.ok, false);
  assert.equal(f.getTxCount(), 1);
  assert.equal(f.started.length, 0);
  assert.equal(f.invalidated.length, 0);
});

test('generic run entry checks management permission before any query', async () => {
  for (const role of ['VIEWER', 'EDITOR']) {
    const f = fixture({ role });
    await assert.rejects(f.run(), /permission denied/);
    assert.equal(f.queries.length, 0);
    assert.equal(f.started.length, 0);
  }
});
