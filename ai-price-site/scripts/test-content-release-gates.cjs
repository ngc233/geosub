/* Canonical local PG16; retained source is pinned to exact historical bytes. No CDN or production calls.
 * Only this test's schema/temp export are removed. Historical rows are compared byte for byte.
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),{createRequire}=require('node:module');
const {gunzipSync}=require('node:zlib');
const ts=require('typescript'),{PrismaClient}=require('@prisma/client'),{PrismaPg}=require('@prisma/adapter-pg');
const contract=require('../../geosub-backend/deploy/linux-arm64/content-release-contract.cjs');
const {pauseContentForDeployment:pause,verifyClosedContent:verify,checkRollbackContent:checkRollback,verifyContentOrigin:verifyOrigin}=require('./content-deploy-fence.cjs');
const url=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1'].includes(url.hostname)&&/^\/geosub_release_\d{8}$/.test(url.pathname));
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.href})});
const schema='content_release_'+randomUUID().replaceAll('-','');
const isolated=new PrismaClient({adapter:new PrismaPg({connectionString:url.href},{schema})});
const root=path.resolve('..'),retained='ead5051bb786a6cc16d0791ad463667e9fe1b0b4',plain='824c54610c3871984c3ba6d900a6f94dd6bc403b';
const exported=fs.mkdtempSync(path.join(os.tmpdir(),'geosub-exact-content-'));
const policy=JSON.parse(fs.readFileSync('../geosub-backend/deploy/linux-arm64/rolling-content-compatibility.json','utf8'));
const retainedSources=JSON.parse(fs.readFileSync('scripts/fixtures/retained-content-contracts.json','utf8'));
Object.assign(retainedSources,JSON.parse(fs.readFileSync('scripts/fixtures/production-content-contract.json','utf8')));
function retainedSource(ref,file) {
 const fixture=retainedSources[ref]?.[file];
 assert(fixture,'Historical content fixture missing: '+ref+':'+file);
 const content=gunzipSync(Buffer.from(fixture.gzipBase64.join(''),'base64'),{maxOutputLength:1024*1024});
 assert.equal(contract.hash(content),fixture.sha256,'Historical source hash mismatch');
 return content.toString('utf8');
}
function modules(ref,client=isolated) {
 const cache=new Map();
 function load(file) {
  if(cache.has(file))return cache.get(file);
  const source=ref?retainedSource(ref,'ai-price-site/'+file):fs.readFileSync(file,'utf8');
  const module={exports:{}};cache.set(file,module.exports);
  const code=ts.transpileModule(source,{compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX,
  }}).outputText;
  const req=createRequire(path.resolve(file));
  new Function('require','exports','module',code)(name=>{
   if(name==='server-only')return {};
   if(name==='./prisma')return {prisma:client};
   if(name==='react')return {cache:f=>f};
   if(name==='next/cache')return {unstable_cache:f=>f};
   if(name.endsWith('.module.css'))return {scope:'managed-content'};
   if(name.startsWith('.'))return load(path.posix.normalize(path.posix.join(path.posix.dirname(file),name.replace(/\.ts$/,'')+'.ts')));
   return req(name);
  },module.exports,module);
  cache.set(file,module.exports);return module.exports;
 }
 return {
  core:load('lib/managed-content.ts'),store:load('lib/managed-content-store.ts'),
  facts:()=>load('lib/managed-content-facts.ts'),editorial:()=>load('components/OverviewEditorialSections.tsx').default,
 };
}
(async()=>{
 let checks=0;
 try {
  const current=modules(),old=modules(retained),preTokens=modules(plain),actor=randomUUID();
  assert.deepEqual(contract.targets.map(t=>({id:t.id,prefix:t.prefix,path:t.path})),contract.targets.map(t=>{const r=current.core.getRegisteredContentTarget(t.id);return {id:r.id,prefix:r.storagePrefix,path:r.canonicalPath};}));
  const pair=policy.approvedPairs.find(p=>p.format===2&&p.retainedCommit===retained&&p.from===contract.fingerprint(root,policy.files));
  assert(pair,'Reviewed retained contract missing');
  for(const file of pair.toFiles){
   const p=path.join(exported,file);fs.mkdirSync(path.dirname(p),{recursive:true});
   fs.writeFileSync(p,retainedSource(retained,file));
  }
  assert.equal(contract.rollbackPlan(root,exported,policy).mode,'audited-compatible-readers');checks++;
  const options={from:root,to:exported,policy};
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  for(const table of ['site_settings','admin_users','audit_logs'])await db.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  await isolated.$executeRawUnsafe(`INSERT INTO "${schema}".admin_users(id,email,password_hash,status,updated_at) VALUES($1::uuid,$2,'unusable','active'::public.admin_status,now())`,actor,randomUUID()+'@invalid.example');
  const historical=await isolated.$queryRawUnsafe(`INSERT INTO "${schema}".audit_logs(actor,action,target_type,note) VALUES('preserved actor text','historic','test','MUST remain identical') RETURNING *`);
  const dataBefore=await db.$queryRaw`SELECT * FROM region_prices ORDER BY id`;
  const promotionsBefore=await db.$queryRaw`SELECT * FROM promotion_config ORDER BY id`;
  const ids=contract.targets.map(t=>t.id),prefix=id=>contract.targets.find(t=>t.id===id).prefix;
  const json=async key=>(await isolated.siteSetting.findUnique({where:{settingKey:key}}))?.valueJson;
  async function save(key,valueJson){await isolated.siteSetting.update({where:{settingKey:key},data:{valueJson}});}
  const rows=()=>isolated.siteSetting.findMany({orderBy:{settingKey:'asc'}});
  function receipt(id,version,generation,withFacts){
   const canonical='https://geosub.org'+contract.targets.find(t=>t.id===id).path;
   const outputHashes=Object.fromEntries(['title','h1','description','faq','editorial','sources','version'].map(k=>[k,contract.hash('MOCK '+k)]));
   outputHashes.canonical=contract.hash(canonical);
   const factsHash=withFacts?contract.hash('MOCK formal facts'):undefined;if(factsHash)outputHashes.factsHash=contract.hash(factsHash);
   const proof={checkedAt:new Date().toISOString(),htmlHash:contract.hash('MOCK HTTP'),version:String(version),modeGeneration:String(generation),cacheStatus:null,outputHashes,...(factsHash?{factsHash}:{})};
   return {status:'verified',stage:'complete',origin:proof,public:structuredClone(proof),purge:{acceptedAt:new Date().toISOString(),url:canonical}};
  }
  async function productionReaderCompatibility(){
   const ref='a3e1cf78ffe4f163384dfd578846feb4ba36a50f';
   const mainPair=policy.approvedPairs.find(p=>p.format===2&&p.retainedCommit===ref&&p.from===contract.fingerprint(root,policy.files));
   assert(mainPair,'Reviewed production reader pair missing');
   assert.deepEqual(mainPair.targets,[{id:ids[0],facts:false}],'Retained production supports plain English ChatGPT only');
   const mainRoot=path.join(exported,'production');
   for(const file of mainPair.toFiles){
    const p=path.join(mainRoot,file);fs.mkdirSync(path.dirname(p),{recursive:true});
    fs.writeFileSync(p,retainedSource(ref,file));
   }
   const options={from:root,to:mainRoot,policy};
   assert.equal(contract.rollbackPlan(root,mainRoot,policy).mode,'audited-compatible-readers');
   const mainSchema=schema+'_production';
   const mainDb=new PrismaClient({adapter:new PrismaPg({connectionString:url.href},{schema:mainSchema})});
   let scenarios=0;
   try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${mainSchema}"`);
    for(const table of ['site_settings','admin_users','audit_logs']){
     await db.$executeRawUnsafe(`CREATE TABLE "${mainSchema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
    }
    await mainDb.$executeRawUnsafe(
     `INSERT INTO "${mainSchema}".admin_users(id,email,password_hash,status,updated_at)
      VALUES($1::uuid,$2,'unusable','active'::public.admin_status,now())`,actor,randomUUID()+'@invalid.example',
    );
    const legacy=modules(ref,mainDb),candidate=modules(undefined,mainDb);
    const key=prefix(ids[0]);
    const mainRows=()=>mainDb.siteSetting.findMany({orderBy:{settingKey:'asc'}});
    async function publish(store,version){
     let state=await store.readContentState();
     const content={...legacy.core.pilotDraft,heading:'Synthetic compatibility revision '+version};
     state=await store.mutateContent(state.generation,actor,{type:'draft',content});
     state=await store.mutateContent(state.generation,actor,{type:'publish',reason:'Synthetic exact-reader rehearsal'});
     const a=await store.claimContentDistribution(state.version,state.attemptId);
     assert.equal(await store.recordContentDistribution(a.id,a.owner,receipt(ids[0],state.version,a.fenceGeneration,false)),true);
     return state;
    }
    // Reproduce the production version number with synthetic text, never copied production rows.
    for(let version=1;version<=4;version++)await publish(legacy.store,version);
    await legacy.store.setContentAdmission(0,actor,'closed');
    const before=await mainRows();
    for(let version=1;version<=4;version++){
     assert.deepEqual(await candidate.store.readRevision(version),await legacy.store.readRevision(version));
    }
    assert.deepEqual(await candidate.store.getPublishedContent('en','chatgpt'),await legacy.store.getPublishedContent('en','chatgpt'));
    assert.equal((await candidate.store.readContentState()).version,4);
    assert.deepEqual(await mainRows(),before,'Both retained and candidate reads must preserve all rows');scenarios++;
    const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
    const content=(await candidate.store.readRevision(4)).content;
    assert.deepEqual(candidate.core.parseOverviewContent(content),legacy.core.parseOverviewContent(content));
    assert.deepEqual(candidate.facts().renderFactContent(content,ids[0],{slug:'chatgpt'}).content,content);
    const html=reader=>renderToStaticMarkup(React.createElement(reader.editorial(),{content}));
    assert.equal(html(candidate),html(legacy),'English editorial sections and source links must render identically');scenarios++;
    assert.equal((await checkRollback(mainDb,options)).mode,'audited-compatible-readers');
    assert.deepEqual(await mainRows(),before,'Production-shaped rollback preflight must be read-only');scenarios++;
    for(const invalid of [{...options,policy:{...policy,approvedPairs:[]}},{...options,from:mainRoot,to:root}]){
     await assert.rejects(checkRollback(mainDb,invalid),/Rollback blocked/);
     assert.deepEqual(await mainRows(),before);
    }
    const changed=path.join(mainRoot,'VERSION'),original=fs.readFileSync(changed);
    try {
     fs.appendFileSync(changed,'\nchanged');
     await assert.rejects(checkRollback(mainDb,options),/Rollback blocked/);
     assert.deepEqual(await mainRows(),before);
    } finally {fs.writeFileSync(changed,original);}
    scenarios++;
    // New plain-text writes remain readable by the retained writer/reader after rollback.
    await candidate.store.setContentAdmission(1,actor,'open');
    await publish(candidate.store,5);
    const revision=await candidate.store.readRevision(5);
    assert.deepEqual(await legacy.store.readRevision(5),revision);
    assert.deepEqual(await legacy.store.getPublishedContent('en','chatgpt'),await candidate.store.getPublishedContent('en','chatgpt'));
    assert.equal((await checkRollback(mainDb,options)).mode,'audited-compatible-readers');scenarios++;
    const stateRow=await mainDb.siteSetting.findUnique({where:{settingKey:key+'state'}});
    await mainDb.siteSetting.update({where:{id:stateRow.id},data:{valueJson:{...stateRow.valueJson,receipt:'pending'}}});
    const pending=await mainRows();
    await assert.rejects(checkRollback(mainDb,options),/Rollback blocked/);
    assert.deepEqual(await mainRows(),pending);
    await mainDb.siteSetting.update({where:{id:stateRow.id},data:{valueJson:stateRow.valueJson,updatedAt:stateRow.updatedAt}});
    scenarios++;
    const revisionRow=await mainDb.siteSetting.findUnique({where:{settingKey:key+'revision:5'}});
    await mainDb.siteSetting.update({where:{id:revisionRow.id},data:{valueJson:{...revisionRow.valueJson,hash:'0'.repeat(64)}}});
    const corrupt=await mainRows();
    await assert.rejects(checkRollback(mainDb,options),/identity\/hash/);
    await assert.rejects(candidate.store.readRevision(5),/校验/);
    await assert.rejects(legacy.store.readRevision(5),/校验/);
    assert.deepEqual(await mainRows(),corrupt);
    await mainDb.siteSetting.update({where:{id:revisionRow.id},data:{valueJson:revisionRow.valueJson,updatedAt:revisionRow.updatedAt}});
    scenarios++;
    const beforeClose=await mainRows();
    const closed=await pause(mainDb,'rollback',undefined,options);
    assert.equal(closed.rollbackPolicy.mode,'audited-compatible-readers');
    const history=rows=>rows.filter(r=>!r.settingKey.endsWith(':fence'));
    assert.deepEqual(history(await mainRows()),history(beforeClose),'Rollback retains pointers, receipts and immutable revisions');
    assert.deepEqual((await legacy.store.getPublishedContent('en','chatgpt')).content,revision.content);
    assert.equal((await candidate.store.readContentState()).version,5);
    assert.equal((await verify(mainDb,{production:true})).claudeActivation,false);scenarios++;
    // No permission is inferred for the additional target namespaces or their fact tokens.
    const claude=candidate.store.contentStore(ids[1]);let state=await claude.readContentState();
    state=await claude.mutateContent(state.generation,actor,{type:'draft',content:candidate.core.initialContentDraft(ids[1])});
    state=await claude.mutateContent(state.generation,actor,{type:'publish',reason:'Synthetic unsupported retained target'});
    const attempt=await claude.claimContentDistribution(state.version,state.attemptId);
    assert.equal(await claude.recordContentDistribution(attempt.id,attempt.owner,receipt(ids[1],state.version,attempt.fenceGeneration,false)),true);
    const unsupported=await mainRows();
    await assert.rejects(checkRollback(mainDb,options),/Rollback blocked/);
    assert.deepEqual(await mainRows(),unsupported);scenarios++;
    return scenarios;
   } finally {
    await mainDb.$disconnect();await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${mainSchema}" CASCADE`);
   }
  }
  const productionReaderScenarios=await productionReaderCompatibility();
  async function publish(id,tokens=false,rollback=false){
   const s=current.store.contentStore(id);let state=await s.readContentState();
   if(!rollback){const draft=current.core.initialContentDraft(id);if(tokens){draft.title='{{product.name}} plans';draft.heading='{{pro.name}} facts';draft.description='{{pro.price_range}}; {{pro.regions}}';draft.sections=[{heading:'Formal facts',body:['product.name',...['pro','max-5x','max-20x'].flatMap(p=>['name','price_range','regions','price_date','fx_date'].map(f=>p+'.'+f))].map(t=>'{{'+t+'}}').join('; ')}];draft.faqs=[{q:'What is the coverage?',a:'{{pro.regions}}; {{pro.price_date}}'}];}state=await s.mutateContent(state.generation,actor,{type:'draft',content:draft});}
   state=await s.mutateContent(state.generation,actor,rollback?{type:'rollback',version:0,reason:'Local controlled default, retain token history'}:{type:'publish',reason:'Local exact rollback rehearsal'});
   const a=await s.claimContentDistribution(state.version,state.attemptId);
   assert.equal(await s.recordContentDistribution(a.id,a.owner,receipt(id,state.version,a.fenceGeneration,tokens&&!rollback)),true);
   return s.readContentState();
  }
  await publish(ids[0]);for(const id of ids.slice(1))await publish(id,true);
  const before=await rows();
  assert.equal((await checkRollback(isolated,options)).mode,'audited-compatible-readers');
  assert.deepEqual(await rows(),before,'Rollback preflight must be read-only');checks++;
  await assert.rejects(checkRollback(isolated,{...options,policy:{...policy,approvedPairs:[]}}),/Rollback blocked/);
  assert.deepEqual(await rows(),before);checks++;
  await assert.rejects(pause(isolated,'rollback'),/Rollback blocked/);
  assert.deepEqual(await rows(),before,'One incompatible language must leave all fences/history unchanged');checks++;
  for(const id of ids.slice(1)){
   const revision=await current.store.contentStore(id).readRevision(1);
   assert.deepEqual(await old.store.contentStore(id).readRevision(1),revision);
   assert.deepEqual((await old.store.contentStore(id).serving()).content,revision.content);
   assert.throws(()=>preTokens.core.parseOverviewContent(revision.content,id));
   const region={rank:1,code:'US',country:'United States',priceUsd:20,localPrice:'$20.00',localPriceValue:20,currencyCode:'USD',billingPlatform:'ios',priceType:'list_price',dataQuality:'verified',confidenceScore:100,lastCheckedAt:'2026-10-20',formalFxRateDate:'2026-10-19',tax:'Unknown'};
   const product={slug:'claude',name:'Claude',category:'ai',brand:'Anthropic',description:'',defaultPlan:'pro',updatedAt:'2099-01-01',plans:[{slug:'pro',name:'Claude Pro',billing:'monthly',priceStatus:'published',regions:[region,{...region,code:'GB',priceUsd:25,lastCheckedAt:'2026-10-22',formalFxRateDate:'2026-10-21'}]}]};
   const output=old.facts().renderFactContent(revision.content,id,product);
   assert.deepEqual(output,current.facts().renderFactContent(revision.content,id,product));
   assert.match(output.content.description,/USD \$20.00–\$25.00/);assert.match(output.content.sections[0].body,/2026-10-20/);checks+=6;
  }
  const incompatible={...policy,approvedPairs:[{...pair,targets:pair.targets.map(t=>({...t,facts:false}))}]};
  await assert.rejects(checkRollback(isolated,{...options,policy:incompatible}),/Rollback blocked/);checks++;
  const revKey=prefix(ids[1])+'revision:1',validRevision=await json(revKey),revisionUpdatedAt=(await isolated.siteSetting.findUnique({where:{settingKey:revKey}})).updatedAt;await save(revKey,{...validRevision,hash:'0'.repeat(64)});
  const corrupted=await rows();await assert.rejects(pause(isolated,'rollback',undefined,options),/identity\/hash/);assert.deepEqual(await rows(),corrupted);await isolated.siteSetting.update({where:{settingKey:revKey},data:{valueJson:validRevision,updatedAt:revisionUpdatedAt}});checks++;
  const unknownKey='managed-content:v2:overview:fr:claude:state';
  const unknown=await isolated.siteSetting.create({data:{settingKey:unknownKey,label:'Synthetic unknown target',groupName:'managed-content-v2',isPublic:false,valueJson:{version:0}}});
  await assert.rejects(pause(isolated,'upgrade'),/Unregistered/);await isolated.siteSetting.delete({where:{id:unknown.id}});checks++;
  const closed=await pause(isolated,'rollback',undefined,options);
  assert.equal(closed.targets.length,3);assert.equal(closed.rollbackPolicy.mode,'audited-compatible-readers');checks++;
  assert.equal((await verify(isolated)).targets.length,3);
  await assert.rejects(verify(isolated,{production:true}),/not activated/);checks+=2;
  const fakeOrigin=async (url)=>{
   const id=contract.targets.find(t=>'http://127.0.0.1:32109'+t.path===url).id;
   const state=await json(prefix(id)+'state');
   return new Response('<main data-content-version="'+state.version+'" data-content-mode-generation="0" data-content-facts-hash="'+contract.hash('MOCK formal facts')+'"></main>');
  };
  const identity=await verifyOrigin(isolated,'http://127.0.0.1:32109',{http:fakeOrigin});
  assert.equal(identity.targets.length,3);assert.equal(identity.publicCdnVerified,false);checks++;
  for(const html of ['<script><main data-content-version="1" data-content-mode-generation="0"></main></script>',
   '<main data-content-version="0" data-content-mode-generation="0"></main>',
   '<main data-content-version="1" data-content-mode-generation="999"></main>',
   '<main data-content-version="1" data-content-mode-generation="0"></main><main data-content-version="1" data-content-mode-generation="0"></main>',
   'a'.repeat(2_000_001)]){
   await assert.rejects(verifyOrigin(isolated,'http://127.0.0.1:32109',{http:async()=>new Response(html)}));checks++;
  }
  await assert.rejects(verifyOrigin(isolated,'https://geosub.org',{http:()=>{throw Error('must not fetch public')}}),/loopback/);checks++;
  await assert.rejects(verifyOrigin(isolated,'http://127.0.0.1:32109',{http:async()=>new Response('',{status:503})}),/HTTP/);checks++;
  const after=await rows();
  assert.deepEqual(after.filter(r=>r.settingKey.includes(':revision:')),before.filter(r=>r.settingKey.includes(':revision:')));
  for(const id of ids)assert.deepEqual(await json(prefix(id)+'state'),before.find(r=>r.settingKey===prefix(id)+'state').valueJson);checks+=2;
  await assert.rejects(pause(isolated,'resume',1,{targetId:ids[1]}),/disabled/);
  await assert.rejects(pause(isolated,'resume',999),/Stale/);checks+=2;
  // A changed retained reader invalidates the exact pair. No earlier fence may commit.
  const changed=path.join(exported,pair.toFiles[0]),original=fs.readFileSync(changed);fs.appendFileSync(changed,'\nchanged');
  const stable=await rows();await assert.rejects(pause(isolated,'rollback',undefined,options),/Rollback blocked/);assert.deepEqual(await rows(),stable);checks++;
  fs.writeFileSync(changed,original);
  // Target/canonical/fact mismatch must fail even with a matching reader fingerprint.
  for(const patch of [a=>({...a,targetId:ids[2]}),a=>({...a,evidence:{...a.evidence,purge:{...a.evidence.purge,url:'https://geosub.org/en/ai-pricing/claude'}}}),a=>({...a,evidence:{...a.evidence,public:{...a.evidence.public,factsHash:contract.hash('wrong')}}})]){
   const key=prefix(ids[1])+'attempt:'+(await json(prefix(ids[1])+'state')).attemptId,a=await json(key);await save(key,patch(a));
   const unchanged=await rows();await assert.rejects(pause(isolated,'rollback',undefined,options),/Rollback blocked/);assert.deepEqual(await rows(),unchanged);await save(key,a);checks++;
  }
  // Controlled default creates new immutable revisions; no deletion or pointer rewind.
  for(const id of ids){const f=await json(prefix(id)+'fence');await current.store.contentStore(id).setContentAdmission(f.generation,actor,'open');await publish(id,false,true);}
  const history=await rows();
  const strict=await pause(isolated,'rollback');assert.equal(strict.rollbackPolicy.mode,'code-default-required');
  assert.equal((await verify(isolated,{production:true})).claudeActivation,false);checks+=2;
  const beforeVerify=await rows(),auditBeforeVerify=await isolated.auditLog.findMany({orderBy:{id:'asc'}});
  await verify(isolated,{production:true});
  assert.deepEqual(await rows(),beforeVerify);assert.deepEqual(await isolated.auditLog.findMany({orderBy:{id:'asc'}}),auditBeforeVerify);checks++;
  const stop=new Error('rollback promotion test');
  try {await db.$transaction(async tx=>{
    await tx.$executeRaw`UPDATE public.promotion_config SET enabled=true WHERE id=true`;
    const testDb={$transaction:f=>f({siteSetting:isolated.siteSetting,$executeRaw:tx.$executeRaw.bind(tx),$queryRaw:tx.$queryRaw.bind(tx)})};
    await assert.rejects(verify(testDb,{production:true}),/promotion/);throw stop;
  });}catch(e){if(e!==stop)throw e;}
  assert.deepEqual(await db.$queryRaw`SELECT * FROM promotion_config ORDER BY id`,promotionsBefore);checks++;
  for(const id of ids){assert.equal((await current.store.contentStore(id).readRevision(2)).content,null);assert.deepEqual(await current.store.contentStore(id).readRevision(1),await old.store.contentStore(id).readRevision(1));}
  assert.deepEqual((await rows()).filter(r=>r.settingKey.includes(':revision:')),history.filter(r=>r.settingKey.includes(':revision:')));checks++;
  // Deploy closes every live attempt and stale owners cannot later report success.
  const pending=[];
  for(const id of ids){const s=current.store.contentStore(id),f=await json(prefix(id)+'fence');await s.setContentAdmission(f.generation,actor,'open');const state=await s.readContentState();const next=await s.mutateContent(state.generation,actor,{type:'rollback',version:0,reason:'Local lease race'});pending.push([s,await s.claimContentDistribution(next.version,next.attemptId)]);}
  await pause(isolated,'upgrade');
  for(const [s,a] of pending){assert.equal(await s.finishContentDistribution(a.id,a.owner,true),false);assert.equal((await s.readDistributionAttempt(a.id)).status,'superseded');checks++;}
  await assert.rejects(verify(isolated,{production:true}),/not verified/);checks++;
  assert.deepEqual(await isolated.$queryRawUnsafe(`SELECT * FROM "${schema}".audit_logs WHERE id=$1::uuid`,historical[0].id),historical);
  assert.deepEqual(await db.$queryRaw`SELECT * FROM region_prices ORDER BY id`,dataBefore);checks+=2;
  assert.deepEqual(await db.$queryRaw`SELECT * FROM promotion_config ORDER BY id`,promotionsBefore);checks++;
  // The fence runs before additive migration 059. A legacy actor TEXT table has no
  // actor_id yet; selecting only the shared id avoids Prisma RETURNING actor_id.
  const legacySchema=schema+'_legacy',legacyDb=new PrismaClient({adapter:new PrismaPg({connectionString:url.href},{schema:legacySchema})});
  try {
   await db.$executeRawUnsafe(`CREATE SCHEMA "${legacySchema}"`);
   for(const table of ['site_settings','audit_logs'])await db.$executeRawUnsafe(`CREATE TABLE "${legacySchema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
   await db.$executeRawUnsafe(`ALTER TABLE "${legacySchema}".audit_logs DROP COLUMN actor_id`);
   await db.$executeRawUnsafe(`INSERT INTO "${legacySchema}".site_settings SELECT * FROM "${schema}".site_settings`);
   const legacyAudit=await db.$queryRawUnsafe(`INSERT INTO "${legacySchema}".audit_logs(actor,action,target_type,note) VALUES('legacy text only','historic','test','preserve pre-migration audit') RETURNING *`);
   assert.equal((await pause(legacyDb,'upgrade')).targets.length,3);
   assert.deepEqual(await db.$queryRawUnsafe(`SELECT * FROM "${legacySchema}".audit_logs WHERE id=$1::uuid`,legacyAudit[0].id),legacyAudit);checks++;
  } finally {await legacyDb.$disconnect();await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${legacySchema}" CASCADE`);}
  console.log(JSON.stringify({
   passed:checks,productionReaderScenarios,retainedProductionCommit:'a3e1cf78ffe4f163384dfd578846feb4ba36a50f',
   retainedCommit:retained,unsupportedTokenReader:plain,
   scope:'local real PG; Next cache mocked; receipt proofs explicitly MOCK; no production activation',historyPreserved:true,
  }));
 } finally {
  await isolated.$disconnect();await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);fs.rmSync(exported,{recursive:true,force:true});
 }
})().finally(()=>db.$disconnect()).catch(e=>{console.error(e);process.exitCode=1;});
