/* Real dedicated local canonical DB, one rolled-back transaction. Next cache
 * adapters mocked only for loading; DTO SQL and template storage are real.
 */
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),ts=require('typescript');
const {PrismaClient}=require('@prisma/client'),{PrismaPg}=require('@prisma/adapter-pg');
const u=new URL(process.env.DATABASE_URL);assert(u.hostname==='127.0.0.1'&&/^\/geosub_release_\d{8}$/.test(u.pathname));
const db=new PrismaClient({adapter:new PrismaPg({connectionString:u.href})});
function modules(database){
 const memo=new Map();
 function load(file){file=path.resolve(file);if(memo.has(file))return memo.get(file);const module={exports:{}};const req=createRequire(file);const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',source)(name=>name==='server-only'?{}:name==='./prisma'?{prisma:database}:name==='react'?{cache:f=>f}:name==='next/cache'?{unstable_cache:f=>f}:name.startsWith('.')?load(path.resolve(path.dirname(file),name.replace(/\.ts$/,'')+'.ts')):req(name),module,module.exports);memo.set(file,module.exports);return module.exports;}
 return load;
}
const rollback=new Error('intentional local rollback');
(async()=>{let checks=0;try{await db.$transaction(async tx=>{
 const load=modules({...tx,$transaction:f=>f(tx)}),core=load('lib/managed-content.ts'),facts=load('lib/managed-content-facts.ts'),store=load('lib/managed-content-store.ts'),effects=load('lib/content-effects-store.ts');
 const actor=await tx.adminUser.create({data:{email:randomUUID()+'@invalid.example',passwordHash:'unusable',role:'OWNER',status:'ACTIVE'}});
 const oldAudit=await tx.$queryRaw`INSERT INTO audit_logs(actor,action,target_type,note) VALUES('historical text actor','historical_fact_fixture','fixture','All fields retained') RETURNING *`;
 const p=await tx.product.create({data:{slug:'claude',name:'Claude',category:'AI',status:'PUBLISHED'}});
 const plan=await tx.plan.create({data:{productId:p.id,slug:'pro',name:'Claude Pro',billingCycle:'MONTHLY',status:'PUBLISHED'}});
 const source=await tx.priceSource.create({data:{sourceKey:'facts-test-'+randomUUID(),name:'Synthetic official fixture',type:'APP_STORE',sourceLevel:'A',status:'ACTIVE'}});
 for(const code of ['US','GB','FR','JP'])if(!await tx.country.findUnique({where:{code}}))await tx.country.create({data:{code,nameZh:code,nameEn:code,currency:'USD'}});
 const countries=await tx.country.findMany({where:{code:{in:['US','GB','FR','JP']}},select:{id:true,code:true}});assert.equal(countries.length,4);
 const byCode=Object.fromEntries(countries.map(c=>[c.code,c.id]));
 const checked=new Date('2026-10-20T12:00:00Z');
 const price=await tx.regionPrice.create({data:{productId:p.id,planId:plan.id,countryId:byCode.US,localPrice:20,currency:'USD',priceUsd:20,billingPlatform:'IOS',priceType:'LIST_PRICE',primarySourceId:source.id,confidenceScore:100,dataQuality:'VERIFIED',status:'PUBLISHED',lastCheckedAt:checked}});
 await tx.priceObservation.create({data:{productId:p.id,planId:plan.id,countryId:byCode.US,sourceId:source.id,rawPrice:20,currency:'USD',convertedUsd:20,billingPlatform:'IOS',priceType:'LIST_PRICE',observedAt:checked,status:'APPROVED',confidenceScore:100,sourceLevel:'A',rawPayload:{fx_rate_date:'2026-10-19'}}});
 // A later approved but different quote must not supply the formal row's FX date.
 await tx.priceObservation.create({data:{productId:p.id,planId:plan.id,countryId:byCode.US,sourceId:source.id,rawPrice:99,currency:'USD',convertedUsd:99,billingPlatform:'IOS',priceType:'LIST_PRICE',observedAt:new Date('2026-10-22'),status:'APPROVED',confidenceScore:100,sourceLevel:'A',rawPayload:{fx_rate_date:'2099-01-01'}}});
 const quote=(countryId,patch={})=>tx.regionPrice.create({data:{productId:p.id,planId:plan.id,countryId,localPrice:10,currency:'USD',priceUsd:10,billingPlatform:'IOS',priceType:'LIST_PRICE',primarySourceId:source.id,confidenceScore:100,dataQuality:'VERIFIED',status:'PUBLISHED',lastCheckedAt:checked,...patch}});
 await quote(byCode.GB,{billingPlatform:'WEB',priceUsd:1});await quote(byCode.FR,{status:'REVIEW'});await quote(byCode.JP,{dataQuality:'STALE'});
 const adapter=load('lib/pricing-detail-adapter.ts');
 const raw=await adapter.getPricingDetailProduct('claude','en',true);assert(raw);const product=facts.projectClaudeFactProduct(raw);
 assert.equal(product.plans[0].regions.length,1);assert.equal(product.plans[0].regions[0].fxRateDate,'2026-10-19');checks+=2;
 const id='overview:en:claude',s=store.contentStore(id),template=core.parseOverviewContent({...core.initialContentDraft(id),description:'{{pro.price_range}}; {{pro.regions}}',sections:[{heading:'Dates',body:'{{pro.price_date}}; {{pro.fx_date}}'}]},id);
 const d=await s.mutateContent(0,actor.id,{type:'draft',content:template}),published=await s.mutateContent(d.generation,actor.id,{type:'publish',reason:'Synthetic dynamic facts local test'});
 const before=await s.readRevision(published.version),oldHash=before.hash;
 const first=facts.renderFactContent(template,id,product);assert.match(first.content.description,/\$20.00–\$20.00; monthly App Store 1 region/);checks++;
 const claim=await s.claimContentDistribution(published.version,published.attemptId);
 const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const html=(rendered,version)=>{const c=rendered.content;return `<title>${escape(c.title)} - GeoSub</title><meta name="description" content="${escape(c.description)}"><meta property="og:description" content="${escape(c.description)}"><meta name="twitter:description" content="${escape(c.description)}"><link rel="canonical" href="https://geosub.org/en/ai-pricing/claude"><main data-content-version="${version}" data-content-mode-generation="0" data-content-facts-hash="${rendered.factsHash}"><h1>${escape(c.heading)}</h1>${c.sections.map(b=>`<section data-managed-editorial="true"><h2>${escape(b.heading)}</h2><p>${escape(b.body)}</p></section>`).join('')}${c.sources.map(href=>`<a data-managed-source="true" href="${escape(href)}">source</a>`).join('')}${c.faqs.map(f=>`<summary data-managed-faq-question="true">${escape(f.q)}</summary><p data-managed-faq-answer="true">${escape(f.a)}</p>`).join('')}</main><script type="application/ld+json">${JSON.stringify({'@type':'FAQPage',mainEntity:c.faqs.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))})}</script>`;};
 const wired=load('lib/content-distribution.ts'),config={originPort:3000,zoneId:'a'.repeat(32),token:'mock-only',cachePolicy:'audited-single-url'};
 const originalFetch=global.fetch,calls=[];let responseHtml=html(first,published.version);
 global.fetch=async(url,init)=>{calls.push(String(url));if(init?.method==='POST')return Response.json({success:true});return new Response(responseHtml,{headers:{'content-type':'text/html'}});};
 try {assert.equal(await wired.distributeContentAttempt(claim.id,claim.owner,async()=>{},config,id),'verified');assert.equal(calls.length,3);}
 finally {global.fetch=originalFetch;}
 checks+=2;
 const opportunity=await tx.searchOpportunity.create({data:{query:'Synthetic fact changes',normalizedQuery:randomUUID(),kind:'content'}});
 const input={version:published.version,opportunityId:opportunity.id,hypothesis:'Local fixture only',engine:'google',timezone:'UTC'};
 const link=await effects.linkContentEffect(actor.id,input,id);assert.equal(link.factsHash,first.factsHash);checks++;
 await tx.regionPrice.update({where:{id:price.id},data:{localPrice:30,priceUsd:30,lastCheckedAt:new Date('2026-10-21T12:00:00Z')}});
 const second=facts.renderFactContent(template,id,facts.projectClaudeFactProduct(await adapter.getPricingDetailProduct('claude','en',true)));
 assert.notEqual(second.factsHash,first.factsHash);assert.match(second.content.description,/\$30.00–\$30.00/);assert.match(second.content.sections[0].body,/FX date: date unavailable/);checks+=2;
 assert.deepEqual(await s.readRevision(published.version),before);assert.equal((await s.readRevision(published.version)).hash,oldHash);checks++;
 assert.equal((await effects.captureContentEffect(actor.id,link.id,id)).result.status,'insufficient');checks++;
 await assert.rejects(()=>effects.linkContentEffect(actor.id,{...input,engine:'bing'},id),/正式价格事实已切换/);checks++;
 const next=await s.mutateContent((await s.readContentState()).generation,actor.id,{type:'publish',reason:'Stale dynamic readback rejection'});
 const nextClaim=await s.claimContentDistribution(next.version,next.attemptId);
 calls.length=0;responseHtml=html(first,next.version);
 global.fetch=async(url)=>{calls.push(String(url));return new Response(responseHtml,{headers:{'content-type':'text/html'}});};
 try {await assert.rejects(()=>wired.distributeContentAttempt(nextClaim.id,nextClaim.owner,async()=>{},config,id),/验收未完成/);}
 finally {global.fetch=originalFetch;}
 assert.equal(calls.length,1,'Stale fact HTML blocks before CDN purge');
 assert.equal((await s.readDistributionAttempt(nextClaim.id)).status,'failed');checks+=2;
 const audit=await tx.$queryRaw`SELECT * FROM audit_logs WHERE id=${oldAudit[0].id}::uuid`;assert.deepEqual(audit,oldAudit);checks++;
 assert.deepEqual((await tx.regionPrice.findMany({where:{id:{not:price.id},productId:p.id},select:{status:true}})).map(r=>r.status).sort(),['PUBLISHED','PUBLISHED','REVIEW']);checks++;
 throw rollback;
},{timeout:30000});}catch(e){if(e!==rollback)throw e;}console.log(JSON.stringify({checks,fixtures:'rolled back',priceSource:'canonical adapter SQL',HTTP:'mocked for receipts',productionTouched:false}));})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
