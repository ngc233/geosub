import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, RotateCcw, ChevronDown, ShieldCheck, Info } from "lucide-react";
import { PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import CodexResetRssLink from "./CodexResetRssLink";
import CodexResetExplorer from "./CodexResetExplorer";
import legacyStyles from "./CodexResetTracker.module.css";
import unifiedStyles from "./CodexResetUnified.module.css";
import CodexResetUnifiedView from "./CodexResetUnifiedView";
import { PublicTag } from "./ui/PublicControls";
import { resetEventTone } from "../lib/codex-reset-display";
import { RESET_SCOPE_KEYS, resetEventUrl, type ResetLocale, type ResetPublicEvent, type ResetPublicResult } from "../lib/codex-reset";
import AnimatedDisclosure from "./ui/AnimatedDisclosure";
import PublicDataRetry from "./PublicDataRetry";
import { isCodexResetReadUnavailable } from "../lib/codex-reset-read-state";
import { readCodexResetPublic } from "../lib/codex-reset-store";
import {
  parseResetQuery, RESET_USAGE_GUIDANCE_URL, resetActionText, resetChangeLabel, resetCopy, resetDateTime,
  resetScopeLabels, resetScopeText, resetSiteOrigin, resetStatusLabel, resetTimeLabels, resetTimeText, resetTypeLabel,
} from "../lib/codex-reset-presentation";

const legacyControl = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 "
  + "text-sm font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 "
  + "dark:border-zinc-700 dark:hover:bg-zinc-800";
const legacyMuted = "text-sm leading-6 text-zinc-600 dark:text-zinc-300";

export function getCodexResetMetadata(locale: ResetLocale): Metadata {
  const copy = resetCopy[locale], origin = resetSiteOrigin();
  return {
    title: copy.title, description: copy.description,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `${origin}/${locale}/tools/codex-reset`,
      languages: { "zh-CN": `${origin}/zh/tools/codex-reset`, en: `${origin}/en/tools/codex-reset` },
      types: { "application/rss+xml": `${origin}/${locale}/tools/codex-reset/rss.xml` },
    },
    openGraph: { title: copy.title, description: copy.description, url: `${origin}/${locale}/tools/codex-reset` },
  };
}

function LegacyFact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0">
    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
    <dd className="mt-1 whitespace-pre-line break-words text-sm leading-6">{children}</dd>
  </div>;
}

function PublicFact({ label, children }:{label:string;children:React.ReactNode}) {
  return <div className={unifiedStyles.fact}><dt>{label}</dt><dd>{children}</dd></div>;
}

// Keep legacy English details markup while Chinese pages reuse the confirmed grid disclosure.
function ResetDisclosure({title,children,locale,className,history=false}:{title:string;children:React.ReactNode;locale:ResetLocale;className?:string;history?:boolean}) {
  if(locale==="zh")return <AnimatedDisclosure className={`${className||""} gs-codex-details`} title={title} headingLevel={3}>{children}</AnimatedDisclosure>;
  return <details className={className}><summary className={history?"min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2":undefined}>{title}{!history&&<ChevronDown size={15}/>}</summary>{children}</details>;
}

