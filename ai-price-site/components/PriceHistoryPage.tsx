import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowRight, ChevronDown } from "lucide-react";
import { PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import type { ProductPlan } from "../lib/public-pricing-model";
import { getPriceEvidencePreview } from "../lib/price-evidence-preview";
import { getPriceHistorySummary } from "../lib/price-records";
import { getPriceRecordProducts, getProductPriceRecords } from "../lib/price-records-data";
import { PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_REVALIDATE_SECONDS } from "../lib/public-pricing-cache";
import { countryName, dateTime, EmptyState, headingClass, linkClass, metaClass, money, mutedClass, PageHeading, PageLinks, Unavailable } from "./PriceEvidenceShared";

const gridClass = "my-6 grid gap-5 md:grid-cols-2";
const pillClass = "inline-flex items-center rounded-md bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]";

const previewCacheScope = () => getPriceEvidencePreview()?.capturedAt || "public";
const loadRecords = (slug: string) => unstable_cache(async () => {
  const result = await getProductPriceRecords(slug);
  return { ...getPriceHistorySummary(result.records), truncated: result.truncated };
}, ["price-records-v3", slug, previewCacheScope()], {
  revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS, tags: [PUBLIC_PRICING_CACHE_TAG],
})();
const loadProducts = () => unstable_cache(getPriceRecordProducts, ["price-record-products-v1", previewCacheScope()], {
  revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS, tags: [PUBLIC_PRICING_CACHE_TAG],
})();

function HistoryChangeTable({ events }: { events: Awaited<ReturnType<typeof loadRecords>>["events"] }) {
  return (
    <section className="gs-history-changes" aria-labelledby="history-changes-title">
      <h2 id="history-changes-title" className={headingClass}>已确认的调价</h2>
      <table role="table" aria-labelledby="history-changes-title">
        <thead className="sr-only"><tr>
          {["观测时间", "套餐与地区", "本币价格", "快照", "涨跌幅"].map(label => <th key={label} scope="col">{label}</th>)}
        </tr></thead>
        <tbody role="rowgroup">{events.map(({ before, after, direction, percent }) => (
          <tr key={before.id + ":" + after.id} role="row">
            <td className="gs-history-date" role="cell">
              <time dateTime={before.observedAt}>{dateTime(before.observedAt, "zh")}</time>
              {" → "}<time dateTime={after.observedAt}>{dateTime(after.observedAt, "zh")}</time>
            </td>
            <th className="gs-history-plan" scope="row" role="rowheader">
              <strong>{after.planName}</strong>
              <small>{countryName(after.countryCode, "zh")} · {getBillingCycleLabel(after.billingCycle as ProductPlan["billing"], "zh")} · App Store</small>
            </th>
            <td className="gs-history-price" role="cell">
              {money(before.amount, before.currency, "zh")} <ArrowRight size={14} aria-hidden="true" /> <strong>{money(after.amount, after.currency, "zh")}</strong>
            </td>
            <td className="gs-history-sources" role="cell">
              <Link className={linkClass} href={`/zh/price-records/${before.id}`}>变化前快照</Link>{" "}
              <Link className={linkClass} href={`/zh/price-records/${after.id}`}>变化后快照<ArrowRight size={14} aria-hidden="true" /></Link>
            </td>
            <td className="gs-history-delta" role="cell">
              <span data-direction={direction}>{direction === "increase" ? "本币涨价" : "本币降价"} {percent > 0 ? "+" : ""}{percent}%</span>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

type HistoryProps =
  | { locale: "zh"; slug?: string }
  | { locale: "en"; slug?: string; pageClass: string };

export async function HistoryPage(props: HistoryProps) {
  const { locale, slug } = props;
  const className = locale === "zh" ? "gs-public-unified gs-evidence-page gs-history-page" : props.pageClass;
  let products;
  try { products = await loadProducts(); } catch {
    return <main className={className}><PageHeading locale={locale} title={locale === "zh" ? "价格变化记录" : "Price change records"} description="App Store" /><Unavailable locale={locale} /><PageLinks locale={locale} controls={locale === "zh"} /></main>;
  }
  const product = slug ? products.find(item => item.slug === slug) : null;
  if (slug && !product) notFound();
  let result = null;
  let unavailable = false;
  if (product) {
    try { result = await loadRecords(product.slug); } catch { unavailable = true; }
  }
  const events = result?.events || [];
  const snapshots = result?.snapshots || [];
  return <main className={className}>
    <PageHeading centered locale={locale} title={`${product ? `${product.name} ` : ""}${locale === "zh" ? "价格变化记录" : "Price change records"}`}
      description={locale === "zh" ? "追踪同一套餐、地区与计费周期的 App Store 本币标价变化。每条变化均可回溯采集记录；汇率折算波动不计为调价。" : "Track local App Store price changes for the same plan, country and billing period. Each change links to its source records. Exchange-rate movements are not price changes."} />
    <PageLinks locale={locale} active="history" controls={locale === "zh"} />
    <PublicSection className="mb-6 px-5 md:px-6">
      <details open={!slug} className="group">
        <summary className={`${linkClass} flex cursor-pointer justify-between py-4`}><span>{locale === "zh" ? "选择产品" : "Choose a product"}{product ? <span className={`ms-3 ${pillClass}`}>{product.name}</span> : null}</span><ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" /></summary>
        <div className="flex flex-wrap gap-2 border-t border-[var(--color-border-default)] py-4">{products.map(item => <Link key={item.slug} href={`/${locale}/price-history/${item.slug}`} aria-current={slug === item.slug ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium ${slug === item.slug ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"}`}>{item.name}</Link>)}</div>
      </details>
    </PublicSection>
    {result && result.coverage.recordCount > 0 ? <PublicSection className="mb-6 p-5 md:p-6">
      <h2 className={headingClass}>{locale === "zh" ? "观察覆盖" : "Observation coverage"}</h2>
      <p className={`mt-2 ${mutedClass}`}>
        {locale === "zh"
          ? `${result.coverage.observedDays} 个采样日 · ${result.coverage.countryCount} 个曾观测地区 · ${result.coverage.recordCount.toLocaleString()} 条观测`
          : `${result.coverage.observedDays} sampled days · ${result.coverage.countryCount} observed regions · ${result.coverage.recordCount.toLocaleString()} observations`}
      </p>
      <p className={`mt-2 ${metaClass}`}>
        {dateTime(result.coverage.firstObservedAt!, locale)} → {dateTime(result.coverage.lastObservedAt!, locale)}
      </p>
      <p className={`mt-2 ${metaClass}`}>{locale === "zh"
        ? "以上为读取到的原始观测覆盖，包含未通过核验的记录；不代表连续监测、当前可购买或整个窗口内价格不变。"
        : "Coverage describes the retrieved raw observations, including unverified records. It does not establish continuous monitoring, current availability or unchanged prices throughout the window."}</p>
    </PublicSection> : null}
    {unavailable ? <Unavailable locale={locale} /> : product && !events.length ? <EmptyState title={result?.truncated
      ? (locale === "zh" ? "观察窗口未读取完整" : "Observation window is incomplete")
      : (locale === "zh" ? "尚无可确认的调价事件" : "No confirmed price-change events yet")}>
      {locale === "zh" ? "这不代表价格从未变化。旧记录可能未保存计费周期；我们保留原始观测，不补造缺失历史。" : "This does not mean prices have never changed. Older observations may lack a retained billing period. We preserve observations without inventing missing history."}
    </EmptyState> : null}
    {events.length > 0 && (locale === "zh" ? <HistoryChangeTable events={events} /> : <section className="mt-8" aria-label="Confirmed price changes">
      <h2 className={headingClass}>Confirmed price changes</h2>
      <div className={gridClass}>{events.slice(0, 100).map(event => <PublicSection key={`${event.before.id}:${event.after.id}`}>
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3"><h3 className={headingClass}>{event.after.planName}</h3><span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${event.direction === "decrease" ? "bg-[var(--color-price-low-soft)] text-[var(--color-price-low)]" : "bg-[var(--color-price-high-soft)] text-[var(--color-price-high)]"}`}>{event.direction === "increase" ? "Price increase" : "Price decrease"} {event.percent > 0 ? "+" : ""}{event.percent}%</span></div>
          <p className={`mt-2 ${mutedClass}`}>{countryName(event.after.countryCode, locale)} · {getBillingCycleLabel(event.after.billingCycle as ProductPlan["billing"], locale)} · App Store</p>
          <div className="mt-5 flex items-center gap-4 tabular-nums"><span className="text-lg text-[var(--color-text-secondary)]">{money(event.before.amount, event.before.currency, locale)}</span><ArrowRight size={18} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" /><span className="text-2xl font-semibold text-[var(--color-text-primary)]">{money(event.after.amount, event.after.currency, locale)}</span></div>
          <p className={`mt-3 ${metaClass}`}>{dateTime(event.before.observedAt, locale)} → {dateTime(event.after.observedAt, locale)}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 border-t border-[var(--color-border-default)] px-5 py-1 md:px-6"><Link className={linkClass} href={`/${locale}/price-records/${event.before.id}`}>Before snapshot</Link><Link className={linkClass} href={`/${locale}/price-records/${event.after.id}`}>After snapshot<ArrowRight size={14} aria-hidden="true" /></Link></div>
      </PublicSection>)}</div>
    </section>)}
    {(result?.eventCount || 0) > 100 ? <p className={mutedClass}>{locale === "zh" ? "显示最近 100 个已确认事件。" : "Showing the latest 100 confirmed events."}</p> : null}
    {snapshots.length ? <PublicSection className="mt-6">
      <PublicSectionHeader title={locale === "zh" ? "最近原始观测" : "Recent original observations"} description={locale === "zh" ? "查看当时保存的套餐条目与原始价格文本。" : "Inspect the plan items and original price text retained at collection."} />
      <div className="divide-y divide-[var(--color-border-default)]">{snapshots.map(snapshot => <Link key={snapshot.id} href={`/${locale}/price-records/${snapshot.id}`} className="flex min-h-11 items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-bg-subtle)] md:px-6">
        <div className="min-w-0"><span className="text-sm font-semibold text-[var(--color-text-primary)]">{countryName(snapshot.countryCode, locale)} · {snapshot.planName}</span><p className={`mt-1 ${metaClass}`}>{snapshot.observedAt.slice(0, 10)} · App Store</p></div><ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
      </Link>)}</div>
    </PublicSection> : null}
    {result ? <div className={`mt-6 ${metaClass}`}>
      <p>{locale === "zh" ? "观察窗口：最近 120 天，分页读取，安全上限为最近 50,000 条观测；不推断两次采集之间的生效时刻。" : "Window: the last 120 days, paginated with a safety limit of 50,000 recent observations. Observation times do not establish exactly when a change took effect."}{result.truncated ? (locale === "zh" ? " 本次已触及读取上限，当前结果不是完整历史。" : " The read limit was reached; this is not a complete history.") : ""}</p>
      <p className="mt-2">{locale === "zh" ? "缺少周期身份、审核中断或来源改变时，不连接两次价格。" : "Missing period identity, review interruptions and source changes break the comparison."}</p>
    </div> : null}
  </main>;
}
