// Real database verification; every fixture and observation is rolled back.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash,randomUUID}=require('node:crypto'),ts=require('typescript');
const u=new URL(process.env.DATABASE_URL||'');
if(u.hostname!=='127.0.0.1'||!/^\/geosub_promotion_preprod_/.test(u.pathname))throw Error('Dedicated loopback preproduction DB required');
const {PrismaClient}=require('@prisma/client'),{PrismaPg}=require('@prisma/adapter-pg');
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
function load(file,db){const full=path.resolve(__dirname,'../lib',file+'.ts'),mod={exports:{}};const js=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:full})(name=>name==='server-only'?{}:name==='./prisma'?{prisma:db}:name.startsWith('.')?load(name.replace(/^\.\//,'').replace(/\.ts$/,''),db):require(name),mod,mod.exports);return mod.exports;}
const rollback=new Error('verification rollback');
(async()=>{let passed=0;
try{await prisma.$transaction(async tx=>{
 const db={...tx,$transaction:fn=>fn(tx)},store=load('content-effects-store',db),{pilotDraft}=load('managed-content',db);
 const actor=await tx.adminUser.findFirst({where:{role:'OWNER'}});assert(actor);
 const oid=randomUUID(),aid=randomUUID(),version=1000001;
 await tx.searchOpportunity.create({data:{id:oid,query:'本地事务演练 '+oid,normalizedQuery:oid,kind:'content',status:'open'}});
 async function setting(key,value){await tx.siteSetting.upsert({where:{settingKey:key},create:{settingKey:key,groupName:'local-verification',label:'local verification',valueJson:value,isPublic:false},update:{valueJson:value}});}
 const prefix='content-pilot:en:chatgpt:';
 const state={version,generation:1,receipt:'pending',attemptId:aid};
 await setting(prefix+'state',state);
 const input={version,opportunityId:oid,hypothesis:'本地事务验收，不是真实效果',engine:'google',timezone:'UTC'};
 await assert.rejects(()=>store.linkContentEffect(actor.id,input));passed++;
 await setting(prefix+'revision:'+version,{version,hash:createHash('sha256').update(JSON.stringify(pilotDraft)).digest('hex'),content:pilotDraft});
 await setting(prefix+'attempt:'+aid,{version,status:'verified',evidence:{status:'verified',stage:'complete',public:{version:String(version),checkedAt:'2026-09-15T12:00:00Z'}}});
 await setting(prefix+'state',{...state,receipt:'verified'});
 const link=await store.linkContentEffect(actor.id,input);assert.equal(link.opportunityId,oid);passed++;
 await assert.rejects(()=>store.linkContentEffect(actor.id,input));passed++;
 const bing=await store.linkContentEffect(actor.id,{...input,engine:'bing'});assert.notEqual(bing.id,link.id);passed++;
 const check=await store.captureContentEffect(actor.id,link.id);assert.equal(check.result.status,'insufficient');passed++;
 await setting(prefix+'state',{...state,version:version+1,receipt:'verified'});
 const changed=await store.captureContentEffect(actor.id,link.id);assert.match(changed.result.reason,/版本/);passed++;
 throw rollback;
},{timeout:30000});}catch(e){if(e!==rollback)throw e;}
console.log(JSON.stringify({checks:passed,fixtures:'rolled back',productionTouched:false}));
})().finally(()=>prisma.$disconnect());
