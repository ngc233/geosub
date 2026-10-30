/* Real canonical-migrated local DB; Next cache/HTTP mocked, all rows rolled back. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const url = new URL(process.env.DATABASE_URL);
assert(['127.0.0.1', 'localhost'].includes(url.hostname) && /^\/geosub_release_\d{8}$/.test(url.pathname));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }) });
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', source)(name => name in mocks ? mocks[name] : require(name), module.exports, module);
  return module.exports;
}
(async () => {
  const tokens = load('lib/content-fact-tokens.ts');
  const registry = load('lib/content-target-registry.ts');
  const core = load('lib/managed-content.ts', { './content-target-registry.ts': registry, './content-fact-tokens.ts':tokens });
  const proof = load('lib/content-readback.ts', {'./managed-content.ts':core});
  const sentinel = new Error('roll back local evidence');
  try {
    await db.$transaction(async tx => {
      const cachedScopes = [];
      const store = load('lib/managed-content-store.ts', {
        'server-only': {}, react: { cache: f => f },
        'next/cache': { unstable_cache: (f, key, options) => { cachedScopes.push({ key, tags: options.tags }); return f; } },
        './content-readback':proof, './content-fact-tokens':tokens,
        './prisma': { prisma: { ...tx, $transaction: f => f(tx) } }, './managed-content': core,
      });
      const actor = await tx.adminUser.create({ data: { email: 'target-store-test@invalid.example', passwordHash: 'unusable', status: 'ACTIVE' } });
      const legacyBefore = await store.readContentState();
      const legacyHistoryRows = await tx.siteSetting.findMany({ where: { groupName: "content-pilot-revision" } });
      const zh = store.contentStore('overview:zh:claude'), en = store.contentStore('overview:en:claude');
      const zhDraft = core.initialContentDraft('overview:zh:claude'), enDraft = core.initialContentDraft('overview:en:claude');
      const z = await zh.mutateContent(0, actor.id, { type: 'draft', content: zhDraft });
      assert.equal((await en.readContentState()).generation, 0);
      assert.equal((await zh.serving()).content, null, 'Draft not public');
      await en.mutateContent(0, actor.id, { type: 'draft', content: enDraft });
      const released = await zh.mutateContent(z.generation, actor.id, { type: 'publish', reason: 'Chinese canary' });
      const english = await en.mutateContent(1, actor.id, { type: 'publish', reason: 'English canary' });
      assert.equal(released.version, english.version, 'Equal local version numbers are isolated by target');
      assert.deepEqual((await zh.readRevision(1)).content, zhDraft);
      assert.deepEqual((await en.readRevision(1)).content, enDraft);
      assert.deepEqual((await zh.readContentHistory()).map(r => r.targetId), ['overview:zh:claude']);
      await assert.rejects(en.claimContentDistribution(1, released.attemptId), /版本已更新/);
      const lease = await zh.claimContentDistribution(1, released.attemptId);
      await assert.rejects(zh.claimContentDistribution(1, released.attemptId), /已领取/);
      // Closing one page's admission never closes the other locale, and revokes its old lease.
      await zh.setContentAdmission(0, actor.id, 'closed');
      assert.equal(await zh.finishContentDistribution(lease.id, lease.owner, true), false);
      await assert.rejects(zh.mutateContent(2, actor.id, { type: 'rollback', version: 0, reason: 'closed' }), /暂停/);
      const enLease = await en.claimContentDistribution(1, english.attemptId);
      assert.equal(await en.finishContentDistribution(enLease.id, enLease.owner, true), true);
      await zh.setContentAdmission(1, actor.id, 'open');
      const clock = Date.now;
      let retry;
      Date.now = () => clock() + 6000;
      try { retry = await zh.retryContentDistribution(2, actor.id); } finally { Date.now = clock; }
      const retried = await zh.claimContentDistribution(1, retry.attemptId);
      assert.equal(await zh.finishContentDistribution(retried.id, retried.owner, true), true);
      assert.equal((await zh.readDistributionAttempt(lease.id)).status, 'superseded');
      const rollback = await zh.mutateContent(2, actor.id, { type: 'rollback', version: 0, reason: 'Restore code default' });
      assert.equal(rollback.version, 2);
      assert.equal((await zh.readRevision(2)).content, null);
      assert.deepEqual((await zh.readRevision(1)).content, zhDraft);
      assert.deepEqual((await en.serving()).content, enDraft);
      assert.deepEqual(await store.readContentState(), legacyBefore);
      assert.deepEqual(await tx.siteSetting.findMany({ where: { groupName: "content-pilot-revision" } }), legacyHistoryRows, "N-1 group-based history must never include new targets");
      const wrong = await en.readRevision(1);
      await tx.siteSetting.update({ where: { settingKey: registry.getRegisteredContentTarget('overview:zh:claude').storagePrefix + 'revision:1' }, data: { valueJson: wrong } });
      await assert.rejects(zh.readRevision(1), /目标不匹配/);
      assert.equal(new Set(cachedScopes.map(s => s.key[0])).size, 3);
      assert.equal(new Set(cachedScopes.flatMap(s => s.tags)).size, 3);
      const audit = await tx.auditLog.findMany({ where: { actorId: actor.id } });
      assert.ok(audit.some(r => r.targetType === 'overview:zh:claude') && audit.some(r => r.targetType === 'overview:en:claude'));
      const distribution = load('lib/content-distribution.ts', { 'server-only': {}, './managed-content': core, './managed-content-store': store, './content-fact-tokens':tokens, './content-readback': {} });
      const invalidations = [];
      let role = 'EDITOR';
      const permissions = load('lib/admin-permissions.ts');
      const actions = load('app/admin/content/actions.ts', {
        'next/cache': { updateTag: tag => invalidations.push(tag), revalidatePath: p => invalidations.push(p) },
        '../../../lib/admin-auth': { requireAdmin: async capability => { permissions.assertAdminCapability(role, capability); return { id: actor.id }; } },
        '../../../lib/managed-content': core, '../../../lib/managed-content-store': store, '../../../lib/content-distribution': distribution,
      });
      const form = new FormData();
      form.set('targetId', 'overview:en:claude'); form.set('generation', '2'); form.set('operation', 'publish'); form.set('reason', 'action canary'); form.set('reviewed', 'on');
      await assert.rejects(actions.contentAction({}, form), /权限/);
      role = 'OWNER';
      const result = await actions.contentAction({}, form);
      assert.equal(result.ok, true);
      assert.equal((await en.readContentState()).receipt, 'origin_invalidated');
      assert.ok(invalidations.includes('/en/ai-pricing/claude') && invalidations.includes('managed-content:v2:overview:en:claude'));
      assert.ok(!invalidations.includes('/zh/ai-pricing/claude') && !invalidations.includes('/en/ai-pricing/chatgpt'));
      form.set('targetId', '/evil');
      assert.equal((await actions.contentAction({}, form)).ok, false);
      console.log('PASS: target/language/pilot isolation, draft/public, immutable rollback, fences, stale/foreign leases, target hash binding, audit, roles and exact invalidation');
      throw sentinel;
    }, { timeout: 30000 });
  } catch (error) { if (error !== sentinel) throw error; }
})().finally(() => db.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
