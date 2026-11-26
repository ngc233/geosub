import AuxiliaryStyles from "./AuxiliaryStyles";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ExternalLink, History } from "lucide-react";
import BrandIcon from "./BrandIcon";
import CountryIdentity from "./CountryIdentity";
import { DataNote, MetricItem, MetricStrip, PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import type { ProductPlan } from "../lib/public-pricing-model";
import { loadCountryHub } from "../lib/cached-country-hub";
import { getPriorityCountry, priorityCountries, type HubLocale } from "../lib/country-hubs";
import { getEvidencePlanHref } from "../lib/price-evidence-preview";
import { getPublicPriceSnapshot } from "../lib/price-records";
import { getPriceSnapshotById } from "../lib/price-records-data";
import { fictionalPriceHistoryRecords, isHomepageFixtureEnabled } from "../lib/test-fixtures/homepage";
import { HistoryPage as SharedHistoryPage } from "./PriceHistoryPage";
import { countryName, dateTime, EmptyState, headingClass, linkClass, metaClass, money, PageHeading, PageLinks, Unavailable } from "./PriceEvidenceShared";
import styles from "./PriceEvidencePages.module.css";

const pageClass = `${styles.page} mx-auto max-w-6xl px-5 py-12 md:py-14`;
const gridClass = "my-6 grid gap-5 md:grid-cols-2";
const pillClass = "inline-flex items-center rounded-md bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]";

export { evidenceMetadata } from "./PriceEvidenceShared";

export function HistoryPage({ slug }: { locale: "en"; slug?: string }) {
  return <SharedHistoryPage locale="en" slug={slug} pageClass={pageClass} />;
}

export async function SnapshotPage({ id, locale }: { id: string; locale: HubLocale }) {
  const unified = locale === "zh" || locale === "en";
  let snapshot;
  try {
    if (isHomepageFixtureEnabled()) {
      const fixtureMatch = fictionalPriceHistoryRecords().find((row) => row.id === id);
      snapshot = fixtureMatch ? getPublicPriceSnapshot(fixtureMatch) : await getPriceSnapshotById(id);
    } else {
      snapshot = await getPriceSnapshotById(id);
    }
  } catch {
    return (
      <div className={unified ? "gs-public-unified gs-evidence-page" : pageClass}>
        {unified && <AuxiliaryStyles kind="evidence" />}
        <PageHeading
          locale={locale}
          title={locale === "zh" ? "原始价格快照" : "Original price snapshot"}
          description="App Store"
        />
        <Unavailable locale={locale} />
        <PageLinks locale={locale} controls={unified} />
      </div>
    );
  }
  if (!snapshot) notFound();
  const path = getEvidencePlanHref(
    `/${locale}/${snapshot.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${snapshot.productSlug}/${snapshot.planSlug}`,
  );
  return (
    <div className={unified ? "gs-public-unified gs-evidence-page" : pageClass}>
      {unified && <AuxiliaryStyles kind="evidence" />}
      <div className="mb-6 flex flex-wrap gap-x-6">
        <Link className={linkClass} href={path}>
          <ArrowLeft size={16} aria-hidden="true" />
          {locale === "zh" ? "返回套餐价格" : "Back to plan prices"}
        </Link>
        <Link className={linkClass} href={`/${locale}/price-history/${snapshot.productSlug}`}>
          <History size={16} aria-hidden="true" />
          {locale === "zh" ? "查看该产品价格历史" : "View this product's price history"}
        </Link>
      </div>
      <PageHeading
        locale={locale}
        identity={<BrandIcon product={{ slug: snapshot.productSlug, name: snapshot.productName }} size="lg" priority />}
        title={`${snapshot.productName} · ${countryName(snapshot.countryCode, locale)}${locale === "zh" ? "原始价格快照" : " original price snapshot"}`}
        description={
          locale === "zh"
            ? "以下为采集当时保存的 App Store 套餐条目。它是历史观测，不代表当前结算价格；未采用条目不自动等于错误或不可购买。"
            : "These App Store items were retained at collection time. This is a historical observation, not a current checkout quote. Unselected items are not necessarily incorrect or unavailable."
        }
      />
      <PublicSection className="mb-6">
        <PublicSectionHeader title={snapshot.planName} actions={<span className={pillClass}>App Store</span>} />
        <MetricStrip columns={3}>
          <MetricItem
            label={locale === "zh" ? "当时本币标价" : "Observed local price"}
            value={money(snapshot.amount, snapshot.currency, locale)}
          />
          <MetricItem
            label={locale === "zh" ? "采集时间" : "Collected"}
            value={<span className="text-sm">{dateTime(snapshot.observedAt, locale)}</span>}
          />
          <MetricItem
            label={locale === "zh" ? "计费周期" : "Billing period"}
            value={
              <span className="text-sm">
                {snapshot.billingCycle
                  ? getBillingCycleLabel(snapshot.billingCycle as ProductPlan["billing"], locale)
                  : locale === "zh"
                    ? "历史记录未保存周期"
                    : "Period was not retained"}
              </span>
            }
          />
        </MetricStrip>
        <DataNote>
          <a className={linkClass} href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
            {locale === "zh" ? "查看当前官方页面" : "Open the current official page"}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </DataNote>
      </PublicSection>
      <PublicSection>
        <PublicSectionHeader
          title={locale === "zh" ? "采集时的原始套餐条目" : "Original items at collection"}
          description={
            locale === "zh"
              ? "“采用条目”表示采集器保存的名称和原始价格文本均与该行一致，不意味着其他条目已被逐一核实或排除。"
              : "“Selected item” means both the saved name and original price text match this row. It does not assert that every other item has been verified or excluded."
          }
        />
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 bg-[var(--color-bg-subtle)] px-5 py-3 text-xs text-[var(--color-text-muted)] md:px-6">
          <span>{locale === "zh" ? "原始套餐名称" : "Original item name"}</span>
          <span className="text-right">{locale === "zh" ? "原始价格文本" : "Original price text"}</span>
        </div>
        <div className="divide-y divide-[var(--color-border-default)]">
          {snapshot.items.map((item, index) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4 px-5 py-4 text-sm md:px-6"
              key={index}
            >
              <div className="min-w-0 break-words text-[var(--color-text-primary)]">
                {item.name}
                {item.selected ? (
                  <span className="mt-1 block w-fit rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--color-accent)]">
                    {locale === "zh" ? "采用条目" : "Selected item"}
                  </span>
                ) : null}
              </div>
              <span className="min-w-0 break-words text-right font-semibold tabular-nums text-[var(--color-text-primary)]">
                {item.priceText}
              </span>
            </div>
          ))}
        </div>
        {snapshot.truncated ? (
          <DataNote>
            {locale === "zh"
              ? "条目超过展示上限，仅展示前 200 条。"
              : "Showing the first 200 items; the retained list is longer."}
          </DataNote>
        ) : null}
        <details className="group border-t border-[var(--color-border-default)] px-5 md:px-6">
          <summary className={`${linkClass} flex cursor-pointer justify-between py-3`}>
            <span>{locale === "zh" ? "记录标识与内容校验值" : "Record ID and content checksum"}</span>
            <ChevronDown className="shrink-0 group-open:rotate-180" size={16} aria-hidden="true" />
          </summary>
          <div className="pb-5">
            <p className="break-all font-mono text-xs leading-6 text-[var(--color-text-secondary)]">
              {snapshot.id}
              <br />
              SHA-256: {snapshot.contentHash}
            </p>
            <p className={`mt-3 ${metaClass}`}>
              {locale === "zh"
                ? "校验值用于识别本站展示记录的内容，不是 Apple 签名或第三方认证。"
                : "The checksum identifies the source fields displayed here; it is not an Apple signature or independent certification."}
            </p>
          </div>
        </details>
      </PublicSection>
      <div className="mt-8">
        <PageLinks locale={locale} controls={unified} />
      </div>
    </div>
  );
}

