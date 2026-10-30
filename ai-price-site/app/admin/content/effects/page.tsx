import { requireAdmin } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/prisma';
import { contentStore } from '../../../../lib/managed-content-store';
import { readContentEffects } from '../../../../lib/content-effects-store';
import { effectWindows } from '../../../../lib/content-effects';
import { AdminCard,AdminPageHeader } from '../../../../components/admin/AdminCard';
import AdminLink from '../../../../components/admin/AdminLink';
import EffectForm from './EffectForm';
import { contentTargets, getRegisteredContentTarget } from '../../../../lib/content-target-registry';
import { LEGACY_CONTENT_TARGET, assertContentTargetRuntime } from '../../../../lib/managed-content';
export default async function EffectsPage({searchParams}:{searchParams:Promise<{target?:string}>}){
 await requireAdmin();
 const target=getRegisteredContentTarget((await searchParams).target ?? LEGACY_CONTENT_TARGET);
 let writable=true;
 try { assertContentTargetRuntime(target.id); } catch { writable=false; }
 const [state,records,opportunities]=await Promise.all([contentStore(target.id).readContentState(),readContentEffects(target.id),prisma.searchOpportunity.findMany({where:{kind:'content'},select:{id:true,query:true},orderBy:{updatedAt:'desc'},take:100})]);
 return <div className="space-y-6">
  <AdminPageHeader title="内容效果观察" description="搜索机会 → 内容版本 → 发布证据 → 效果观察。按产品与语言独立核对；本地回执不代表公网发布。"/>
  <p><AdminLink href={`/admin/content?target=${encodeURIComponent(target.id)}`} className="underline">内容版本</AdminLink> · <AdminLink href="/admin/search-demand" className="underline">搜索机会</AdminLink></p>
  <nav aria-label="效果观察目标" className="flex flex-wrap gap-3">{contentTargets.map(t=><AdminLink key={t.id} aria-current={t.id===target.id?'page':undefined} href={`/admin/content/effects?target=${encodeURIComponent(t.id)}`} className={`rounded-lg border border-[var(--color-border-default)] p-3 underline focus-visible:outline-2 ${t.id===target.id ? "bg-[var(--color-bg-subtle)] font-semibold ring-2 ring-[var(--color-focus)]" : ""}`}>{t.productSlug} · {t.locale}</AdminLink>)}</nav>
  <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-3 text-xl font-semibold">建立可追溯关联</h2><p className="mb-4">关联后保留机会、版本指纹和发布回执，不会自动把机会标为已解决。只记录同一引擎、页面与时区下发布前后各14个完整日，排除发布当天。</p>{writable&&state.receipt==='verified'&&state.version>0&&opportunities.length?<EffectForm key={target.id} targetId={target.id} version={state.version} opportunities={opportunities}/>:<p role="status">暂不能建立关联：需要当前内容版本的完整发布回执，以及已登记的内容搜索机会。不会以草稿或模拟数据代替。</p>}</AdminCard>
  {!records.links.length?<AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><p>尚无关联记录。先登记内容机会，再在版本完成发布核对后建立关联。</p></AdminCard>:records.links.map(link=>{const windows=effectWindows(link.publishedAt,link.timezone);const checks=records.checks.filter(c=>c.linkId===link.id);return <AdminCard key={link.id} className="space-y-4 break-words dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="text-xl font-semibold">{link.query} · C{String(link.version).padStart(4,'0')}</h2><p>{link.hypothesis}</p><p>{link.engine==='google'?'Google':'Bing'} · {link.path} · {link.timezone}</p><p>基线 {windows.before.start} — {windows.before.end}<br/>观察 {windows.after.start} — {windows.after.end}</p><EffectForm targetId={target.id} id={link.id}/>{!checks.length?<p>尚未保存观察。缺少数据不会显示为零。</p>:checks.map(c=><details key={c.at} className="rounded-lg border border-[var(--color-border-default)] p-3"><summary className="cursor-pointer">{c.at} · {c.result.status==='observed'?'已记录前后变化':'证据不足'} </summary><p className="my-3">{c.result.reason}</p>{(['before','after'] as const).map(key=>{const row=c.result[key];return <p key={key}>{key==='before'?'基线':'观察'}：{row?`${row.clicks} 次点击 / ${row.impressions} 次展现`:'暂无可比较证据'}</p>;})}<p>点击变化：{c.result.clickDelta===null?'暂不判断':c.result.clickDelta}</p></details>)}<details><summary className="cursor-pointer">关联凭据</summary><p>建立时间：{link.createdAt}</p><p>内容指纹：{link.revisionHash}</p>{link.factsHash?<p>正式价格事实指纹：{link.factsHash}</p>:null}<p>发布回执：{link.attemptId}</p></details></AdminCard>;})}
 </div>;
}
