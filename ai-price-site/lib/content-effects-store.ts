import 'server-only';
import { createHash,randomUUID } from 'node:crypto';
import { prisma } from './prisma';
import { assertContentRuntime,parseOverviewContent } from './managed-content';
import { preproductionRuntime } from './first-party-promotion';
import { assessContentEffect,EFFECT_PATH,type EffectLink } from './content-effects';
import { parseSeoSearchPageImportState,SEO_SEARCH_PAGE_IMPORT_SETTING_KEY } from './seo-search-observation-import';
const PREFIX='content-effect:v1:';
function writable(){if(!preproductionRuntime())assertContentRuntime();}
export async function readContentEffects(){
 const groups=await Promise.all(['content-effect-link','content-effect-check'].map(groupName=>prisma.siteSetting.findMany({where:{groupName},orderBy:{createdAt:'desc'},take:200})));
 const rows=groups.flat();
 return {links:rows.filter(r=>r.groupName==='content-effect-link').map(r=>r.valueJson as unknown as EffectLink),checks:rows.filter(r=>r.groupName==='content-effect-check').map(r=>r.valueJson as unknown as {linkId:string;at:string;result:ReturnType<typeof assessContentEffect>})};
}
export async function linkContentEffect(actor:string,input:{version:number;opportunityId:string;hypothesis:string;engine:string;timezone:string}){
 writable();
 if(!Number.isSafeInteger(input.version)||input.version<1||!/^[0-9a-f-]{36}$/i.test(input.opportunityId)||!input.hypothesis.trim()||input.hypothesis.length>500||!['google','bing'].includes(input.engine)||!['UTC','America/Los_Angeles'].includes(input.timezone))throw Error('请填写有效版本、机会、改进目标、引擎和证据时区。');
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
  const opportunity=await tx.searchOpportunity.findUnique({where:{id:input.opportunityId}});
  if(!opportunity||opportunity.kind!=='content')throw Error('请选择已登记的内容搜索机会。');
  const stateRow=await tx.siteSetting.findUnique({where:{settingKey:'content-pilot:en:chatgpt:state'}});
  const state=stateRow?.valueJson as unknown as {version:number;attemptId?:string;receipt?:string}|null;
  if(state?.version!==input.version||state.receipt!=='verified'||!state.attemptId)throw Error('只能关联当前已取得源站及公网核对回执的内容版本。');
  const [revisionRow,attemptRow]=await Promise.all([tx.siteSetting.findUnique({where:{settingKey:'content-pilot:en:chatgpt:revision:'+input.version}}),tx.siteSetting.findUnique({where:{settingKey:'content-pilot:en:chatgpt:attempt:'+state.attemptId}})]);
  const revision=revisionRow?.valueJson as unknown as {content:unknown;hash:string;version:number}|null;
  const attempt=attemptRow?.valueJson as unknown as {status:string;version:number;finishedAt:number;evidence?:{status:string;stage:string;public?:{checkedAt:string;version:string}}}|null;
  if(!revision||revision.version!==input.version||!revision.content||createHash('sha256').update(JSON.stringify(parseOverviewContent(revision.content))).digest('hex')!==revision.hash||attempt?.status!=='verified'||attempt.version!==input.version||attempt.evidence?.status!=='verified'||attempt.evidence.stage!=='complete'||attempt.evidence.public?.version!==String(input.version)||!attempt.evidence.public?.checkedAt)throw Error('版本或发布证据不完整，不能建立效果观察。');
  const publishedAt=attempt.evidence.public.checkedAt;
  if(!Number.isFinite(Date.parse(publishedAt))||Date.parse(publishedAt)>Date.now())throw Error('发布核对时间无效。');
  const key=PREFIX+'link:'+input.version+':'+opportunity.id+':'+input.engine+':'+input.timezone;
  if(await tx.siteSetting.findUnique({where:{settingKey:key}}))throw Error('此机会与版本已关联，请查看现有记录。');
  const link:EffectLink={id:randomUUID(),version:input.version,revisionHash:revision.hash,opportunityId:opportunity.id,query:opportunity.query,hypothesis:input.hypothesis.trim(),engine:input.engine as EffectLink['engine'],timezone:input.timezone,publishedAt,createdAt:new Date().toISOString(),actor,attemptId:state.attemptId,path:EFFECT_PATH};
  await tx.siteSetting.create({data:{settingKey:key,groupName:'content-effect-link',label:'Content effect association',valueJson:JSON.parse(JSON.stringify(link)),isPublic:false}});
  await tx.auditLog.create({data:{actorId:actor,action:'content_effect_link',targetType:'content_effect',newValue:{id:link.id,version:link.version,opportunityId:link.opportunityId}}});return link;
 });
}
export async function captureContentEffect(actor:string,id:string){
 writable();
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
  const row=await tx.siteSetting.findFirst({where:{groupName:'content-effect-link',valueJson:{path:['id'],equals:id}}});
  if(!row)throw Error('关联记录不存在。');
  const link=row.valueJson as unknown as EffectLink;
  const [stateRow,evidenceRow]=await Promise.all([tx.siteSetting.findUnique({where:{settingKey:'content-pilot:en:chatgpt:state'}}),tx.siteSetting.findUnique({where:{settingKey:SEO_SEARCH_PAGE_IMPORT_SETTING_KEY}})]);
  const state=stateRow?.valueJson as unknown as {version:number;receipt?:string}|null;
  const result=assessContentEffect(link,parseSeoSearchPageImportState(evidenceRow?.valueText).batches,state?.receipt==='verified'?state.version:0);
  const check={linkId:id,at:new Date().toISOString(),actor,result};
  await tx.siteSetting.create({data:{settingKey:PREFIX+'check:'+randomUUID(),groupName:'content-effect-check',label:'Content effect evidence snapshot',valueJson:JSON.parse(JSON.stringify(check)),isPublic:false}});
  await tx.auditLog.create({data:{actorId:actor,action:'content_effect_check',targetType:'content_effect',newValue:{id,status:result.status}}});return check;
 });
}
