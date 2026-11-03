import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, ExternalLink, Info } from "lucide-react";
import { PublicCard, PublicEvidence } from "./ui/PublicControls";
import CodexResetUnifiedExplorer from "./CodexResetUnifiedExplorer";
import CodexResetRssLink from "./CodexResetRssLink";
import { resetEventTone, resetHeadline } from "../lib/codex-reset-display";
import { RESET_USAGE_GUIDANCE_URL, resetCopy, resetDateTime, resetSiteOrigin, resetStatusLabel, resetTimeText } from "../lib/codex-reset-presentation";
import { resetEventUrl, type ResetPublicResult } from "../lib/codex-reset";
import styles from "./CodexResetUnified.module.css";

export default function CodexResetUnifiedView({ result, children, base = "/zh/tools/codex-reset" }:{ result:ResetPublicResult; children:ReactNode[]; base?:string }) {
  const latest=result.events[0],tone=latest?resetEventTone(latest):"neutral",copy=resetCopy.zh;
  const Icon=tone==="confirmed"?CheckCircle2:tone==="pending"||tone==="grant"?AlertCircle:Info;
  const pages=Math.ceil(result.total/result.pageSize);
  const alternate=result.resolvedEventId?resetEventUrl("en",result.resolvedEventId):`/en/tools/codex-reset${result.page>1?`?page=${result.page}`:""}`;
  const eventHref=(id:string)=>`${base}?event=${id}#event-${id}`;
  return <main className={styles.tracker} data-gs-codex="unified">
    <nav className={styles.breadcrumb} aria-label="当前位置"><Link href="/zh">GeoSub</Link><span>/</span><span>工具 / Codex 重置动态</span></nav>
    <PublicCard className={styles.hero} data-codex-tone={tone}>
      <div className={styles.heroMain}><div className={styles.heroState}>
        <h1>{copy.title}</h1><p className={styles.eyebrow}>{result.requestedEventId?"所选事件的记录状态":result.page>1?"本页最近记录的状态":"最近事件的记录状态"}</p>
        <h2 data-codex-headline><Icon aria-hidden="true"/><span>{resetHeadline(latest)}</span></h2>
        <p>{latest?latest.changeKind==="withdrawal"?copy.withdrawalDetail:latest.facts.summary.zh:copy.emptyDetail}</p>
      </div><div className={styles.effective}><p>生效时间</p><strong>{latest&&latest.changeKind!=="withdrawal"?resetTimeText(latest.facts.times.effective,"zh"):copy.unknown}</strong><p>个人周期恢复时间请查看官方用量页</p></div></div>
      <div className={styles.heroFooter}><span>{copy.independent} · {copy.manual}</span><span>共 {result.total} 条已复核记录</span><span><Clock3 aria-hidden="true"/>{copy.lastCheck}：{result.maintenance.lastCheckedAt?<time dateTime={result.maintenance.lastCheckedAt}>{resetDateTime(result.maintenance.lastCheckedAt,"zh")}</time>:copy.unchecked}</span>
        {latest&&<Link href={`#event-${latest.id}`}>查看对应记录<ArrowRight aria-hidden="true"/></Link>}</div>
    </PublicCard>
    <div className={styles.utility}><a href={RESET_USAGE_GUIDANCE_URL} target="_blank" rel="noopener noreferrer">{copy.usage}<ExternalLink aria-hidden="true"/></a><CodexResetRssLink locale="zh" url={`${resetSiteOrigin()}/zh/tools/codex-reset/rss.xml`} publicStyle/><Link href={alternate} hrefLang="en">English</Link></div>
    <p className={styles.notice}><Info aria-hidden="true"/>{copy.disclaimer}</p>
    {result.maintenance.delayed&&<PublicCard className={styles.delayed} role="status"><AlertCircle aria-hidden="true"/><div><strong>{copy.delayed}</strong><p>检查时间没有因页面加载而更新；历史记录仍保留各自的状态与来源。</p></div></PublicCard>}
    {result.requestedEventId&&<div className={styles.returnLinks}>{result.requestedEventId!==result.resolvedEventId&&<p>{copy.merged}</p>}<Link href={base}>{copy.allEvents}<ArrowRight aria-hidden="true"/></Link></div>}
    {result.events.length?<CodexResetUnifiedExplorer initialMonth={latest.firstPublishedAt.slice(0,7)} today={new Date().toISOString().slice(0,10)} entries={result.events.map(event=>({id:event.id,date:event.firstPublishedAt,type:event.facts.eventType,tone:resetEventTone(event),title:event.changeKind==="withdrawal"?copy.withdrawn:event.facts.title.zh,status:event.changeKind==="withdrawal"?copy.withdrawn:resetStatusLabel(event.facts,"zh"),href:eventHref(event.id)}))}>{children}</CodexResetUnifiedExplorer>
      :<PublicCard className={styles.empty}><h2>{copy.empty}</h2><p>{copy.emptyDetail}</p></PublicCard>}
    {!result.requestedEventId&&pages>1&&<nav className={styles.pagination} aria-label="事件分页">{result.page>1?<Link href={`${base}?page=${result.page-1}`}>{copy.previous}</Link>:<span/>}<span>{copy.page} {result.page} / {pages} · 共 {result.total} 条已复核记录</span>{result.page<pages?<Link href={`${base}?page=${result.page+1}`}>{copy.next}</Link>:<span/>}</nav>}
    <PublicCard className={styles.faq}><h2>常见问题</h2><PublicEvidence animated title={copy.faqQuestion}><p>{copy.faqAnswer}</p></PublicEvidence><PublicEvidence animated title="重置权益发放，意味着我的额度已恢复吗？"><p>{copy.grantNote} 适用范围与需要执行的操作，请核对每条记录的来源和详情。</p></PublicEvidence><PublicEvidence animated title="没有新记录，是否代表没有发生重置？"><p>{copy.emptyDetail} 本页只展示已发布、经复核的收录记录。</p></PublicEvidence></PublicCard>
    <PublicCard className={styles.maintenance}><PublicEvidence animated title="维护与检查范围"><p>{copy.noAutomatic}</p><dl><div><dt>{copy.hours}</dt><dd>{result.maintenance.hours.zh||copy.noHours}</dd></div><div><dt>{copy.coverage}</dt><dd>{result.maintenance.sourceNames.join(" / ")||copy.noSources}</dd></div></dl><p>完整人工检查时间、事件事实更新时间、首次收录时间和原文发布时间分别保留，不相互替代。</p></PublicEvidence></PublicCard>
    <footer className={styles.footer}><p>{copy.independent}。公告确认不代表个人到账。</p><Link href="/zh/ai-pricing/chatgpt/plus">查看 ChatGPT 套餐价格<ArrowRight aria-hidden="true"/></Link></footer>
  </main>;
}

export function CodexResetUnavailable() {
  return <main className={styles.tracker} data-gs-codex="missing"><PublicCard className={styles.state}><h1>{resetCopy.zh.notFound}</h1><p>{resetCopy.zh.notFoundDetail}</p><Link href="/zh">返回 GeoSub<ArrowRight aria-hidden="true"/></Link></PublicCard></main>;
}
