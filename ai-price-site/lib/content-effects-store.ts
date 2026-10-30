import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { prisma } from './prisma';
import { assertContentTargetRuntime, getRegisteredContentTarget, LEGACY_CONTENT_TARGET, parseOverviewContent } from './managed-content';
import { preproductionRuntime } from './first-party-promotion';
import type { ContentState, ContentFence, DistributionAttempt, Revision } from './managed-content-store';
import type { Prisma } from '@prisma/client';
import { matchesContentDistributionEvidence } from './content-readback';
import { assessContentEffect, effectTarget, type EffectLink } from './content-effects';
import { parseSeoSearchPageImportState, SEO_SEARCH_PAGE_IMPORT_SETTING_KEY } from './seo-search-observation-import';

import { hasContentFactTokens } from './content-fact-tokens';

type EffectCheck = { linkId: string; targetId?: string; at: string; actor: string; result: ReturnType<typeof assessContentEffect> };
function scope(id: string) {
 const target=getRegisteredContentTarget(id);
 const legacy=target.id===LEGACY_CONTENT_TARGET;
 return {target, prefix:legacy?'content-effect:v1:':`content-effect:v2:${target.id}:`, linkGroup:legacy?'content-effect-link':'content-effect-v2-link', checkGroup:legacy?'content-effect-check':'content-effect-v2-check'};
}
function writable(targetId: string) {
 if(targetId===LEGACY_CONTENT_TARGET && preproductionRuntime())return;
 assertContentTargetRuntime(targetId);
}
export async function readContentEffects(targetId: string = LEGACY_CONTENT_TARGET) {
 const s=scope(targetId);
 const [links,checks]=await Promise.all([s.linkGroup,s.checkGroup].map(groupName=>prisma.siteSetting.findMany({where:{groupName,settingKey:{startsWith:s.prefix}},orderBy:{createdAt:'desc'},take:200})));
 return {links:links.map(r=>r.valueJson as unknown as EffectLink),checks:checks.map(r=>r.valueJson as unknown as EffectCheck)};
}
/** No caller-supplied URL, hash or publish timestamp can create publication proof. */
async function publication(tx: Prisma.TransactionClient, targetId: string) {
 const target=getRegisteredContentTarget(targetId), prefix=target.storagePrefix;
 const [row,fenceRow]=await Promise.all([tx.siteSetting.findUnique({where:{settingKey:prefix+'state'}}),tx.siteSetting.findUnique({where:{settingKey:prefix+'fence'}})]);
 const state=row?.valueJson as unknown as ContentState | undefined;
 if(!state?.version || state.receipt!=='verified' || !state.attemptId)throw Error('只能关联当前已取得源站及公网核对回执的内容版本。');
 const [revisionRow,attemptRow]=await Promise.all([tx.siteSetting.findUnique({where:{settingKey:prefix+'revision:'+state.version}}),tx.siteSetting.findUnique({where:{settingKey:prefix+'attempt:'+state.attemptId}})]);
 const revision=revisionRow?.valueJson as unknown as Revision | undefined;
 const attempt=attemptRow?.valueJson as unknown as DistributionAttempt | undefined;
 const fence=fenceRow?.valueJson as unknown as ContentFence | undefined;
 const generation=fence?.generation ?? 0;
 if(!revision || revision.version!==state.version || !revision.content ||
    (target.id!==LEGACY_CONTENT_TARGET && (revision.targetId!==target.id || attempt?.targetId!==target.id)) ||
    createHash('sha256').update(JSON.stringify(parseOverviewContent(revision.content,target.id))).digest('hex')!==revision.hash ||
    attempt?.id!==state.attemptId || attempt.status!=='verified' || attempt.version!==state.version ||
    (attempt.fenceGeneration ?? 0)!==generation || !matchesContentDistributionEvidence(attempt.evidence,state.version,generation,target.id,hasContentFactTokens(revision.content)))throw Error('版本或发布证据不完整，不能建立效果观察。');
 const publishedAt=attempt.evidence!.public!.checkedAt;
 if(!Number.isFinite(Date.parse(publishedAt)) || Date.parse(publishedAt)>Date.now())throw Error('发布核对时间无效。');
 let factsHash: string | undefined;
 if(hasContentFactTokens(revision.content)) {
  factsHash=(await (await import('./managed-content-fact-view')).readFactContent(revision.content,target.id)).factsHash;
  if(!factsHash||factsHash!==attempt.evidence!.origin!.factsHash)throw Error('正式价格事实已切换，旧发布回执不能建立新的效果关联。');
 }
 return {state,revision,publishedAt,factsHash};
}
export async function linkContentEffect(actor: string,input: {version:number;opportunityId:string;hypothesis:string;engine:string;timezone:string},targetId: string = LEGACY_CONTENT_TARGET) {
 const s=scope(targetId);
 writable(s.target.id);
 if(!Number.isSafeInteger(input.version)||input.version<1||!/^[0-9a-f-]{36}$/i.test(input.opportunityId)||!input.hypothesis.trim()||input.hypothesis.length>500||!['google','bing'].includes(input.engine)||!['UTC','America/Los_Angeles'].includes(input.timezone))throw Error('请填写有效版本、机会、改进目标、引擎和证据时区。');
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
  const opportunity=await tx.searchOpportunity.findUnique({where:{id:input.opportunityId}});
  if(!opportunity||opportunity.kind!=='content')throw Error('请选择已登记的内容搜索机会。');
  const {state,revision,publishedAt,factsHash}=await publication(tx,s.target.id);
  if(state.version!==input.version)throw Error('内容版本已切换，请刷新后重试。');
  const key=s.prefix+'link:'+input.version+':'+opportunity.id+':'+input.engine+':'+input.timezone;
  if(await tx.siteSetting.findUnique({where:{settingKey:key}}))throw Error('此机会与版本已关联，请查看现有记录。');
  const link:EffectLink={...(s.target.id===LEGACY_CONTENT_TARGET?{}:{targetId:s.target.id}),...(factsHash?{factsHash}:{}),id:randomUUID(),version:input.version,revisionHash:revision.hash,opportunityId:opportunity.id,query:opportunity.query,hypothesis:input.hypothesis.trim(),engine:input.engine as EffectLink['engine'],timezone:input.timezone,publishedAt,createdAt:new Date().toISOString(),actor,attemptId:state.attemptId!,path:s.target.canonicalPath};
  await tx.siteSetting.create({data:{settingKey:key,groupName:s.linkGroup,label:'Content effect association',valueJson:JSON.parse(JSON.stringify(link)),isPublic:false}});
  await tx.auditLog.create({data:{actorId:actor,action:'content_effect_link',targetType:'content_effect',newValue:{id:link.id,version:link.version,opportunityId:link.opportunityId,targetId:s.target.id}}});
  return link;
 });
}
export async function captureContentEffect(actor: string,id: string,targetId: string = LEGACY_CONTENT_TARGET) {
 const s=scope(targetId);
 writable(s.target.id);
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
  const row=await tx.siteSetting.findFirst({where:{groupName:s.linkGroup,settingKey:{startsWith:s.prefix},valueJson:{path:['id'],equals:id}}});
  if(!row)throw Error('当前目标的关联记录不存在。');
  const link=row.valueJson as unknown as EffectLink;
  if(effectTarget(link).id!==s.target.id)throw Error('效果记录的目标不匹配。');
  const evidenceRow=await tx.siteSetting.findUnique({where:{settingKey:SEO_SEARCH_PAGE_IMPORT_SETTING_KEY}});
  let version=0;
  try { const p=await publication(tx,s.target.id); if(p.revision.hash===link.revisionHash && p.factsHash===link.factsHash)version=p.state.version; } catch { /* Missing/invalid current proof remains insufficient, never zero traffic. */ }
  const result=assessContentEffect(link,parseSeoSearchPageImportState(evidenceRow?.valueText).batches,version);
  if(link.factsHash && version===0)result.reason='正式价格事实或发布核对证据已变化，不能将不同事实版本合并观察。';
  const check:EffectCheck={linkId:id,...(s.target.id===LEGACY_CONTENT_TARGET?{}:{targetId:s.target.id}),at:new Date().toISOString(),actor,result};
  await tx.siteSetting.create({data:{settingKey:s.prefix+'check:'+randomUUID(),groupName:s.checkGroup,label:'Content effect evidence snapshot',valueJson:JSON.parse(JSON.stringify(check)),isPublic:false}});
  await tx.auditLog.create({data:{actorId:actor,action:'content_effect_check',targetType:'content_effect',newValue:{id,status:result.status,targetId:s.target.id}}});
  return check;
 });
}