export function CodexResetEventCard({ event, locale, linkBase }: { event: ResetPublicEvent; locale: ResetLocale; linkBase?:string }) {
  const styles=locale==="zh"?unifiedStyles:legacyStyles, muted=locale==="zh"?unifiedStyles.muted:legacyMuted, control=locale==="zh"?unifiedStyles.control:legacyControl;
  const Fact=locale==="zh"?PublicFact:LegacyFact, Tag=locale==="zh"?PublicTag:"span";
  const copy = resetCopy[locale], facts = event.facts;
  const withdrawn = event.changeKind === "withdrawal";
  return <article data-codex-event={event.id} data-codex-tone={locale==="zh"?resetEventTone(event):undefined} id={`event-${event.id}`} className={styles.event} aria-labelledby={`title-${event.id}`}>
      <div className={styles.eventBody}>
        <div className={styles.eventTop}>
          <span className={styles.eventType}><RotateCcw size={14}/>{withdrawn ? copy.withdrawn : resetTypeLabel(facts, locale)}</span>
          <time dateTime={event.firstPublishedAt}>{resetDateTime(event.firstPublishedAt, locale)}</time>
        </div>
        <h2 id={`title-${event.id}`}>{withdrawn ? copy.withdrawn : facts.title[locale]}</h2>
        <p className={styles.eventSummary}>{facts.summary[locale]}</p>
        <div className={styles.eventBadges}>
          <Tag className={`${styles.badge} ${!withdrawn && facts.eventStatus === "source_confirmed_complete" ? styles.complete
            : !withdrawn && facts.eventStatus === "rolling_out" ? styles.pending : ""}`}>
            {withdrawn ? resetChangeLabel("withdrawal", locale) : resetStatusLabel(facts, locale)}
          </Tag>
          {!withdrawn && facts.scope.plans.kind !== "unknown" && <Tag className={styles.badge}>{resetScopeText(facts.scope.plans, locale)}</Tag>}
          {!withdrawn && facts.action.kind === "required" && <Tag className={styles.badge}>{copy.required}</Tag>}
          {event.claimEnded && <Tag className={styles.badge}>{copy.claimEnded}</Tag>}
          {event.history.some((revision) => revision.changeKind === "correction") && <Tag className={styles.badge}>{copy.corrected}</Tag>}
        </div>
        {!withdrawn && facts.eventType === "banked_reset_grant" && <p className={styles.grantNote}>{copy.grantNote}</p>}
        {event.evidence.some(item => item.availability !== "available" || !item.active) && <p role="status" className={styles.grantNote}>
          {event.evidence.some(item => item.availability === "removed") ? copy.sourceRemoved
            : event.evidence.some(item => item.availability === "unavailable") ? copy.sourceUnavailable : copy.sourceInactive}</p>}
        <div className={styles.eventFooter}>
          <span><ShieldCheck size={13} className="mr-1 inline"/>{locale === "zh" ? `${event.evidence.length} 个来源 · 已人工复核` : `${event.evidence.length} ${event.evidence.length === 1 ? "source" : "sources"} · Manually reviewed`}</span>
          <Link href={linkBase?`${linkBase}?event=${event.id}#event-${event.id}`:resetEventUrl(locale, event.id)}>{copy.permalink}<ExternalLink size={12}/></Link>
        </div>
        {!withdrawn && facts.action.url && facts.action.kind === "required" && <a href={facts.action.url} className={styles.action} target="_blank" rel="noopener noreferrer">{copy.actionLink}<ExternalLink size={13}/></a>}
      </div>
      <ResetDisclosure locale={locale} className={styles.eventDetails} title={locale === "zh" ? "查看详情与来源" : "Details and sources"}>
        <div className={styles.detailBody}>
        {withdrawn ? <p className={muted}>{copy.withdrawalDetail}</p> : <>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {RESET_SCOPE_KEYS.map((key) => <Fact key={key} label={resetScopeLabels[locale][key]}>
              {resetScopeText(facts.scope[key], locale)}
            </Fact>)}
            <Fact label={copy.quantity}>{facts.quantity[locale] || copy.unknown}</Fact>
            <Fact label={copy.bankable}>{facts.bankable === null ? copy.unknown : facts.bankable ? copy.yes : copy.no}</Fact>
            <Fact label={copy.action}>{resetActionText(facts, locale)}</Fact>
          </dl>
          {facts.action.instructions[locale] && <p className="whitespace-pre-line break-words text-sm leading-6">
            {facts.action.instructions[locale]}
          </p>}
          {facts.action.url && <a href={facts.action.url} className={control} target="_blank" rel="noopener noreferrer">
            {copy.actionLink}<ExternalLink aria-hidden="true" size={15}/>
          </a>}
          {facts.groups.length > 0 && <div>
            <h3 className="text-sm font-semibold">{copy.groups}</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6">
              {facts.groups.map((group, index) => <li key={index} className="break-words">
                {group.label[locale]}: {resetStatusLabel(facts, locale, group.status)}
              </li>)}
            </ul>
          </div>}
          <dl className="grid gap-x-6 gap-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(facts.times) as Array<keyof typeof facts.times>).map((key) => <Fact key={key} label={resetTimeLabels[locale][key]}>
              {resetTimeText(facts.times[key], locale)}
              {facts.times[key].precision === "instant" && facts.times[key].text[locale]
                ? <span className={`block ${muted}`}>{copy.original}: {facts.times[key].text[locale]}</span> : null}
            </Fact>)}
          </dl>
          {event.claimEnded && <p className="text-sm font-medium">{copy.claimEnded}</p>}
          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold">{copy.sources}</h3>
            <ul className="mt-3 space-y-4">
              {event.evidence.map((evidence) => <li key={evidence.id} className="min-w-0 text-sm leading-6">
                {evidence.availability !== "removed" && evidence.url ? <a
                  className="inline-flex min-h-11 max-w-full items-center gap-2 break-words underline underline-offset-4"
                  href={evidence.url} target="_blank" rel="noopener noreferrer">
                  <span>{evidence.name}</span><ExternalLink size={14} className="shrink-0" aria-hidden="true"/>
                </a> : <p>{evidence.name}</p>}
                {evidence.kind === "staff_x" && <p className={muted}>{copy.staff}</p>}
                {evidence.availability !== "available" && <p role="status" className="font-medium">
                  {evidence.availability === "removed" ? copy.sourceRemoved : copy.sourceUnavailable}
                </p>}
                {!evidence.active && <p role="status" className="font-medium">{copy.sourceInactive}</p>}
                <p className={muted}>{copy.checked}: {resetDateTime(evidence.checkedAt, locale)}</p>
                {evidence.publishedAt && <p className={muted}>{copy.sourcePublished}: {resetDateTime(evidence.publishedAt, locale)}</p>}
              </li>)}
            </ul>
          </div>
        </>}
        <dl className="grid gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 sm:grid-cols-3">
          <Fact label={copy.firstPublished}>{resetDateTime(event.firstPublishedAt, locale)}</Fact>
          <Fact label={copy.updated}>{resetDateTime(event.updatedAt, locale)}</Fact>
          <Fact label={copy.reviewed}>{resetDateTime(event.reviewedAt, locale)}</Fact>
        </dl>
        <ResetDisclosure locale={locale} history title={copy.history}>
          <ol className="space-y-3 border-l border-zinc-300 pl-4 dark:border-zinc-700">
            {event.history.map((revision) => <li key={revision.revision} className="text-sm leading-6">
              <p>{resetChangeLabel(revision.changeKind, locale)} · {resetDateTime(revision.publishedAt, locale)}</p>
              {!withdrawn && revision.note[locale] && <p className={`whitespace-pre-line break-words ${muted}`}>{revision.note[locale]}</p>}
            </li>)}
          </ol>
        </ResetDisclosure>
      </div>
      </ResetDisclosure>
  </article>;
}

