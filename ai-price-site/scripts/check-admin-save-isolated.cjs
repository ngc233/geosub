/* Integration harness: actual exported actions + real isolated PostgreSQL. Framework auth/cache are test adapters. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const ts=require('typescript'),{PrismaClient}=require('@prisma/client'),{PrismaPg}=require('@prisma/adapter-pg');
const url=new URL(process.env.DATABASE_URL||'http://invalid');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/geosub_promotion_preprod_'))throw Error('Isolated local database required');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
let actor,role='OWNER';
class Redirect extends Error{}
const mods=new Map();
function load(file){
 file=path.resolve(file);if(mods.has(file))return mods.get(file).exports;
 const m={exports:{}};mods.set(file,m);
 const req=(name)=>{
  if(name==='next/navigation')return {redirect:url=>{throw new Redirect(url);}};
  if(name==='next/cache')return {revalidatePath:()=>{}};
  if(name.endsWith('/admin-auth'))return {requireAdmin:async()=>{if(role!=='OWNER')throw Error('forbidden');return actor;}};
  if(name.endsWith('/prisma'))return {prisma:db};
  if(name.endsWith('/articles'))return {estimateReadingTime:()=>1,normalizeArticleSlug:s=>s.trim().toLowerCase()};
  if(name.endsWith('/public-pricing-cache-actions'))return {invalidatePublicPricing:()=>{}};
  if(name.endsWith('/product-logo-storage'))return {cacheRemoteProductLogo:async()=>null};
  if(name.endsWith('/official-site-logo'))return {fetchOfficialSiteIcon:async()=>null};
  if(name.endsWith('/article-seo-draft'))return {getArticleSeoDraft:async()=>({seoTitle:'draft title',seoDescription:'draft description',seoKeywords:'test',ogTitle:'draft',ogDescription:'draft',canonicalUrl:'/zh/guides/test',structuredDataType:'ARTICLE',score:90,issues:[],relatedProductCount:0,relatedArticleCount:0})};
  if(name==='server-only')return {};
  if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
  return require(name);
 };
 vm.runInThisContext('(function(require,module,exports,fetch){'+ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText+'\n})',{filename:file})(req,m,m.exports,async()=>({ok:true,json:async()=>({results:[]})}));return m.exports;
}
const form=(o)=>{const f=new FormData();for(const [k,v] of Object.entries(o))for(const value of Array.isArray(v)?v:[v])f.append(k,String(value));return f;};
const ids=[],tagIds=[],prefix='save-check-'+randomUUID();
(async()=>{
 actor=await db.adminUser.findFirst({where:{role:'OWNER'}});assert.ok(actor);
 const {adminRecordVersion}=load('lib/admin-save.ts'),articles=load('app/admin/articles/actions.ts'),products=load('app/admin/products/actions.ts');
 const product=await db.product.create({data:{name:'【隔离验收】保存可靠性',slug:prefix,category:'AI',status:'DRAFT'}});ids.push(product.id);
 const article=await db.article.create({data:{title:'【隔离验收】文章',slug:prefix,status:'DRAFT',bodyMarkdown:'original'}});ids.push(article.id);
 const tag=await db.articleTag.create({data:{name:'隔离验收',slug:prefix,locale:'ZH'}});tagIds.push(tag.id);
 await db.articleTagLink.create({data:{articleId:article.id,tagId:tag.id}});
 const articleForm=()=>form({id:article.id,title:'【隔离验收】修改',slug:prefix,locale:'ZH',status:'DRAFT',bodyMarkdown:'changed',recordVersion:adminRecordVersion(article),tagIds:tag.id});
 const count=await db.auditLog.count({where:{targetId:article.id}});
 const bad=articleForm();bad.append('relatedProductIds',randomUUID());
 const failed=await articles.updateArticleAction(bad);assert.ok(failed.error);
 assert.equal((await db.article.findUnique({where:{id:article.id}})).bodyMarkdown,'original');
 assert.equal(await db.articleTagLink.count({where:{articleId:article.id}}),1);
 assert.equal(await db.auditLog.count({where:{targetId:article.id}}),count);
 // Deliberately invalidate audit actor: the preceding body/tag/relation changes must roll back.
 const realActor=actor;actor={...actor,id:randomUUID()};
 const auditFailed=await articles.updateArticleAction(articleForm());assert.ok(auditFailed.error);actor=realActor;
 assert.equal((await db.article.findUnique({where:{id:article.id}})).bodyMarkdown,'original');
 const good=await articles.updateArticleAction(articleForm());assert.ok(good.recordVersion);
 const stale=await articles.updateArticleAction(articleForm());assert.match(stale.error,/修改|过期/);
 const again=articleForm();again.set('recordVersion',good.recordVersion);again.set('bodyMarkdown','second save');assert.ok((await articles.updateArticleAction(again)).recordVersion);
 const pf=()=>form({id:product.id,name:'【隔离验收】new',slug:prefix,category:'AI',status:'DRAFT',description:'saved',recordVersion:adminRecordVersion(product)});
 const both=await Promise.allSettled([products.updateProductAction(pf()),products.updateProductAction(pf())]);
 assert.equal(both.filter(r=>r.status==='rejected'&&r.reason instanceof Redirect).length,1);
 assert.equal(both.filter(r=>r.status==='fulfilled'&&r.value.error).length,1);
 assert.equal(await db.auditLog.count({where:{targetId:product.id}}),1);
 // Missing SEO rows must serialize on the parent product too: no duplicate first creation.
 const sf=version=>form({productId:product.id,title:'【隔离验收】SEO',description:'original seo',status:'DRAFT',recordVersion:version});
 actor={...realActor,id:randomUUID()};
 assert.ok((await products.saveProductSeoAction(sf(adminRecordVersion(null)))).error);actor=realActor;
 assert.equal(await db.seoMeta.count({where:{productId:product.id}}),0);
 const seoBoth=await Promise.all([products.saveProductSeoAction(sf(adminRecordVersion(null))),products.saveProductSeoAction(sf(adminRecordVersion(null)))]);
 assert.equal(seoBoth.filter(r=>r.recordVersion).length,1);
 assert.equal(seoBoth.filter(r=>r.error).length,1);
 const seo=await db.seoMeta.findFirst({where:{productId:product.id}});assert.ok(seo);ids.push(seo.id);
 assert.equal(await db.seoMeta.count({where:{productId:product.id}}),1);
 assert.equal(await db.auditLog.count({where:{targetId:seo.id}}),1);
 const seoUpdate=sf(adminRecordVersion(seo));seoUpdate.set('description','second seo');
 actor={...realActor,id:randomUUID()};assert.ok((await products.saveProductSeoAction(seoUpdate)).error);actor=realActor;
 assert.equal((await db.seoMeta.findUnique({where:{id:seo.id}})).description,'original seo');
 const seoSaved=await products.saveProductSeoAction(seoUpdate);assert.ok(seoSaved.recordVersion);
 assert.ok((await products.saveProductSeoAction(seoUpdate)).error);
 seoUpdate.set('recordVersion',seoSaved.recordVersion);assert.ok((await products.saveProductSeoAction(seoUpdate)).recordVersion);
 // Old product creation must not leave an unaudited product after failure.
 const cf=()=>form({name:'【隔离验收】create',slug:prefix+'-create',status:'DRAFT',category:'AI'});
 actor={...realActor,id:randomUUID()};assert.ok((await products.createProductAction(cf())).error);actor=realActor;
 assert.equal(await db.product.count({where:{slug:prefix+'-create'}}),0);
 await assert.rejects(()=>products.createProductAction(cf()),Redirect);
 const created=await db.product.findUnique({where:{slug:prefix+'-create'}});ids.push(created.id);
 assert.ok((await products.createProductAction(cf())).error);
 const sourceForm=async()=>form({productId:product.id,appStoreUrl:'https://apps.apple.com/us/app/test/id123456789',appStoreId:'123456789',recordVersion:adminRecordVersion(await db.product.findUnique({where:{id:product.id}}))});
 actor={...realActor,id:randomUUID()};assert.ok((await products.saveProductAppStoreSourceAction(await sourceForm())).error);actor=realActor;
 assert.equal((await db.$queryRaw`SELECT id FROM price_sources WHERE source_key = ${'product-'+product.id+'-app-store'}`).length,0);
 const sourceInput=await sourceForm();await assert.rejects(()=>products.saveProductAppStoreSourceAction(sourceInput),Redirect);
 const sources=await db.$queryRaw`SELECT id FROM price_sources WHERE source_key = ${'product-'+product.id+'-app-store'}`;ids.push(sources[0].id);
 assert.ok((await products.saveProductAppStoreSourceAction(sourceInput)).error);
 const changedSource=await sourceForm();changedSource.set('appStoreId','987654321');changedSource.set('appStoreUrl','https://apps.apple.com/us/app/test/id987654321');
 await assert.rejects(()=>products.saveProductAppStoreSourceAction(changedSource),Redirect);
 const jobs=await db.$queryRaw`SELECT job_config FROM collector_jobs WHERE product_id = ${product.id}::uuid`;
 assert.equal(jobs.length,1);assert.equal(jobs[0].job_config.app_store_id,'987654321');
 const draftInput=form({id:article.id,recordVersion:adminRecordVersion(await db.article.findUnique({where:{id:article.id}}))});
 actor={...realActor,id:randomUUID()};assert.ok((await articles.generateArticleSeoDraftAction(draftInput)).error);actor=realActor;
 assert.notEqual((await db.article.findUnique({where:{id:article.id}})).seoTitle,'draft title');
 await assert.rejects(()=>articles.generateArticleSeoDraftAction(draftInput),Redirect);
 assert.ok((await articles.generateArticleSeoDraftAction(draftInput)).error);
 const denied=form({id:article.id,confirmDelete:'on'});role='VIEWER';await assert.rejects(()=>articles.permanentlyDeleteArticleAction(denied),/forbidden/);role='OWNER';
 assert.ok((await articles.permanentlyDeleteArticleAction(form({id:article.id}))).error);
 assert.ok((await articles.permanentlyDeleteArticleAction(denied)).error); // active article cannot be deleted
 await db.article.update({where:{id:article.id},data:{deletedAt:new Date()}});
 actor={...realActor,id:randomUUID()};assert.ok((await articles.permanentlyDeleteArticleAction(denied)).error);actor=realActor;
 assert.ok(await db.article.findUnique({where:{id:article.id}}));
 await assert.rejects(()=>articles.permanentlyDeleteArticleAction(denied),Redirect);
 assert.equal(await db.article.findUnique({where:{id:article.id}}),null);
 console.log('PASS: old product create rollback/duplicate; source+job rollback/stale/update; article SEO draft rollback/stale;  relation failure rollback; audit failure rollback; article conflict; repeat save; concurrent product single winner; SEO create/update audit rollback, concurrent first create single winner, stale rejection and repeat save; role denial; unconfirmed/active delete denial; deletion audit failure rollback; confirmed test delete.');
})().finally(async()=>{await db.auditLog.deleteMany({where:{targetId:{in:ids}}});await db.article.deleteMany({where:{id:{in:ids}}});await db.articleTag.deleteMany({where:{id:{in:tagIds}}});for(const id of ids){await db.$executeRaw`DELETE FROM collector_jobs WHERE product_id = ${id}::uuid`;await db.$executeRaw`DELETE FROM price_sources WHERE source_key = ${'product-'+id+'-app-store'}`;}await db.product.deleteMany({where:{id:{in:ids}}});await db.$disconnect();});
