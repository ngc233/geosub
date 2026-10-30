import { getRegisteredContentTarget } from './content-target-registry.ts';
import type { SeoSearchPageImportBatch } from './seo-search-observation-import';
export const EFFECT_PATH='/en/ai-pricing/chatgpt';
export type EffectLink={id:string;targetId?:string;factsHash?:string;version:number;revisionHash:string;opportunityId:string;query:string;hypothesis:string;engine:'google'|'bing';timezone:string;publishedAt:string;createdAt:string;actor:string;attemptId:string;path:string};
export function effectTarget(link: Pick<EffectLink, 'targetId' | 'path'>) {
 const target=getRegisteredContentTarget(link.targetId ?? 'overview:en:chatgpt');
 if(link.path!==target.canonicalPath)throw Error('效果记录的目标与页面不匹配。');
 return target;
}
export function effectWindows(publishedAt:string,timezone:string){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(publishedAt));
 const get=(key:string)=>parts.find(p=>p.type===key)!.value;
 const day=`${get('year')}-${get('month')}-${get('day')}`;
 const offset=(n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 return {before:{start:offset(-14),end:offset(-1)},after:{start:offset(1),end:offset(14)}};
}
export function assessContentEffect(link:EffectLink,batches:SeoSearchPageImportBatch[],currentVersion:number,now=new Date()){
 const windows=effectWindows(link.publishedAt,link.timezone);
 const blocked=(reason:string)=>({status:'insufficient' as const,reason,windows,before:null,after:null,clickDelta:null});
 try { effectTarget(link); } catch { return blocked('效果记录的目标与页面不匹配。'); }
 if(currentVersion!==link.version)return blocked('内容版本已切换或回退，本观察受到其他版本影响。');
 const localToday=effectWindows(now.toISOString(),link.timezone).before.end;
 if(localToday<windows.after.end)return blocked('14个完整观察日尚未结束。');
 const pick=(w:{start:string;end:string})=>{
  const matches=batches.filter(b=>b.engine===link.engine&&b.periodStart===w.start&&b.periodEnd===w.end&&b.evidence?.sourceTimezone===link.timezone&&b.evidence.searchType==='web'&&Number.isFinite(Date.parse(b.importedAt))&&Date.parse(b.importedAt)<=now.getTime()&&effectWindows(b.importedAt,link.timezone).before.end>=w.end&&/^sha256:[a-f0-9]{64}$/.test(b.evidence.evidenceHash));
  // Conflicting evidence is not silently resolved by import order.
  const rows=matches.flatMap(b=>b.observations.filter(o=>o.path===link.path&&o.engine===link.engine&&o.periodStart===w.start&&o.periodEnd===w.end).map(o=>({batchId:b.id,evidenceHash:b.evidence!.evidenceHash,clicks:o.clicks,impressions:o.impressions,importedAt:b.importedAt})));
  if(!rows.length||rows.some(r=>!Number.isSafeInteger(r.clicks)||r.clicks<0||!Number.isSafeInteger(r.impressions)||r.impressions<r.clicks))return null;
  if(new Set(rows.map(r=>`${r.clicks}:${r.impressions}`)).size!==1)return null;
  return rows.sort((a,b)=>b.importedAt.localeCompare(a.importedAt))[0];
 };
 const before=pick(windows.before),after=pick(windows.after);
 if(!before||!after)return blocked('缺少同一页面、引擎、时区与完整等长窗口的证据，或证据冲突。缺行不当成零。');
 if(before.impressions<100||after.impressions<100)return {status:'insufficient' as const,reason:'任一窗口少于100次展现，暂不判断趋势；这只是最低展示门槛，不是显著性检验。',windows,before,after,clickDelta:null};
 return {status:'observed' as const,reason:'仅记录前后变化；排名、季节和其他变化均可能影响结果，不能据此认定因果效果。',windows,before,after,clickDelta:after.clicks-before.clicks};
}
