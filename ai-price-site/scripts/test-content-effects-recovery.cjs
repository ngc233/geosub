/* Dedicated local canonical DB only; isolated schema and every fixture removed.
 * Real transactions/concurrency; Next cache and public/CDN evidence are mocks.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto'),{createRequire}=require('node:module');
const {PrismaClient}=require('@prisma/client'),{PrismaPg}=require('@prisma/adapter-pg'),ts=require('typescript');
const url=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1'].includes(url.hostname)&&/^\/geosub_release_\d{8}$/.test(url.pathname));
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.href})});
const schema='content_effect_recovery_'+randomUUID().replaceAll('-','');
const isolated=new PrismaClient({adapter:new PrismaPg({connectionString:url.href},{schema})});
function modules(database,overrides={}) {
 const cache=new Map();
 function load(file) {
  file=path.resolve(file);if(cache.has(file))return cache.get(file);
  const module={exports:{}};cache.set(file,module.exports);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const req=createRequire(file);
  new Function('require','exports','module',js)(name=>{
   if(name in overrides)return overrides[name];
   if(name==='server-only')return {};
   if(name==='./prisma')return {prisma:database};
   if(name==='react')return {cache:f=>f};
   if(name==='next/cache')return {unstable_cache:f=>f};
   if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name.replace(/\.ts$/,'')+'.ts'));
   return req(name);
  },module.exports,module);
  cache.set(file,module.exports);return module.exports;
 }
 return {actions:()=>load('app/admin/content/effects/actions.ts'),core:load('lib/managed-content.ts'),store:load('lib/managed-content-store.ts'),effects:load('lib/content-effects-store.ts'),recovery:load('lib/content-recovery.ts')};
}
(async()=>{
 let checks=0;
 try {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  for(const table of ['site_settings','admin_users','audit_logs','search_opportunities'])await db.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  const {core,store,effects,recovery}=modules(isolated);
  const actor={id:randomUUID()};
  await isolated.$executeRawUnsafe(`INSERT INTO "${schema}".admin_users(id,email,password_hash,status,updated_at) VALUES($1::uuid,$2,'unusable','active'::public.admin_status,now())`,actor.id,randomUUID()+'@invalid.example');
  const oldAudit=await isolated.$queryRawUnsafe(`INSERT INTO "${schema}".audit_logs(actor,action,target_type,note) VALUES('legacy operator text','legacy_action','test','Historical audit preserved') RETURNING *`);
  const opportunity=await isolated.searchOpportunity.create({data:{query:'Synthetic content opportunity',normalizedQuery:randomUUID(),kind:'content'}});
  const ids=['overview:en:chatgpt','overview:zh:claude','overview:en:claude'];
  const prefix=id=>core.getRegisteredContentTarget(id).storagePrefix;
  async function json(key){return (await isolated.siteSetting.findUnique({where:{settingKey:key}})).valueJson;}
  async function patchAttempt(id,patch){const state=await store.contentStore(id).readContentState();const key=prefix(id)+'attempt:'+state.attemptId;await isolated.siteSetting.update({where:{settingKey:key},data:{valueJson:{...await json(key),...patch}}});return state;}
  async function publish(id){const s=store.contentStore(id),state=await s.readContentState();const d=await s.mutateContent(state.generation,actor.id,{type:'draft',content:core.initialContentDraft(id)});return s.mutateContent(d.generation,actor.id,{type:'publish',reason:'Synthetic local acceptance'});}
  function receipt(id,version,generation=0){const hash=createHash('sha256').update('https://geosub.org'+core.getRegisteredContentTarget(id).canonicalPath).digest('hex');const proof={checkedAt:'2026-09-15T12:00:00Z',htmlHash:'a'.repeat(64),version:String(version),modeGeneration:String(generation),cacheStatus:null,outputHashes:{title:'a',h1:'b',description:'c',canonical:hash,faq:'f',editorial:'e',sources:'s',version:'v'}};return {status:'verified',stage:'complete',origin:proof,public:proof,purge:{acceptedAt:'2026-09-15T12:00:00Z',url:'https://geosub.org'+core.getRegisteredContentTarget(id).canonicalPath}};}
  const input={version:1,opportunityId:opportunity.id,hypothesis:'Synthetic local comparison, not real SEO evidence',engine:'google',timezone:'UTC'};
  const links=[];
  for(const id of ids){
   const s=store.contentStore(id),state=await publish(id);
   await assert.rejects(()=>effects.linkContentEffect(actor.id,input,id));checks++;
   const a=await s.claimContentDistribution(state.version,state.attemptId);
   if(id==='overview:zh:claude'){
    assert.equal(await s.recordContentDistribution(a.id,a.owner,receipt('overview:en:claude',1)),false);checks++;
    await patchAttempt(id,{finishedAt:Date.now()-6000});
    const next=await s.retryContentDistribution(state.generation,actor.id),b=await s.claimContentDistribution(next.version,next.attemptId);
    assert.equal(await s.recordContentDistribution(b.id,b.owner,receipt(id,1)),true);
   }else assert.equal(await s.recordContentDistribution(a.id,a.owner,receipt(id,1)),true);
   const link=await effects.linkContentEffect(actor.id,input,id);links.push(link);
   assert.equal(link.path,core.getRegisteredContentTarget(id).canonicalPath);
   assert.equal((await effects.readContentEffects(id)).links.length,1);checks++;
   await assert.rejects(()=>effects.linkContentEffect(actor.id,input,id));checks++;
  }
  assert.equal(links[0].targetId,undefined,'Old default keeps legacy shape/key');
  await assert.rejects(()=>effects.captureContentEffect(actor.id,links[1].id,ids[2]));checks++;
  const legacyRows=await isolated.siteSetting.findMany({where:{settingKey:{startsWith:'content-effect:v1:'}}});
  const beforeChecks=await effects.captureContentEffect(actor.id,links[1].id,ids[1]);assert.equal(beforeChecks.result.status,'insufficient');checks++;
  const batches=['2026-09-01','2026-09-16'].map((start,i)=>({id:randomUUID(),engine:'google',periodStart:start,periodEnd:i?'2026-09-29':'2026-09-14',importedAt:'2026-10-01T12:00:00Z',actorLabel:'synthetic',evidence:{evidenceHash:'sha256:'+'a'.repeat(64),method:'server_api',searchType:'web',sourceTimezone:'UTC',coverage:'selected_rows',availableRows:1,capturedRows:1,excludedRoundedRows:0},observations:[{engine:'google',periodStart:start,periodEnd:i?'2026-09-29':'2026-09-14',path:'/zh/ai-pricing/claude',clicks:i?20:10,impressions:200}]}));
  const imports=require('node:fs').readFileSync('lib/seo-search-observation-import.ts','utf8');
  const settingKey=imports.match(/SEO_SEARCH_PAGE_IMPORT_SETTING_KEY\s*=\s*["']([^"']+)/)[1];
  await isolated.siteSetting.create({data:{settingKey,label:'Synthetic local evidence',groupName:'test',valueText:JSON.stringify({version:1,batches}),isPublic:false}});
  assert.equal((await effects.captureContentEffect(actor.id,links[1].id,ids[1])).result.clickDelta,10);
  assert.equal((await effects.captureContentEffect(actor.id,links[2].id,ids[2])).result.status,'insufficient');checks+=2;
  const zh=store.contentStore(ids[1]),en=store.contentStore(ids[2]);
  const originalZhRevision=await zh.readRevision(1),english=await en.readContentState();
  await publish(ids[1]);
  assert.equal((await effects.captureContentEffect(actor.id,links[1].id,ids[1])).result.status,'insufficient');
  assert.deepEqual(await en.readContentState(),english);checks+=2;
  const identityState=await zh.readContentState();
  await patchAttempt(ids[1],{id:randomUUID()});
  assert.equal((await zh.claimContentRecovery()).reason,'attempt_identity_mismatch');checks++;
  await patchAttempt(ids[1],{id:identityState.attemptId});
  assert.equal((await zh.claimContentRecovery()).reason,'lease_active');checks++;
  await patchAttempt(ids[1],{createdAt:Date.now()-61000});
  const claims=await Promise.all([zh.claimContentRecovery(),modules(isolated).store.contentStore(ids[1]).claimContentRecovery()]);
  assert.equal(claims.filter(c=>c.status==='claimed').length,1);checks++;
  const claimed=claims.find(c=>c.status==='claimed').attempt;
  assert.equal((await zh.readDistributionAttempt(claimed.previousAttemptId)).failure,'lease_expired');
  assert.equal((await zh.readContentState()).version,2);checks++;
  const beforeHistory=await zh.readContentHistory();
  await patchAttempt(ids[1],{leaseUntil:Date.now()-1});
  const restart=modules(isolated),reclaimed=await restart.store.contentStore(ids[1]).claimContentRecovery();
  assert.equal(reclaimed.attempt.number,3);
  assert.equal(await zh.finishContentDistribution(claimed.id,claimed.owner,true),false);checks+=2;
  await patchAttempt(ids[1],{leaseUntil:Date.now()-1});
  assert.equal((await zh.claimContentRecovery()).reason,'attempt_limit');
  assert.equal((await zh.readDistributionAttempt(reclaimed.attempt.id)).status,'failed');
  assert.equal((await zh.readDistributionAttempt(reclaimed.attempt.id)).failure,'lease_expired');
  assert.deepEqual(await zh.readContentHistory(),beforeHistory);checks+=2;
  await publish(ids[1]);const nowState=await zh.readContentState(),nowAttempt=await zh.claimContentDistribution(nowState.version,nowState.attemptId);
  await zh.finishContentDistribution(nowAttempt.id,nowAttempt.owner,false);
  assert.equal((await zh.claimContentRecovery()).reason,'backoff');checks++;
  await patchAttempt(ids[1],{finishedAt:Date.now()-6000});
  const failedSweep=await recovery.recoverContentDeliveries(async target=>{if(target.id===ids[1])throw Error('Synthetic cache outage');});
  assert.equal(failedSweep.find(r=>r.targetId===ids[1]).status,'failed');
  assert.equal((await zh.readContentState()).receipt,'pending');checks++;
  await patchAttempt(ids[1],{finishedAt:Date.now()-6000});
  const recovered=await modules(isolated).recovery.recoverContentDeliveries(async()=>{});
  assert.equal(recovered.find(r=>r.targetId===ids[1]).status,'origin_invalidated');
  assert.equal((await zh.readContentState()).receipt,'origin_invalidated');
  assert.deepEqual(await en.readContentState(),english);checks+=2;
  await publish(ids[1]);await patchAttempt(ids[1],{createdAt:Date.now()-61000});
  const fenceGeneration=(await json(prefix(ids[1])+'fence')).generation;
  await zh.setContentAdmission(fenceGeneration,actor.id,'closed');
  assert.equal((await zh.claimContentRecovery()).reason,'admission_closed');checks++;
  await zh.setContentAdmission(fenceGeneration+1,actor.id,'open');
  await patchAttempt(ids[1],{finishedAt:Date.now()-6000});
  const pending=await zh.claimContentRecovery();assert.equal(pending.status,'claimed');
  await publish(ids[1]);
  assert.equal(await zh.finishContentDistribution(pending.attempt.id,pending.attempt.owner,true),false);checks++;
  assert.deepEqual(await zh.readRevision(1),originalZhRevision);
  assert.deepEqual(await isolated.siteSetting.findMany({where:{settingKey:{startsWith:'content-effect:v1:'}}}),legacyRows);
  const audits=await isolated.$queryRawUnsafe(`SELECT * FROM "${schema}".audit_logs WHERE id=$1::uuid`,oldAudit[0].id);
  assert.deepEqual(audits,oldAudit);checks+=3;
  const actionAudits=await isolated.auditLog.findMany({where:{action:'content_recovery_claim'}});assert.ok(actionAudits.length>=4);checks++;
  const beforeDenied=await isolated.siteSetting.count();
  for(const role of ['EDITOR','VIEWER'])for(const operation of ['link','capture']){
   const {effectAction}=modules(isolated,{'../../../../lib/admin-auth':{requireAdmin:async capability=>{assert.equal(capability,'manage');throw Error(role+' denied');}}}).actions();
   const form=new FormData();form.set('targetId',ids[1]);form.set('operation',operation);
   await assert.rejects(()=>effectAction({message:''},form),new RegExp(role+' denied'));checks++;
  }
  assert.equal(await isolated.siteSetting.count(),beforeDenied);
  const actual=process.env.DATABASE_URL;process.env.DATABASE_URL='postgresql://local@127.0.0.1:5433/geosub_app';
  try{await assert.rejects(()=>zh.claimContentRecovery());await assert.rejects(()=>effects.linkContentEffect(actor.id,input,ids[1]));}finally{process.env.DATABASE_URL=actual;}checks++;
  console.log(JSON.stringify({checks,history:'preserved',schema:'removed in finally',HTTP:'mocked',productionTouched:false}));
 }finally{await isolated.$disconnect();await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await db.$disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