export default async function CodexResetPage({ locale, searchParams }: {
  locale: ResetLocale; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseResetQuery(await searchParams);
  if (!query) notFound();
  // No cross-request cache: each read observes the currently approved snapshot and source restrictions.
  let result: ResetPublicResult;
  try { result = await readCodexResetPublic(query); } catch (error) {
    if (isCodexResetReadUnavailable(error)) return <PublicDataRetry locale={locale}/>;
    throw error;
  }
  if (!result.enabled || (query.eventId && !result.resolvedEventId)
    || (result.page > 1 && result.events.length === 0)) notFound();
  return <CodexResetResultView locale={locale} result={result} query={query}/>;
}

const isUnifiedLocale=(locale:ResetLocale):boolean=>locale==="zh";
export function CodexResetResultView({locale,result,query,previewBase}:{locale:ResetLocale;result:ResetPublicResult;query:{page:number;eventId?:string};previewBase?:string}) {
  if(isUnifiedLocale(locale)) return <CodexResetUnifiedView result={result} base={previewBase}>{result.events.map(event=><CodexResetEventCard key={event.id} event={event} locale={locale} linkBase={previewBase}/>)}</CodexResetUnifiedView>;
  const styles=legacyStyles, Fact=LegacyFact, control=legacyControl, muted=legacyMuted;
  const copy = resetCopy[locale], base = `/${locale}/tools/codex-reset`;
  const other: ResetLocale = locale === "zh" ? "en" : "zh";
  const alternate = result.resolvedEventId ? resetEventUrl(other, result.resolvedEventId)
    : `/${other}/tools/codex-reset${result.page > 1 ? `?page=${result.page}` : ""}`;
  const pages = Math.ceil(result.total / result.pageSize);
  const latest = result.events[0];
  return <div className={styles.tracker}>
    <header className={styles.hero}>
      <RotateCcw className={styles.heroMark} strokeWidth={1} aria-hidden="true"/>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={styles.eyebrow}><ShieldCheck size={14}/>{locale === "zh" ? "CODEX / 官方权益动态" : "CODEX / BENEFIT UPDATES"}</p>
        <Link href={alternate} hrefLang={other === "zh" ? "zh-CN" : "en"} className={styles.action}>
          {other === "zh" ? "中文" : "English"}
        </Link>
      </div>
      <h1>{copy.title}</h1>
      <p className={styles.description}>{locale === "zh" ? "额外重置、赠送权益与规则变化，一处查看。每条动态都有可核对的来源。"
        : "Extra resets, reset grants and rule changes in one place. Every update links back to its evidence."}</p>
      <div className={styles.heroBottom}>
        <div className={styles.latest}>
          <span className={styles.muted}>{locale === "zh" ? (result.requestedEventId ? "当前记录更新" : result.page > 1 ? "本页最近更新" : "最近更新")
            : result.requestedEventId ? "Record updated" : result.page > 1 ? "Latest on this page" : "Last updated"}</span>
          {latest ? <><time dateTime={latest.updatedAt}>{resetDateTime(latest.updatedAt, locale)}</time>
            <span className={styles.badge}>{latest.changeKind === "withdrawal" ? copy.withdrawn : resetStatusLabel(latest.facts, locale)}</span></>
            : <span>{copy.empty}</span>}
        </div>
        <div className={styles.actions}><span>{result.total} {locale === "zh" ? "条已复核记录" : "reviewed records"}</span>
          <span>· {copy.manual}</span></div>
      </div>
    </header>
    <div className={`${styles.actions} mt-4`}>
      <a className={`${styles.action} ${styles.primaryAction}`} href={RESET_USAGE_GUIDANCE_URL} target="_blank" rel="noopener noreferrer">{copy.usage}<ExternalLink size={14}/></a>
      <CodexResetRssLink locale={locale} url={`${resetSiteOrigin()}${base}/rss.xml`}/>
    </div>
    <p className={styles.notice}><Info size={14}/>{copy.disclaimer}</p>
    {result.maintenance.delayed && <p role="status" className="mb-4 text-sm font-medium">{copy.delayed}</p>}
    {result.requestedEventId && <div className="space-y-2">
      {result.requestedEventId !== result.resolvedEventId && <p className={muted}>{copy.merged}</p>}
      <Link href={base} className={control}>{copy.allEvents}</Link>
    </div>}
    {result.events.length === 0 ? <PublicSection>
      <PublicSectionHeader title={copy.empty} description={copy.emptyDetail}/>
    </PublicSection> : <CodexResetExplorer locale={locale} initialMonth={result.events[0].firstPublishedAt.slice(0, 7)}
      entries={result.events.map(event => ({ id: event.id, date: event.firstPublishedAt, type: event.facts.eventType }))}>
      {result.events.map(event => <CodexResetEventCard key={event.id} event={event} locale={locale}/>)}
    </CodexResetExplorer>}
    {!query.eventId && pages > 1 && <nav aria-label={locale === "zh" ? "事件分页" : "Event pages"}
      className="flex flex-wrap items-center justify-between gap-3">
      {result.page > 1 ? <Link href={`${base}?page=${result.page - 1}`} className={control}>{copy.previous}</Link> : <span/>}
      <p className={muted}>{copy.page} {result.page} / {pages}</p>
      {result.page < pages ? <Link href={`${base}?page=${result.page + 1}`} className={control}>{copy.next}</Link> : <span/>}
    </nav>}
    <details className={styles.maintenance}>
      <summary>{copy.manual} · {copy.lastCheck}：{result.maintenance.lastCheckedAt ? resetDateTime(result.maintenance.lastCheckedAt, locale) : copy.unchecked}</summary>
      <p className={styles.small}>{copy.noAutomatic}</p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label={copy.hours}>{result.maintenance.hours[locale] || copy.noHours}</Fact>
        <Fact label={copy.coverage}>{result.maintenance.sourceNames.join(" / ") || copy.noSources}</Fact>
      </dl>
    </details>
    <section className={styles.faq}><h2>{copy.faq}</h2><details><summary>{copy.faqQuestion}</summary><p>{copy.faqAnswer}</p></details></section>
  </div>;
}