export async function CountryIndexPage({ locale, overviewMap }: { locale: HubLocale; overviewMap?: ReactNode }) {
  const coverage = await Promise.allSettled(priorityCountries.map((country) => loadCountryHub(country.code)));
  const english = locale === "en";

  return (
    <div className="gs-public-unified gs-country-index">
      <AuxiliaryStyles kind="countryIndex" />
      <PageHeading
        centered={false}
        locale={locale}
        title={english ? "Browse subscriptions by country" : "按国家找订阅"}
        description={
          english
            ? "Explore verified monthly App Store subscriptions in selected countries, with local prices, same-plan US comparisons and source records."
            : "集中查看各地区已核验的 App Store 月付订阅，比较当地标价、美国同套餐基准与采集记录。"
        }
      />
      {overviewMap}
      <div className="gs-country-index-heading">
        <h2 className={headingClass}>
          {english ? "Featured countries and regions" : "重点国家与地区"}
        </h2>
        <span className={metaClass}>
          {english ? "Deep-dive hubs · 4 regions" : "深度核验专页 · 4 个地区"}
        </span>
      </div>
      <div className="gs-country-index-grid">
        {priorityCountries.map((country, index) => {
          const result = coverage[index];
          const rows = result.status === "fulfilled" ? result.value : null;
          const products = rows ? new Set(rows.map((row) => row.productSlug)).size : 0;
          const aiCount = rows ? rows.filter((row) => row.category === "ai").length : 0;
          const streamingCount = rows ? rows.filter((row) => row.category === "streaming").length : 0;
          const previewRows = rows
            ? rows
                .filter(
                  (row) =>
                    typeof row.planName === "string" &&
                    typeof row.productName === "string" &&
                    Number.isFinite(row.amount),
                )
                .slice(0, 4)
            : [];
          const cheaperCount = rows
            ? rows.filter((row) => typeof row.difference === "number" && row.difference < 0).length
            : 0;
          const bestSaving = previewRows.reduce<number | null>((best, row) => {
            if (typeof row.difference !== "number" || row.difference >= 0) return best;
            const pct = Math.abs(row.difference);
            return best === null || pct > best ? pct : best;
          }, null);
          const latestDate = previewRows
            .map((row) => (typeof row.checkedAt === "string" ? row.checkedAt.slice(0, 10) : ""))
            .filter(Boolean)
            .sort()
            .at(-1);

          return (
            <PublicSection key={country.code} className="gs-country-index-item">
              <Link href={`/${locale}/countries/${country.slug}`} className="gs-country-index-card">
                <div className="gs-country-index-head">
                  <div className="gs-country-index-brandline">
                    <CountryIdentity code={country.code} />
                    <div className="gs-country-index-titlewrap">
                      <div className="gs-country-index-headline">
                        <div>
                          <div className="gs-country-index-name">
                            <h3 className={headingClass}>{english ? country.en : country.zh}</h3>
                            <span className="gs-country-index-pill">
                              {english ? country.code : `${country.en} · ${country.code}`}
                            </span>
                          </div>
                          <p className="gs-country-index-stats">
                            {rows
                              ? english
                                ? `${products} products · ${rows.length} plans · AI ${aiCount} / Streaming ${streamingCount}`
                                : `${products} 个产品 · ${rows.length} 个套餐 · AI ${aiCount} / 流媒体 ${streamingCount}`
                              : english
                                ? "Coverage is temporarily unavailable"
                                : "覆盖数量暂时无法读取"}
                          </p>
                        </div>
                        {(bestSaving !== null || cheaperCount > 0) && (
                          <div className="gs-country-index-meta">
                            {bestSaving !== null && (
                              <span>{english ? `Up to ${bestSaving}% off` : `最高省 ${bestSaving}%`}</span>
                            )}
                            {cheaperCount > 0 && (
                              <span>
                                {english ? `${cheaperCount} cheaper than US` : `${cheaperCount} 款低于美区`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {previewRows.length > 0 && (
                  <div className="gs-country-index-tablewrap">
                    <table className="gs-country-index-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{english ? "Verified plan" : "已核验套餐"}</th>
                          <th>{english ? "Converted / mo" : "折合月付"}</th>
                          <th>{english ? "vs US" : "对比美国"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIndex) => {
                          const diff = typeof row.difference === "number" ? row.difference : null;
                          const isLow = diff !== null && diff < 0;
                          const isHigh = diff !== null && diff > 0;
                          const hasUsd = row.usd !== null && Number.isFinite(row.usd);
                          return (
                            <tr key={`${row.productSlug}:${row.planSlug ?? rowIndex}`}>
                              <td className="gs-country-index-rank">{rowIndex + 1}</td>
                              <td>
                                <div className="gs-country-index-plan">
                                  <BrandIcon
                                    product={{ slug: row.productSlug, name: row.productName }}
                                    size="xs"
                                    decorative
                                    className="gs-country-index-brand"
                                  />
                                  <div className="gs-country-index-plantext">
                                    <span className="gs-country-index-planname">{row.productName}</span>
                                    <span className="gs-country-index-plantier">{row.planName}</span>
                                    {rowIndex === 0 && isLow && (
                                      <span className="gs-country-index-badge is-low">
                                        {english ? "Lowest" : "低价"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div
                                  className={`gs-country-index-value${rowIndex === 0 && isLow ? " is-low" : isHigh ? " is-high" : ""}`}
                                >
                                  {hasUsd ? money(row.usd!, "USD", locale) : money(row.amount, row.currency, locale)}
                                  <span className="gs-country-index-period">{english ? "/mo" : "/月"}</span>
                                </div>
                                {hasUsd && row.currency !== "USD" && (
                                  <div className="gs-country-index-local">
                                    ≈ {money(row.amount, row.currency, locale)}
                                  </div>
                                )}
                              </td>
                              <td className="gs-country-index-comparison">
                                <span className={isLow ? "is-low" : isHigh ? "is-high" : undefined}>
                                  {diff === null
                                    ? "—"
                                    : diff === 0
                                      ? english
                                        ? "Same"
                                        : "持平"
                                      : isLow
                                        ? `−${Math.abs(diff)}%`
                                        : `+${diff}%`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="gs-country-index-foot">
                  <span className="gs-country-index-updated">
                    {latestDate
                      ? english
                        ? `Last collected: ${latestDate}`
                        : `最近采集: ${latestDate}`
                      : english
                        ? "App Store · Monthly verified"
                        : "App Store · 月付已核验"}
                  </span>
                  <span className="gs-country-index-action">
                    <span>
                      {rows && rows.length > previewRows.length
                        ? english
                          ? `View all ${rows.length} plans`
                          : `查看全部 ${rows.length} 个套餐`
                        : english
                          ? "Explore regional prices"
                          : "查看地区价格"}
                    </span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </PublicSection>
          );
        })}
      </div>
      <PublicSection className="gs-country-index-note">
        <DataNote>
          {english
            ? "Scope: verified monthly App Store plans. Each plan is compared with the same US plan. This is not a national price index or a guarantee of purchase eligibility."
            : "收录范围：App Store · 月付 · 已核验。逐个套餐与美国相同套餐比较，不发布国家综合指数，也不保证跨区购买资格。"}
        </DataNote>
      </PublicSection>
    </div>
  );
}

export async function CountryHubPage({ countrySlug, locale }: { countrySlug: string; locale: HubLocale }) {
  const country = getPriorityCountry(countrySlug);
  if (!country) notFound();
  let rows;
  try {
    rows = await loadCountryHub(country.code);
  } catch {
    return (
      <div className={pageClass}>
        <PageHeading
          locale={locale}
          title={`${country[locale]}${locale === "zh" ? "订阅价格" : " subscription prices"}`}
          description="App Store"
        />
        <Unavailable locale={locale} />
        <PageLinks locale={locale} />
      </div>
    );
  }
  const productCount = new Set(rows.map((row) => row.productSlug)).size;
  const comparable = rows.filter((row) => row.difference !== null);
  return (
    <div className={pageClass}>
      <Link className={`${linkClass} mb-6`} href={`/${locale}/countries`}>
        <ArrowLeft size={16} aria-hidden="true" />
        {locale === "zh" ? "全部国家与地区" : "All countries and regions"}
      </Link>
      <PageHeading
        locale={locale}
        identity={<CountryIdentity code={country.code} />}
        title={`${country[locale]}${locale === "zh" ? "订阅价格" : " subscription prices"}`}
        description={
          locale === "zh"
            ? "查看当地已核验的 App Store 月付套餐，逐个比较本币标价、美元参考和美国同套餐价格。"
            : "Explore verified local monthly App Store plans, with local prices, USD references and same-plan US comparisons."
        }
      />
      <PageLinks locale={locale} active="countries" />
      <PublicSection>
        <PublicSectionHeader
          title={locale === "zh" ? "已核验价格概况" : "Verified price coverage"}
          actions={<span className={pillClass}>App Store · {locale === "zh" ? "月付" : "Monthly"}</span>}
        />
        <MetricStrip mobileColumns={2}>
          <MetricItem label={locale === "zh" ? "收录产品" : "Products"} value={productCount} />
          <MetricItem label={locale === "zh" ? "已核验套餐" : "Verified plans"} value={rows.length} />
          <MetricItem label={locale === "zh" ? "可与美国比较" : "US-comparable plans"} value={comparable.length} />
          <MetricItem
            label={locale === "zh" ? "比美国便宜" : "Cheaper than US"}
            value={comparable.filter((row) => row.difference! < 0).length}
            tone="saving"
          />
        </MetricStrip>
        <DataNote>
          {locale === "zh"
            ? "仅纳入最近 14 天内采集的已发布核验价格。样本数量只描述本站收录，不代表该国全部订阅或整体物价。"
            : "Includes published, verified prices collected within 14 days. Coverage describes this catalogue, not all subscriptions or the country's overall price level."}
        </DataNote>
      </PublicSection>
      {!rows.length ? (
        <EmptyState title={locale === "zh" ? "暂无符合条件的套餐" : "No eligible plans currently"}>
          {locale === "zh"
            ? "缺失、过期、待审或来源证据不足的价格不参与本页。请稍后回来查看。"
            : "Missing, stale, pending and insufficiently sourced prices are excluded. Check back later."}
        </EmptyState>
      ) : null}
      {(["ai", "streaming"] as const).map((category) => {
        const group = rows.filter((row) => row.category === category);
        return group.length ? (
          <section key={category} id={`${category}-plans`} className="mt-9 scroll-mt-24">
            <div className="flex items-end justify-between gap-4">
              <h2 className={headingClass}>
                {category === "ai"
                  ? locale === "zh"
                    ? "AI 订阅"
                    : "AI subscriptions"
                  : locale === "zh"
                    ? "流媒体订阅"
                    : "Streaming subscriptions"}
              </h2>
              <span className={metaClass}>
                {group.length} {locale === "zh" ? "个套餐" : "plans"}
              </span>
            </div>
            <div className={gridClass}>
              {group.map((row) => (
                <PublicSection key={`${row.productSlug}:${row.planSlug}`} className="shadow-sm">
                  <div className="p-5 md:p-6">
                    <div className="flex items-start gap-4">
                      <BrandIcon product={{ slug: row.productSlug, name: row.productName }} size="md" />
                      <div className="min-w-0">
                        <h3 className={headingClass}>{row.planName}</h3>
                        <p className={`mt-1 ${metaClass}`}>
                          {row.productName} · App Store · {locale === "zh" ? "月付" : "monthly"}
                        </p>
                      </div>
                    </div>
                  </div>
                </PublicSection>
              ))}
            </div>
          </section>
        ) : null;
      })}
    </div>
  );
}
