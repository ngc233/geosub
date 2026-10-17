/* Real PostgreSQL and exported store functions. Framework cache is an adapter;
   browser acceptance separately verifies actual rendering/cache invalidation. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ts=require('typescript'),{PrismaClient}=require('@prisma/client'),{PrismaPg}=require('@prisma/adapter-pg');
const url=new URL(process.env.DATABASE_URL||'http://invalid');
if(url.hostname!=='127.0.0.1'||url.pathname!=='/geosub_release_20261017')throw Error('Dedicated local rehearsal database required');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})}),mods=new Map(),prefix='content-pilot:en:chatgpt:';
function load(file){file=path.resolve(file);if(mods.has(file))return mods.get(file).exports;const m={exports:{}};mods.set(file,m);const req=n=>n==='server-only'?{}:n==='next/cache'?{unstable_cache:f=>f}:n==='react'?{cache:f=>f}:n==='./prisma'?{prisma:db}:n.startsWith('.')?load(path.resolve(path.dirname(file),n)+(n.endsWith('.ts')?'':'.ts')):require(n);vm.runInThisContext('(function(require,module,exports){'+ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText+'})',{filename:file})(req,m,m.exports);return m.exports;}
(async()=>{const store=load('lib/managed-content-store.ts'),{pilotDraft}=load('lib/managed-content.ts'),dist=load('lib/content-distribution.ts');const actor=await db.adminUser.findFirst({where:{role:'OWNER'}});const before=await db.siteSetting.findMany({where:{settingKey:{startsWith:prefix}}});const audits=await db.auditLog.findMany({where:{targetType:'content_pilot'},select:{id:true}});try {
let state=await store.readContentState();const base=await store.readRevision(state.version);assert.ok(base);
const revision=before.find(x=>x.settingKey===prefix+'revision:'+state.version);
await db.siteSetting.delete({where:{id:revision.id}});
await assert.rejects(()=>store.mutateContent(state.generation,actor.id,{type:'draft',content:pilotDraft}),/修订不存在/);
await assert.rejects(()=>store.mutateContent(state.generation,actor.id,{type:'rollback',version:0,reason:'test'}),/修订不存在/);
assert.deepEqual(await store.readContentState(),state);
await db.siteSetting.create({data:revision});
await db.siteSetting.update({where:{id:revision.id},data:{valueJson:{...revision.valueJson,hash:'0'.repeat(64)}}});
await assert.rejects(()=>store.mutateContent(state.generation,actor.id,{type:'draft',content:pilotDraft}),/校验失败/);
await db.siteSetting.update({where:{id:revision.id},data:{valueJson:revision.valueJson}});
state=await store.mutateContent(state.generation,actor.id,{type:'draft',content:{...pilotDraft,heading:'Local isolated content release rehearsal'}});
assert.equal((await store.readRevision(state.version)).hash,base.hash);
const generation=state.generation;const results=await Promise.allSettled([1,2].map(()=>store.mutateContent(generation,actor.id,{type:'publish',reason:'Local isolated acceptance'})));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);state=await store.readContentState();
let attempt=await store.claimContentDistribution(state.version,state.attemptId);
await assert.rejects(()=>dist.distributeContentAttempt(attempt.id,attempt.owner,async()=>{throw Error('injected cache failure')},null),/缓存失效失败/);
assert.equal((await store.readContentState()).receipt,'pending');
await new Promise(r=>setTimeout(r,5100));state=await store.retryContentDistribution(state.generation,actor.id);attempt=await store.claimContentDistribution(state.version,state.attemptId);assert.equal(await dist.distributeContentAttempt(attempt.id,attempt.owner,async()=>{},null),'origin_invalidated');
state=await store.mutateContent(state.generation,actor.id,{type:'rollback',version:base.version,reason:'Local isolated rollback'});assert.equal((await store.readRevision(state.version)).hash,base.hash);assert.equal((await store.readRevision(state.version)).rollbackOf,base.version);attempt=await store.claimContentDistribution(state.version,state.attemptId);await dist.distributeContentAttempt(attempt.id,attempt.owner,async()=>{},null);
console.log('PASS missing/corrupt revision denies mutation without writes; draft isolation; concurrent publish single winner; cache failure; retry; rollback hash; local receipt never claims CDN verified');
} finally {await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;await tx.siteSetting.deleteMany({where:{settingKey:{startsWith:prefix}}});for(const row of before)await tx.siteSetting.create({data:row});await tx.auditLog.deleteMany({where:{targetType:'content_pilot',id:{notIn:audits.map(x=>x.id)}}});});}})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
