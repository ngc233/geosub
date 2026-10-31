import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft, ArrowRight, ChevronDown, Database, ExternalLink, Globe2, History, Search } from "lucide-react";
import BrandIcon from "./BrandIcon";
import CountryIdentity from "./CountryIdentity";
import { DataNote, MetricItem, MetricStrip, PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import type { ProductPlan } from "../lib/public-pricing-model";
import { loadCountryHub } from "../lib/cached-country-hub";
import { getPriorityCountry, priorityCountries, type HubLocale } from "../lib/country-hubs";
import { getEvidencePlanHref, getPriceEvidencePreview } from "../lib/price-evidence-preview";
import { getPriceHistorySummary } from "../lib/price-records";
import { getPriceRecordProducts, getPriceSnapshotById, getProductPriceRecords } from "../lib/price-records-data";
import { PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_REVALIDATE_SECONDS } from "../lib/public-pricing-cache";
import styles from "./PriceEvidencePages.module.css";

const pageClass = `${styles.page} mx-auto max-w-6xl px-5 py-12 md:py-14`;
const mutedClass = "text-sm leading-6 text-[var(--color-text-secondary)]";
const metaClass = "text-xs leading-5 text-[var(--color-text-muted)]";
const headingClass = "text-xl font-semibold tracking-tight text-[var(--color-text-primary)]";
const linkClass = "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]";
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

export function evidenceMetadata(locale: HubLocale, path: string, title: string): Metadata {
  return { title, alternates: { canonical: `/${locale}${path}` }, robots: { index: false, follow: true } };
}
function money(amount: number, currency: string, locale: HubLocale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
function countryName(code: string, locale: HubLocale) {
  return new Intl.DisplayNames([locale === "zh" ? "zh-CN" : "en"], { type: "region" }).of(code) || code;
}
function dateTime(value: string, locale: HubLocale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
// Existing page headers vary by template. Keep this composition local; sections,
// statistics and product identity use the site's shared public components.
function PageHeading({ title, description, locale, centered = false, identity }: {
  title: string; description: string; locale: HubLocale; centered?: boolean; identity?: ReactNode;
}) {
  const preview = getPriceEvidencePreview();
  return <header className={`mb-8 ${centered ? "text-center" : ""}`}>
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
      {locale === "zh" ? "GEOSUB 订阅价格数据" : "GEOSUB SUBSCRIPTION PRICE DATA"}
    </p>
    <div className={`flex items-center gap-4 ${centered ? "justify-center" : ""}`}>
      {identity}
      <h1 className="min-w-0 text-3xl font-semibold tracking-[-0.025em] text-[var(--color-text-primary)] md:text-4xl">{title}</h1>
    </div>
    <p className={`mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)] ${centered ? "mx-auto" : ""}`}>{description}</p>
    {preview ? <aside className="mt-5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-3 text-start text-xs leading-6 text-[var(--color-text-secondary)]">
      <p className="font-semibold text-[var(--color-text-primary)]">{locale === "zh" ? "线上真实公开数据 · 只读预览" : "Live public data · read-only preview"} · {dateTime(preview.capturedAt, locale)}</p>
      <p>{locale === "zh" ? "本机副本覆盖土耳其、印度、菲律宾、日本及美国基准；历史记录也限于这五个地区。“比较所有地区”进入线上网站。" : "This local copy covers Turkey, India, the Philippines, Japan and the US baseline. History is limited to those five regions. “Compare all regions” opens the live website."}</p>
    </aside> : null}
  </header>;
}
function PageLinks({ locale, active }: { locale: HubLocale; active?: "countries" | "history" }) {
  const links = [
    { key: "countries", path: "countries", label: locale === "zh" ? "按国家找订阅" : "Browse by country", icon: Globe2 },
    { key: "history", path: "price-history", label: locale === "zh" ? "价格变化记录" : "Price change records", icon: History },
    { key: "sources", path: "data-sources", label: locale === "zh" ? "数据来源" : "Data sources", icon: Database },
  ];
  return <nav aria-label={locale === "zh" ? "价格探索" : "Explore prices"} className="mb-8 flex flex-wrap gap-x-5 border-b border-[var(--color-border-default)]">
    {links.map(({ key, path, label, icon: Icon }) => <Link key={key} href={`/${locale}/${path}`} aria-current={active === key ? "page" : undefined}
      className={`${linkClass} border-b-2 py-2 ${active === key ? "border-[var(--color-accent)] !text-[var(--color-text-primary)]" : "border-transparent"}`}>
      <Icon size={15} aria-hidden="true" />{label}
    </Link>)}
  </nav>;
}
function EmptyState({ title, children, unavailable = false }: { title: string; children: ReactNode; unavailable?: boolean }) {
  const Icon = unavailable ? Database : Search;
  return <PublicSection className="my-6 px-5 py-10 text-center md:px-6" >
    <div role={unavailable ? "status" : undefined}>
      <Icon className="mx-auto mb-4 text-[var(--color-text-muted)]" size={24} aria-hidden="true" />
      <h2 className={headingClass}>{title}</h2>
      <p className={`mx-auto mt-3 max-w-2xl ${mutedClass}`}>{children}</p>
    </div>
  </PublicSection>;
}
function Unavailable({ locale }: { locale: HubLocale }) {
  return <EmptyState unavailable title={locale === "zh" ? "暂时无法读取价格记录" : "Price records are temporarily unavailable"}>
    {locale === "zh" ? "请稍后刷新重试。读取失败不代表没有价格或没有变化。" : "Refresh later to try again. A read failure does not mean there are no prices or changes."}
  </EmptyState>;
}
export async function SnapshotPage({ id, locale }: { id: string; locale: HubLocale }) {
  let snapshot;
  try { snapshot = await getPriceSnapshotById(id); } catch {
    return <main className={pageClass}><PageHeading locale={locale} title={locale === "zh" ? "原始价格快照" : "Original price snapshot"} description="App Store" /><Unavailable locale={locale} /><PageLinks locale={locale} /></main>;
  }
  if (!snapshot) notFound();
  const path = getEvidencePlanHref(`/${locale}/${snapshot.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${snapshot.productSlug}/${snapshot.planSlug}`);
  return <main className={pageClass}>
    <div className="mb-6 flex flex-wrap gap-x-6">
      <Link className={linkClass} href={path}><ArrowLeft size={16} aria-hidden="true" />{locale === "zh" ? "返回套餐价格" : "Back to plan prices"}</Link>
      <Link className={linkClass} href={`/${locale}/price-history/${snapshot.productSlug}`}><History size={16} aria-hidden="true" />{locale === "zh" ? "查看该产品价格历史" : "View this product's price history"}</Link>
    </div>
    <PageHeading locale={locale} identity={<BrandIcon product={{ slug: snapshot.productSlug, name: snapshot.productName }} size="lg" priority />}
      title={`${snapshot.productName} · ${countryName(snapshot.countryCode, locale)}${locale === "zh" ? "原始价格快照" : " original price snapshot"}`}
      description={locale === "zh" ? "以下为采集当时保存的 App Store 套餐条目。它是历史观测，不代表当前结算价格；未采用条目不自动等于错误或不可购买。" : "These App Store items were retained at collection time. This is a historical observation, not a current checkout quote. Unselected items are not necessarily incorrect or unavailable."} />
    <PublicSection className="mb-6" >
      <PublicSectionHeader title={snapshot.planName} actions={<span className={pillClass}>App Store</span>} />
      <MetricStrip columns={3}>
        <MetricItem label={locale === "zh" ? "当时本币标价" : "Observed local price"} value={money(snapshot.amount, snapshot.currency, locale)} />
        <MetricItem label={locale === "zh" ? "采集时间" : "Collected"} value={<span className="text-sm">{dateTime(snapshot.observedAt, locale)}</span>} />
        <MetricItem label={locale === "zh" ? "计费周期" : "Billing period"} value={<span className="text-sm">{snapshot.billingCycle ? getBillingCycleLabel(snapshot.billingCycle as ProductPlan["billing"], locale) : (locale === "zh" ? "历史记录未保存周期" : "Period was not retained")}</span>} />
      </MetricStrip>
      <DataNote><a className={linkClass} href={snapshot.sourceUrl} target="_blank" rel="noreferrer">{locale === "zh" ? "查看当前官方页面" : "Open the current official page"}<ExternalLink size={15} aria-hidden="true" /></a></DataNote>
    </PublicSection>
    <PublicSection>
      <PublicSectionHeader title={locale === "zh" ? "采集时的原始套餐条目" : "Original items at collection"}
        description={locale === "zh" ? "“采用条目”表示采集器保存的名称和原始价格文本均与该行一致，不意味着其他条目已被逐一核实或排除。" : "“Selected item” means both the saved name and original price text match this row. It does not assert that every other item has been verified or excluded."} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 bg-[var(--color-bg-subtle)] px-5 py-3 text-xs text-[var(--color-text-muted)] md:px-6">
        <span>{locale === "zh" ? "原始套餐名称" : "Original item name"}</span><span className="text-right">{locale === "zh" ? "原始价格文本" : "Original price text"}</span>
      </div>
      <div className="divide-y divide-[var(--color-border-default)]">{snapshot.items.map((item, index) => <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4 px-5 py-4 text-sm md:px-6" key={index}>
        <div className="min-w-0 break-words text-[var(--color-text-primary)]">{item.name}{item.selected ? <span className="mt-1 block w-fit rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--color-accent)]">{locale === "zh" ? "采用条目" : "Selected item"}</span> : null}</div>
        <span className="min-w-0 break-words text-right font-semibold tabular-nums text-[var(--color-text-primary)]">{item.priceText}</span>
      </div>)}</div>
      {snapshot.truncated ? <DataNote>{locale === "zh" ? "条目超过展示上限，仅展示前 200 条。" : "Showing the first 200 items; the retained list is longer."}</DataNote> : null}
      <details className="group border-t border-[var(--color-border-default)] px-5 md:px-6">
        <summary className={`${linkClass} flex cursor-pointer justify-between py-3`}><span>{locale === "zh" ? "记录标识与内容校验值" : "Record ID and content checksum"}</span><ChevronDown className="shrink-0 group-open:rotate-180" size={16} aria-hidden="true" /></summary>
        <div className="pb-5"><p className="break-all font-mono text-xs leading-6 text-[var(--color-text-secondary)]">{snapshot.id}<br />SHA-256: {snapshot.contentHash}</p><p className={`mt-3 ${metaClass}`}>{locale === "zh" ? "校验值用于识别本站展示记录的内容，不是 Apple 签名或第三方认证。" : "The checksum identifies the source fields displayed here; it is not an Apple signature or independent certification."}</p></div>
      </details>
    </PublicSection>
    <div className="mt-8"><PageLinks locale={locale} /></div>
  </main>;
}

export async function HistoryPage({ locale, slug }: { locale: HubLocale; slug?: string }) {
  let products;
  try { products = await loadProducts(); } catch {
    return <main className={pageClass}><PageHeading locale={locale} title={locale === "zh" ? "价格变化记录" : "Price change records"} description="App Store" /><Unavailable locale={locale} /><PageLinks locale={locale} /></main>;
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
  return <main className={pageClass}>
    <PageHeading centered locale={locale} title={`${product ? `${product.name} ` : ""}${locale === "zh" ? "价格变化记录" : "Price change records"}`}
      description={locale === "zh" ? "追踪同一套餐、地区与计费周期的 App Store 本币标价变化。每条变化均可回溯采集记录；汇率折算波动不计为调价。" : "Track local App Store price changes for the same plan, country and billing period. Each change links to its source records. Exchange-rate movements are not price changes."} />
    <PageLinks locale={locale} active="history" />
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
    {events.length ? <section className="mt-8" aria-label={locale === "zh" ? "已确认的调价" : "Confirmed price changes"}>
      <h2 className={headingClass}>{locale === "zh" ? "已确认的调价" : "Confirmed price changes"}</h2>
      <div className={gridClass}>{events.slice(0, 100).map(event => <PublicSection key={`${event.before.id}:${event.after.id}`}>
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3"><h3 className={headingClass}>{event.after.planName}</h3><span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${event.direction === "decrease" ? "bg-[var(--color-price-low-soft)] text-[var(--color-price-low)]" : "bg-[var(--color-price-high-soft)] text-[var(--color-price-high)]"}`}>{locale === "zh" ? event.direction === "increase" ? "本币涨价" : "本币降价" : event.direction === "increase" ? "Price increase" : "Price decrease"} {event.percent > 0 ? "+" : ""}{event.percent}%</span></div>
          <p className={`mt-2 ${mutedClass}`}>{countryName(event.after.countryCode, locale)} · {getBillingCycleLabel(event.after.billingCycle as ProductPlan["billing"], locale)} · App Store</p>
          <div className="mt-5 flex items-center gap-4 tabular-nums"><span className="text-lg text-[var(--color-text-secondary)]">{money(event.before.amount, event.before.currency, locale)}</span><ArrowRight size={18} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" /><span className="text-2xl font-semibold text-[var(--color-text-primary)]">{money(event.after.amount, event.after.currency, locale)}</span></div>
          <p className={`mt-3 ${metaClass}`}>{dateTime(event.before.observedAt, locale)} → {dateTime(event.after.observedAt, locale)}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 border-t border-[var(--color-border-default)] px-5 py-1 md:px-6"><Link className={linkClass} href={`/${locale}/price-records/${event.before.id}`}>{locale === "zh" ? "变化前快照" : "Before snapshot"}</Link><Link className={linkClass} href={`/${locale}/price-records/${event.after.id}`}>{locale === "zh" ? "变化后快照" : "After snapshot"}<ArrowRight size={14} aria-hidden="true" /></Link></div>
      </PublicSection>)}</div>
    </section> : null}
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

export async function CountryIndexPage({ locale }: { locale: HubLocale }) {
  const coverage = await Promise.allSettled(priorityCountries.map(country => loadCountryHub(country.code)));
  return <main className={pageClass}>
    <PageHeading centered locale={locale} title={locale === "zh" ? "按国家找订阅" : "Browse subscriptions by country"}
      description={locale === "zh" ? "集中查看重点地区已核验的 App Store 月付订阅，比较当地标价、美国同套餐基准与采集记录。" : "Explore verified monthly App Store subscriptions in selected countries, with local prices, same-plan US comparisons and source records."} />
    <PageLinks locale={locale} active="countries" />
    <div className="mb-5 flex flex-wrap items-end justify-between gap-2"><h2 className={headingClass}>{locale === "zh" ? "重点国家与地区" : "Featured countries and regions"}</h2><span className={metaClass}>{locale === "zh" ? "当前开放 4 个地区" : "4 regions available"}</span></div>
    <div className="grid gap-5 md:grid-cols-2">{priorityCountries.map((country, index) => <PublicSection key={country.code} className="overflow-hidden shadow-sm">
      <Link href={`/${locale}/countries/${country.slug}`} className="group block hover:bg-[var(--color-bg-subtle)]">
        <div className="flex items-start gap-4 p-5 md:p-6"><CountryIdentity code={country.code} /><div className="min-w-0"><h3 className={headingClass}>{country[locale]}</h3><p className={`mt-1 ${metaClass}`}>{locale === "zh" ? country.en : country.code}</p><p className={`mt-3 ${mutedClass}`}>{locale === "zh" ? "查看已核验套餐、本币标价、比较结果与采集日期" : "View verified plans, local prices, comparisons and collection dates"}</p></div></div>
        <div className={`px-5 pb-4 tabular-nums md:px-6 ${metaClass}`}>{coverage[index].status === "fulfilled" ? (() => {
          const rows = coverage[index].value;
          const products = new Set(rows.map(row => row.productSlug)).size;
          return locale === "zh" ? `${products} 个产品 · ${rows.length} 个套餐 · AI ${rows.filter(row => row.category === "ai").length} / 流媒体 ${rows.filter(row => row.category === "streaming").length}` : `${products} products · ${rows.length} plans · AI ${rows.filter(row => row.category === "ai").length} / Streaming ${rows.filter(row => row.category === "streaming").length}`;
        })() : (locale === "zh" ? "覆盖数量暂时无法读取" : "Coverage is temporarily unavailable")}</div>
        <div className="flex min-h-11 items-center justify-between border-t border-[var(--color-border-default)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] md:px-6"><span>{locale === "zh" ? "查看地区价格" : "Explore regional prices"}</span><ArrowRight size={16} aria-hidden="true" /></div>
      </Link>
    </PublicSection>)}</div>
    <PublicSection className="mt-6"><DataNote>{locale === "zh" ? "收录范围：App Store · 月付 · 已核验。逐个套餐与美国相同套餐比较，不发布国家综合指数，也不保证跨区购买资格。" : "Scope: verified monthly App Store plans. Each plan is compared with the same US plan. This is not a national price index or a guarantee of purchase eligibility."}</DataNote></PublicSection>
  </main>;
}

export async function CountryHubPage({ countrySlug, locale }: { countrySlug: string; locale: HubLocale }) {
  const country = getPriorityCountry(countrySlug);
  if (!country) notFound();
  let rows;
  try { rows = await loadCountryHub(country.code); } catch {
    return <main className={pageClass}><PageHeading locale={locale} title={`${country[locale]}${locale === "zh" ? "订阅价格" : " subscription prices"}`} description="App Store" /><Unavailable locale={locale} /><PageLinks locale={locale} /></main>;
  }
  const productCount = new Set(rows.map(row => row.productSlug)).size;
  const comparable = rows.filter(row => row.difference !== null);
  return <main className={pageClass}>
    <Link className={`${linkClass} mb-6`} href={`/${locale}/countries`}><ArrowLeft size={16} aria-hidden="true" />{locale === "zh" ? "全部国家与地区" : "All countries and regions"}</Link>
    <PageHeading locale={locale} identity={<CountryIdentity code={country.code} />} title={`${country[locale]}${locale === "zh" ? "订阅价格" : " subscription prices"}`}
      description={locale === "zh" ? "查看当地已核验的 App Store 月付套餐，逐个比较本币标价、美元参考和美国同套餐价格。" : "Explore verified local monthly App Store plans, with local prices, USD references and same-plan US comparisons."} />
    <PageLinks locale={locale} active="countries" />
    <PublicSection>
      <PublicSectionHeader title={locale === "zh" ? "已核验价格概况" : "Verified price coverage"} actions={<span className={pillClass}>App Store · {locale === "zh" ? "月付" : "Monthly"}</span>} />
      <MetricStrip mobileColumns={2}><MetricItem label={locale === "zh" ? "收录产品" : "Products"} value={productCount} /><MetricItem label={locale === "zh" ? "已核验套餐" : "Verified plans"} value={rows.length} /><MetricItem label={locale === "zh" ? "可与美国比较" : "US-comparable plans"} value={comparable.length} /><MetricItem label={locale === "zh" ? "比美国便宜" : "Cheaper than US"} value={comparable.filter(row => row.difference! < 0).length} tone="saving" /></MetricStrip>
      <DataNote>{locale === "zh" ? "仅纳入最近 14 天内采集的已发布核验价格。样本数量只描述本站收录，不代表该国全部订阅或整体物价。" : "Includes published, verified prices collected within 14 days. Coverage describes this catalogue, not all subscriptions or the country's overall price level."}</DataNote>
    </PublicSection>
    {!rows.length ? <EmptyState title={locale === "zh" ? "暂无符合条件的套餐" : "No eligible plans currently"}>{locale === "zh" ? "缺失、过期、待审或来源证据不足的价格不参与本页。请稍后回来查看。" : "Missing, stale, pending and insufficiently sourced prices are excluded. Check back later."}</EmptyState> : null}
    {rows.length ? <nav aria-label={locale === "zh" ? "套餐分类" : "Plan categories"} className="mt-5 flex flex-wrap gap-x-6">{(["ai", "streaming"] as const).map(category => {
      const count = rows.filter(row => row.category === category).length;
      return count ? <a key={category} className={linkClass} href={`#${category}-plans`}>{category === "ai" ? (locale === "zh" ? "AI 订阅" : "AI subscriptions") : (locale === "zh" ? "流媒体订阅" : "Streaming subscriptions")} <span className={pillClass}>{count}</span><ArrowRight size={14} aria-hidden="true" /></a> : null;
    })}</nav> : null}
    {(["ai", "streaming"] as const).map(category => {
      const group = rows.filter(row => row.category === category);
      return group.length ? <section key={category} id={`${category}-plans`} className="mt-9 scroll-mt-24">
        <div className="flex items-end justify-between gap-4"><h2 className={headingClass}>{category === "ai" ? (locale === "zh" ? "AI 订阅" : "AI subscriptions") : (locale === "zh" ? "流媒体订阅" : "Streaming subscriptions")}</h2><span className={metaClass}>{group.length} {locale === "zh" ? "个套餐" : "plans"}</span></div>
        <div className={gridClass}>{group.map(row => <PublicSection key={`${row.productSlug}:${row.planSlug}`} className="shadow-sm">
          <div className="p-5 md:p-6">
            <div className="flex items-start gap-4"><BrandIcon product={{ slug: row.productSlug, name: row.productName }} size="md" /><div className="min-w-0"><h3 className={headingClass}>{row.planName}</h3><p className={`mt-1 ${metaClass}`}>{row.productName} · App Store · {locale === "zh" ? "月付" : "monthly"}</p></div></div>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
              <div><p className={metaClass}>{locale === "zh" ? "本币标价" : "Local price"}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">{money(row.amount, row.currency, locale)}</p><p className={`mt-1 tabular-nums ${metaClass}`}>{row.usd !== null ? `≈ ${money(row.usd, "USD", locale)}` : locale === "zh" ? "汇率待更新" : "FX unavailable"}</p></div>
              <p className={`max-w-full rounded-md px-2.5 py-1.5 text-xs font-semibold tabular-nums ${row.difference !== null && row.difference < 0 ? "bg-[var(--color-price-low-soft)] text-[var(--color-price-low)]" : row.difference !== null && row.difference > 0 ? "bg-[var(--color-price-high-soft)] text-[var(--color-price-high)]" : "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"}`}>
                {row.difference === null ? (locale === "zh" ? "暂无有效美国同套餐比较" : "No valid same-plan US comparison") : row.difference === 0 ? (locale === "zh" ? "接近美国基准（四舍五入为 0%）" : "Near US baseline (rounded to 0%)") : locale === "zh" ? `比美国${row.difference < 0 ? "便宜" : "贵"} ${Math.abs(row.difference)}%` : `${Math.abs(row.difference)}% ${row.difference < 0 ? "cheaper" : "higher"} than US`}
              </p>
            </div>
            <p className={`mt-4 ${metaClass}`}>{locale === "zh" ? "价格采集" : "Collected"} {row.checkedAt!.slice(0, 10)}{row.fxDate ? ` · ${locale === "zh" ? "汇率基准" : "FX date"} ${row.fxDate}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 border-t border-[var(--color-border-default)] px-5 py-1 md:px-6">
            <Link className={`${linkClass} !text-[var(--color-text-primary)]`} href={getEvidencePlanHref(`/${locale}/${category === "ai" ? "ai-pricing" : "streaming-pricing"}/${row.productSlug}/${row.planSlug}`)}>{locale === "zh" ? "比较所有地区" : "Compare all regions"}<ArrowRight size={14} aria-hidden="true" /></Link>
            {row.observationId ? <Link className={linkClass} href={`/${locale}/price-records/${row.observationId}`}>{locale === "zh" ? "原始快照" : "Original snapshot"}</Link> : <a className={linkClass} href={row.sourceUrl} rel="noreferrer" target="_blank">{locale === "zh" ? "官方来源" : "Official source"}<ExternalLink size={14} aria-hidden="true" /></a>}
            <Link className={linkClass} href={`/${locale}/price-history/${row.productSlug}`}>{locale === "zh" ? "价格历史" : "Price history"}</Link>
          </div>
        </PublicSection>)}</div>
      </section> : null;
    })}
    <PublicSection className="mt-6"><DataNote><p>{locale === "zh" ? "折算使用 18 小时内有效汇率；税费不重复加算。缺少汇率或美国同套餐价格时不生成价差。" : "Conversions require exchange rates fetched within 18 hours. Taxes are not added twice. Missing FX or same-plan US prices produce no comparison."}</p><p className="mt-2">{locale === "zh" ? "当地商店列出价格不代表其他地区账号可购买。账号、付款方式、服务覆盖与最终税费请以官方结算页为准。" : "A local listing does not confirm that another country's account can buy it. Account, payment, availability and final taxes remain subject to official checkout."}</p></DataNote></PublicSection>
  </main>;
}
