/* Local DB integration: rolled-back transaction plus a disposable isolated schema. */
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const req = createRequire(path.join(process.cwd(), 'package.json'));
const ts = req('typescript');
const { PrismaClient } = req('@prisma/client');
const { PrismaPg } = req('@prisma/adapter-pg');
const url = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(url.hostname));
assert(/^\/geosub_release_\d{8}$/.test(url.pathname));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
function load(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require','exports','module', source)((name) => name in mocks ? mocks[name] : req(name), module.exports, module);
  return module.exports;
}
(async () => {
  const tokens = load(path.resolve('lib/content-fact-tokens.ts'), {});
  const registry = load(path.resolve('lib/content-target-registry.ts'), {});
  const core = load(path.resolve('lib/managed-content.ts'), { './content-target-registry.ts': registry, './content-fact-tokens.ts':tokens });
  const readbackModule = load(path.resolve('lib/content-readback.ts'), {'./managed-content.ts':core});
  const sentinel = new Error('intentional integration rollback');
  let completed = false;
  try {
    await db.$transaction(async (tx) => {
      const store = load(path.resolve('lib/managed-content-store.ts'), { 'server-only': {}, react: { cache: (f) => f }, 'next/cache': { unstable_cache: (f) => f }, './prisma': { prisma: { ...tx, $transaction: (f) => f(tx) } }, './managed-content': core, './content-readback':readbackModule, './content-fact-tokens':tokens });
      const actor = await tx.adminUser.create({ data: { email: 'content-test@invalid.example', passwordHash: 'unusable-test-hash', status: 'ACTIVE' } });
      const before = await store.readContentState();
      const draft = await store.mutateContent(before.generation, actor.id, { type: 'draft', content: core.pilotDraft });
      assert.equal(draft.version, before.version, 'Saving draft must not publish');
      await assert.rejects(store.mutateContent(before.generation, actor.id, { type: 'publish', reason: 'stale' }), /其他操作/);
      const released = await store.mutateContent(draft.generation, actor.id, { type: 'publish', reason: 'local transaction test' });
      assert.equal(released.version, before.version + 1);
      assert.equal(released.receipt, 'pending');
      const revision = await store.readRevision(released.version);
      assert.deepEqual(revision.content, core.pilotDraft);
      const lease = await store.claimContentDistribution(released.version, released.attemptId);
      await store.finishContentDistribution(lease.id, lease.owner, true);
      assert.equal((await store.readContentState()).receipt, 'origin_invalidated');
      const rolled = await store.mutateContent(released.generation, actor.id, { type: 'rollback', version: 0, reason: 'baseline rollback test' });
      assert.equal(rolled.version, released.version + 1);
      assert.equal((await store.readRevision(rolled.version)).content, null);
      assert.deepEqual((await store.readRevision(released.version)).content, core.pilotDraft, 'History immutable');
      assert.equal(await store.finishContentDistribution(lease.id, lease.owner, true), false);
      assert.equal((await store.readContentState()).receipt, 'pending', 'Old receipt cannot overwrite new release');
      completed = true;
      throw sentinel;
    }, { timeout: 20000 });
  } catch (error) { if (error !== sentinel) throw error; }
  assert(completed);
  console.log('PASS: draft isolation, stale publish, immutable revisions, rollback, superseded receipt; DB transaction rolled back.');
  // Two real concurrent transactions use isolated copies of the three touched tables.
  const schema = 'content_qa_' + Date.now();
  const isolated = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema }) });
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    for (const table of ['site_settings', 'admin_users', 'audit_logs']) {
      await db.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
    }
    const store = load(path.resolve('lib/managed-content-store.ts'), { 'server-only': {}, react: { cache: (f) => f }, 'next/cache': { unstable_cache: (f) => f }, './prisma': { prisma: isolated }, './managed-content': core, './content-readback':readbackModule, './content-fact-tokens':tokens });
    const [actor] = await isolated.$queryRawUnsafe(`INSERT INTO "${schema}".admin_users (id, email, password_hash, status, updated_at) VALUES ($1::uuid, 'isolated-content-test@invalid.example', 'unusable-test-hash', 'disabled'::public.admin_status, now()) RETURNING id`, require('node:crypto').randomUUID());
    const drafts = await Promise.allSettled([
      store.mutateContent(0, actor.id, { type: 'draft', content: { ...core.pilotDraft, title: 'First contender' } }),
      store.mutateContent(0, actor.id, { type: 'draft', content: { ...core.pilotDraft, title: 'Second contender' } }),
    ]);
    assert.equal(drafts.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(drafts.filter((r) => r.status === 'rejected').length, 1);
    const saved = await store.readContentState();
    assert.equal(saved.generation, 1);
    assert.equal(saved.version, 0);
    const publications = await Promise.allSettled([
      store.mutateContent(1, actor.id, { type: 'publish', reason: 'First publish contender' }),
      store.mutateContent(1, actor.id, { type: 'publish', reason: 'Second publish contender' }),
    ]);
    assert.equal(publications.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(publications.filter((r) => r.status === 'rejected').length, 1);
    const result = await store.readContentState();
    assert.equal(result.generation, 2);
    assert.equal(result.version, 1);
    assert.equal((await store.readContentHistory()).length, 1);
    assert.deepEqual((await store.readRevision(1)).content, saved.draft);
    console.log('PASS: concurrent drafts and publishes each have exactly one winner; no lost update or duplicate revision.');
    const claims = await Promise.allSettled([
      store.claimContentDistribution(result.version, result.attemptId),
      store.claimContentDistribution(result.version, result.attemptId),
    ]);
    assert.equal(claims.filter((r) => r.status === 'fulfilled').length, 1);
    const lease = claims.find((r) => r.status === 'fulfilled').value;
    assert.equal(await store.finishContentDistribution(lease.id, 'wrong-owner', true), false);
    await assert.rejects(store.retryContentDistribution(result.generation, actor.id), /处理中/);
    const attemptKey = 'content-pilot:en:chatgpt:attempt:';
    const expire = async (attempt) => isolated.siteSetting.update({ where: { settingKey: attemptKey + attempt.id }, data: { valueJson: { ...attempt, leaseUntil: Date.now() - 1 } } });
    await expire(lease);
    const retry = await store.retryContentDistribution(result.generation, actor.id);
    assert.equal(retry.version, result.version);
    assert.notEqual(retry.attemptId, lease.id);
    const failed = await store.readDistributionAttempt(lease.id);
    assert.equal(failed.status, 'failed');
    assert.equal(failed.failure, 'lease_expired');
    assert.equal(await store.finishContentDistribution(lease.id, lease.owner, true), false);
    assert.deepEqual(await store.readDistributionAttempt(lease.id), failed, 'Terminal records are immutable');
    const second = await store.claimContentDistribution(retry.version, retry.attemptId);
    assert.equal(second.number, 2);
    assert.equal(second.previousAttemptId, lease.id);
    await store.finishContentDistribution(second.id, second.owner, false);
    await assert.rejects(store.retryContentDistribution(result.generation, actor.id), /五秒/);
    const secondFailed = await store.readDistributionAttempt(second.id);
    await isolated.siteSetting.update({ where: { settingKey: attemptKey + second.id }, data: { valueJson: { ...secondFailed, finishedAt: Date.now() - 6000 } } });
    const thirdState = await store.retryContentDistribution(result.generation, actor.id);
    const third = await store.claimContentDistribution(result.version, thirdState.attemptId);
    await expire(third);
    assert.equal(await store.finishContentDistribution(third.id, third.owner, true), false, 'Expired owner cannot declare success');
    await assert.rejects(store.retryContentDistribution(result.generation, actor.id), /三次/);
    const next = await store.mutateContent(result.generation, actor.id, { type: 'rollback', version: 0, reason: 'Verify superseded attempt' });
    const old = await store.claimContentDistribution(next.version, next.attemptId);
    const newest = await store.mutateContent(next.generation, actor.id, { type: 'publish', reason: 'New revision supersedes old attempt' });
    assert.equal((await store.readDistributionAttempt(old.id)).status, 'superseded');
    assert.equal(await store.finishContentDistribution(old.id, old.owner, true), false);
    assert.equal((await store.readContentState()).receipt, 'pending');
    const final = await store.claimContentDistribution(newest.version, newest.attemptId);
    assert.equal(await store.finishContentDistribution(final.id, final.owner, true), true);
    assert.equal((await store.readContentState()).receipt, 'origin_invalidated');
    // Tampering must fail reads and rollback, without moving the serving pointer.
    const original = await store.readRevision(1);
    await isolated.siteSetting.update({ where: { settingKey: 'content-pilot:en:chatgpt:revision:1' }, data: { valueJson: { ...original, content: { ...original.content, title: 'Tampered' } } } });
    await assert.rejects(store.readRevision(1), /校验失败/);
    await assert.rejects(store.mutateContent(newest.generation, actor.id, { type: 'rollback', version: 1, reason: 'Reject corruption' }), /校验失败/);
    assert.equal((await store.readContentState()).version, newest.version);
    const pending = await store.mutateContent(newest.generation, actor.id, { type: 'rollback', version: 0, reason: 'Crash before claim' });
    const abandoned = await store.readDistributionAttempt(pending.attemptId);
    await isolated.siteSetting.update({ where: { settingKey: attemptKey + abandoned.id }, data: { valueJson: { ...abandoned, createdAt: Date.now() - 61000 } } });
    const recovered = await store.retryContentDistribution(pending.generation, actor.id);
    assert.notEqual(recovered.attemptId, abandoned.id);
    assert.equal((await store.readDistributionAttempt(abandoned.id)).failure, 'lease_expired');
    // A pre-journal pending receipt can be upgraded without inventing a content revision.
    const { attemptId: omitted, ...legacy } = recovered;
    await isolated.siteSetting.update({ where: { settingKey: 'content-pilot:en:chatgpt:state' }, data: { valueJson: legacy } });
    const upgraded = await store.retryContentDistribution(legacy.generation, actor.id);
    assert.equal(upgraded.version, legacy.version);
    assert.equal((await store.readDistributionAttempt(upgraded.attemptId)).number, 1);
    let failCache = true;
    const invalidations = [];
    const distribution = load(path.resolve('lib/content-distribution.ts'), { 'server-only': {}, './managed-content': core, './managed-content-store': store, './content-fact-tokens':tokens, './content-readback': {} });
    const actions = load(path.resolve('app/admin/content/actions.ts'), {
      '../../../lib/admin-auth': { requireAdmin: async () => ({ id: actor.id }) },
      '../../../lib/managed-content': core,
      '../../../lib/managed-content-store': store, '../../../lib/content-distribution': distribution,
      'next/cache': {
        updateTag: (tag) => { if (failCache) throw new Error('simulated cache outage'); invalidations.push(tag); },
        revalidatePath: (route) => invalidations.push(route),
      },
    });
    const form = new FormData();
    form.set('operation', 'publish'); form.set('generation', String(upgraded.generation));
    form.set('reviewed', 'on'); form.set('reason', 'Action recovery integration');
    const actionFailed = await actions.contentAction({ ok: false, message: '' }, form);
    assert.equal(actionFailed.ok, false);
    assert.match(actionFailed.message, /缓存失效失败/);
    const actionState = await store.readContentState();
    const actionAttempt = await store.readDistributionAttempt(actionState.attemptId);
    assert.equal(actionAttempt.status, 'failed');
    await isolated.siteSetting.update({ where: { settingKey: attemptKey + actionAttempt.id }, data: { valueJson: { ...actionAttempt, finishedAt: Date.now() - 6000 } } });
    failCache = false;
    form.set('operation', 'retry'); form.set('generation', String(actionState.generation));
    assert.equal((await actions.contentAction({ ok: false, message: '' }, form)).ok, true);
    assert(invalidations.includes(core.CONTENT_TAG));
    assert(invalidations.includes(core.CONTENT_PATH));
    assert.equal((await store.readContentState()).version, actionState.version);
    assert.equal((await store.readContentState()).receipt, 'origin_invalidated');
    console.log('PASS: exclusive lease, crash recovery, bounded retries, backoff, terminal immutability, supersession, hash integrity.');
    console.log('PASS: server action persists cache failure and retries the same revision successfully (Next cache mocked).');
    const beforeFence = await store.readContentState();
    const inFlight = await store.mutateContent(beforeFence.generation, actor.id, { type: 'publish', reason: 'Fence test' });
    const claimed = await store.claimContentDistribution(inFlight.version, inFlight.attemptId);
    const epochBeforeClose = (await isolated.siteSetting.findUnique({ where: { settingKey: 'content-pilot:en:chatgpt:fence' } })).valueJson.epoch;
    const closed = await store.setContentAdmission(0, actor.id, 'closed');
    assert.equal(closed.generation, 1);
    assert.equal(closed.epoch, epochBeforeClose + 1);
    assert.equal(await store.finishContentDistribution(claimed.id, claimed.owner, true), false);
    await assert.rejects(store.mutateContent(inFlight.generation, actor.id, { type: 'publish', reason: 'Blocked' }), /暂停/);
    await assert.rejects(store.retryContentDistribution(inFlight.generation, actor.id), /暂停/);
    const savedWhilePaused = await store.mutateContent(inFlight.generation, actor.id, { type: 'draft', content: core.pilotDraft });
    assert.equal(savedWhilePaused.version, inFlight.version, 'Pausing admission keeps serving revision');
    await assert.rejects(store.setContentAdmission(0, actor.id, 'open'), /其他操作/);
    const reopened = await store.setContentAdmission(1, actor.id, 'open');
    assert.equal(reopened.generation, 2);
    const superseded = await store.readDistributionAttempt(claimed.id);
    await isolated.siteSetting.update({ where: { settingKey: attemptKey + superseded.id }, data: { valueJson: { ...superseded, finishedAt: Date.now() - 6000 } } });
    const resumed = await store.retryContentDistribution(savedWhilePaused.generation, actor.id);
    const resumedLease = await store.claimContentDistribution(resumed.version, resumed.attemptId);
    assert.equal(resumedLease.fenceGeneration, 2);
    assert.equal(await store.finishContentDistribution(resumedLease.id, resumedLease.owner, true), true);
    console.log('PASS: persistent admission fence blocks publish/retry, preserves drafts/serving revision, invalidates old owners and rejects stale mode transitions.');
    const priorEpoch = (await isolated.siteSetting.findUnique({ where: { settingKey: 'content-pilot:en:chatgpt:fence' } })).valueJson.epoch;
    const proofState = await store.mutateContent((await store.readContentState()).generation, actor.id, {type:'publish',reason:'durable evidence test'});
    const epoch = (await isolated.siteSetting.findUnique({ where: { settingKey: 'content-pilot:en:chatgpt:fence' } })).valueJson.epoch;
    assert.equal(epoch, priorEpoch + 1, 'Publication invalidates shared cache epoch');
    const proofLease = await store.claimContentDistribution(proofState.version, proofState.attemptId);
    const identity = await store.assertContentDistributionCurrent(proofLease.id, proofLease.owner);
    await assert.rejects(store.assertContentDistributionCurrent(proofLease.id, 'wrong-owner'));
    const hashes = Object.fromEntries(['title','h1','description','og:description','twitter:description','canonical','version','modeGeneration'].map(k=>[k,'a'.repeat(64)]));
    const endpoint = {checkedAt:new Date().toISOString(),htmlHash:'b'.repeat(64),outputHashes:hashes,version:String(identity.version),modeGeneration:String(identity.modeGeneration),cacheStatus:null};
    const proof={status:'verified',stage:'complete',origin:endpoint,public:endpoint,purge:{acceptedAt:new Date().toISOString(),url:'https://geosub.org/en/ai-pricing/chatgpt'}};
    assert.equal(await store.recordContentDistribution(proofLease.id,'wrong-owner',proof),false);
    assert.equal(await store.recordContentDistribution(proofLease.id,proofLease.owner,proof),true);
    assert.equal((await store.readContentState()).receipt,'verified');
    assert.deepEqual((await store.readDistributionAttempt(proofLease.id)).evidence,proof);
    assert.equal(await store.recordContentDistribution(proofLease.id,proofLease.owner,{status:'failed',stage:'public'}),false,'Terminal evidence cannot be overwritten');
    const badState=await store.mutateContent(proofState.generation,actor.id,{type:'publish',reason:'mismatched evidence'});
    const badLease=await store.claimContentDistribution(badState.version,badState.attemptId);
    assert.equal(await store.recordContentDistribution(badLease.id,badLease.owner,proof),false,'Old revision proof cannot certify new revision');
    assert.equal((await store.readContentState()).receipt,'pending');
    assert.equal((await store.readDistributionAttempt(badLease.id)).status,'failed');
    console.log('PASS: persistent dual-end evidence, exact lease identity, stale proof rejection and per-publication cache epoch. Mock endpoint evidence does not certify production.');
    const readback = load(path.resolve('lib/content-readback.ts'), {'./managed-content.ts':core});
    const wired = load(path.resolve('lib/content-distribution.ts'), {'server-only':{},'./managed-content':core,'./managed-content-store':store,'./content-fact-tokens':tokens,'./content-readback':readback});
    assert.equal(wired.contentDistributionConfig({DATABASE_URL:process.env.DATABASE_URL}),null);
    assert.throws(()=>wired.contentDistributionConfig({DATABASE_URL:process.env.DATABASE_URL,GEOSUB_CONTENT_DISTRIBUTION:'cloudflare'}),/本地数据库/);
    assert.throws(()=>wired.contentDistributionConfig({DATABASE_URL:'postgresql://localhost/geosub_app',GEOSUB_CONTENT_DISTRIBUTION:'cloudflare'}),/未就绪/);
    const config={originPort:3000,zoneId:'a'.repeat(32),token:'test-only',cachePolicy:'audited-single-url'};
    const originalFetch=global.fetch;
    try {
      for (const failPublic of [false,true]) {
        const next=await store.mutateContent((await store.readContentState()).generation,actor.id,{type:'publish',reason:'wired distribution test'});
        const lease=await store.claimContentDistribution(next.version,next.attemptId);
        const identity=await store.assertContentDistributionCurrent(lease.id,lease.owner);
        const content=(await store.readRevision(next.version)).content;
        const escape=(value)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
        const html=`<title>${escape(content.title)} - GeoSub</title><meta name="description" content="${escape(content.description)}"><meta property="og:description" content="${escape(content.description)}"><meta name="twitter:description" content="${escape(content.description)}"><link rel="canonical" href="https://geosub.org/en/ai-pricing/chatgpt"><main data-content-version="${next.version}" data-content-mode-generation="${identity.modeGeneration}"><h1>${escape(content.heading)}</h1>${content.sections.map(x=>`<section data-managed-editorial="true"><h2>${escape(x.heading)}</h2><p>${escape(x.body)}</p></section>`).join('')}${content.sources.map(x=>`<a data-managed-source="true" href="${escape(x)}">Source</a>`).join('')}${content.faqs.map(x=>`<summary data-managed-faq-question="true">${escape(x.q)}</summary><p data-managed-faq-answer="true">${escape(x.a)}</p>`).join('')}</main><script type="application/ld+json">${JSON.stringify({'@type':'FAQPage',mainEntity:content.faqs.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))})}</script>`;
        readback.verifyContentHtml(html,{title:content.title+" - GeoSub",heading:content.heading,description:content.description,content,version:String(next.version),modeGeneration:String(identity.modeGeneration)});
        const calls=[];
        global.fetch=async(url,init)=>{
          calls.push(String(url));
          if(String(url).startsWith('https://api.cloudflare.com/')) {assert.deepEqual(JSON.parse(init.body),{files:['https://geosub.org/en/ai-pricing/chatgpt']}); return Response.json({success:true});}
          return new Response(failPublic && String(url).startsWith('https://geosub.org') ? html.replace('<h1>','<h1>Wrong ') : html,{headers:{'content-type':'text/html'}});
        };
        if(failPublic) await assert.rejects(wired.distributeContentAttempt(lease.id,lease.owner,async()=>{},config),/验收未完成/);
        else assert.equal(await wired.distributeContentAttempt(lease.id,lease.owner,async()=>{},config),'verified');
        assert.equal((await store.readContentState()).receipt,failPublic?'pending':'verified');
        assert.equal((await store.readDistributionAttempt(lease.id)).status,failPublic?'failed':'verified');
        assert.equal(calls.length,3);
      }
    } finally {global.fetch=originalFetch;}
    console.log('PASS: real store + distribution + HTML parser wiring, complete receipt and public mismatch failure; HTTP mocked, no production requests.');
    const {pauseContentForDeployment}=require('./content-deploy-fence.cjs');
    await assert.rejects(pauseContentForDeployment(isolated,'rollback'),/Rollback blocked/);
    const beforePause=await store.readContentState();
    await pauseContentForDeployment(isolated,'upgrade');
    assert.equal((await store.readContentState()).version,beforePause.version);
    await assert.rejects(store.mutateContent(beforePause.generation,actor.id,{type:'publish',reason:'must block during deploy'}),/暂停/);
    console.log('PASS: deployment pause preserves serving version, closes admission and blocks unsafe application rollback.');





  } finally {
    await isolated.$disconnect();
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }

})().finally(() => db.$disconnect());
