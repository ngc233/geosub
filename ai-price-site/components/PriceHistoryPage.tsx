import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BrandIcon from "./BrandIcon";
import PriceHistoryRadarClient from "./PriceHistoryRadarClient";
import { PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { loadPriceHistoryGlobalRadar } from "../lib/cached-price-history-radar";
import { homepageMap } from "../lib/homepage-map";
import type { RadarEventItem } from "../lib/public-map-views";
import { getPriceEvidencePreview } from "../lib/price-evidence-preview";
import { getPriceHistorySummary } from "../lib/price-records";
import { getPriceRecordProducts, getProductPriceRecords } from "../lib/price-records-data";
import { PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_REVALIDATE_SECONDS } from "../lib/public-pricing-cache";
import {
  fictionalPriceHistoryRecords,
  fictionalPriceRecordProducts,
  isHomepageFixtureEnabled,
} from "../lib/test-fixtures/homepage";
import {
  countryName,
  dateTime,
  headingClass,
  metaClass,
  mutedClass,
  PageHeading,
  Unavailable,
} from "./PriceEvidenceShared";

const previewCacheScope = () => getPriceEvidencePreview()?.capturedAt || "public";
const loadRecords = (slug: string) =>
  unstable_cache(
    async () => {
      const result = await getProductPriceRecords(slug);
      const observedCodes = [
        ...new Set(result.records.filter((row) => /^[A-Z]{2}$/.test(row.countryCode)).map((row) => row.countryCode)),
      ].sort();
      return { ...getPriceHistorySummary(result.records), observedCodes, truncated: result.truncated };
    },
    ["price-records-v4", slug, previewCacheScope()],
    {
      revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
      tags: [PUBLIC_PRICING_CACHE_TAG],
    },
  )();
const loadProducts = () =>
  unstable_cache(getPriceRecordProducts, ["price-record-products-v1", previewCacheScope()], {
    revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
    tags: [PUBLIC_PRICING_CACHE_TAG],
  })();

type HistoryProps = { locale: "zh" | "en"; slug?: string; pageClass?: string };

export async function HistoryPage(props: HistoryProps) {
  const { locale, slug } = props;
  const english = locale === "en";
  const className = "gs-public-unified gs-evidence-page gs-history-page";
  const useFixture = isHomepageFixtureEnabled();

  let products;
  try {
    products = useFixture ? fictionalPriceRecordProducts() : await loadProducts();
  } catch {
    return (
      <div className={className}>
        <PageHeading
          locale={locale}
          title={locale === "zh" ? "价格变化记录" : "Price change records"}
          description="App Store"
        />
        <Unavailable locale={locale} />
      </div>
    );
  }

  const product = slug ? products.find((item) => item.slug === slug) : null;
  if (slug && !product) notFound();

  let result = null;
  let unavailable = false;
  let globalRadar: { events: RadarEventItem[]; observedCodes: string[] } = { events: [], observedCodes: [] };

  try {
    globalRadar = await loadPriceHistoryGlobalRadar();
  } catch {
    globalRadar = { events: [], observedCodes: [] };
  }

  if (product) {
    try {
      if (useFixture) {
        const productRecords = fictionalPriceHistoryRecords().filter((row) => row.productSlug === product.slug);
        const observedCodes = [
          ...new Set(productRecords.filter((row) => /^[A-Z]{2}$/.test(row.countryCode)).map((row) => row.countryCode)),
        ].sort();
        result = { ...getPriceHistorySummary(productRecords), observedCodes, truncated: false };
      } else {
        result = await loadRecords(product.slug);
      }
    } catch {
      unavailable = true;
    }
  }

  const events = result?.events || [];
  const snapshots = result?.snapshots || [];
  const productRadarEvents: RadarEventItem[] = product
    ? events.map(({ before, after, direction, percent }) => ({
        id: after.id,
        beforeId: before.id,
        productSlug: product.slug,
        productName: product.name,
        planName: after.planName,
        countryCode: after.countryCode,
        observedAt: after.observedAt,
        beforeObservedAt: before.observedAt,
        beforeAmount: before.amount,
        afterAmount: after.amount,
        currency: after.currency,
        billingCycle: after.billingCycle,
        direction,
        percent,
      }))
    : [];

  const productEventCounts: Record<string, number> = {};
  for (const event of globalRadar.events) {
    productEventCounts[event.productSlug] = (productEventCounts[event.productSlug] ?? 0) + 1;
  }

  const sortedDirectoryProducts = [...products].sort((a, b) => {
    const countA = productEventCounts[a.slug] ?? 0;
    const countB = productEventCounts[b.slug] ?? 0;
    if (countA !== countB) return countB - countA;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={className}>
      {useFixture && (
        <aside className="gs-home-test-data" role="note">
          {english
            ? "Fictional test data · For local UI verification only, not real prices"
            : "虚构测试数据 · 仅用于本地界面验收，不代表实际价格"}
        </aside>
      )}

      {product && (
        <nav className="gs-history-breadcrumb" aria-label={english ? "Breadcrumb" : "面包屑"}>
          <Link href={`/${locale}/price-history`}>
            <ArrowLeft size={16} aria-hidden="true" />
            {english ? "All price change records" : "全部价格变化记录"}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{product.name}</span>
        </nav>
      )}

      <PageHeading
        centered={false}
        locale={locale}
        identity={product ? <BrandIcon product={product} size="lg" priority /> : undefined}
        title={`${product ? `${product.name} ` : ""}${locale === "zh" ? "价格变化记录" : "Price change records"}`}
        description={
          locale === "zh"
            ? "追踪同一套餐、地区与计费周期的 App Store 当地官方调价。每条记录均可核对原始采集快照，日常汇率浮动不计入调价。"
            : "Track local App Store price changes for the same plan, country and billing period. Each change links to its source records. Exchange-rate movements are not price changes."
        }
      />

      {!unavailable && (
        <PriceHistoryRadarClient
          locale={locale}
          map={homepageMap}
          events={product ? productRadarEvents : globalRadar.events}
          observedCodes={product ? (result?.observedCodes ?? []) : globalRadar.observedCodes}
          productName={product?.name}
          showProductColumn={!product}
        />
      )}

      {result && result.coverage.recordCount > 0 ? (
        <PublicSection className="mb-6 p-5 md:p-6">
          <h2 className={headingClass}>{locale === "zh" ? "采集覆盖说明" : "Observation coverage"}</h2>
          <p className={`mt-2 ${mutedClass}`}>
            {locale === "zh"
              ? `${result.coverage.observedDays} 个采样日 · ${result.coverage.countryCount} 个曾观测地区 · ${result.coverage.recordCount.toLocaleString()} 条观测记录`
              : `${result.coverage.observedDays} sampled days · ${result.coverage.countryCount} observed regions · ${result.coverage.recordCount.toLocaleString()} observations`}
          </p>
          <p className={`mt-2 ${metaClass}`}>
            {dateTime(result.coverage.firstObservedAt!, locale)} → {dateTime(result.coverage.lastObservedAt!, locale)}
          </p>
          <p className={`mt-2 ${metaClass}`}>
            {locale === "zh"
              ? "以上为窗口内读取到的原始采集记录；不推断两次采集之间的具体改价时刻。"
              : "Coverage describes the retrieved raw observations, including unverified records. It does not establish continuous monitoring, current availability or unchanged prices throughout the window."}
          </p>
        </PublicSection>
      ) : null}

      {unavailable ? <Unavailable locale={locale} /> : null}

      {(result?.eventCount || 0) > 100 ? (
        <p className={mutedClass}>
          {locale === "zh" ? "显示最近 100 个已确认事件。" : "Showing the latest 100 confirmed events."}
        </p>
      ) : null}

      {snapshots.length ? (
        <PublicSection className="mt-6">
          <PublicSectionHeader
            title={locale === "zh" ? "最近原始采集快照" : "Recent original observations"}
            description={
              locale === "zh"
                ? "查看采集当时保存的 App Store 套餐条目与原始价格文本。"
                : "Inspect the plan items and original price text retained at collection."
            }
          />
          <div className="divide-y divide-[var(--color-border-default)]">
            {snapshots.map((snapshot) => (
              <Link
                key={snapshot.id}
                href={`/${locale}/price-records/${snapshot.id}`}
                className="flex min-h-11 items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-bg-subtle)] md:px-6"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {countryName(snapshot.countryCode, locale)} · {snapshot.planName}
                  </span>
                  <p className={`mt-1 ${metaClass}`}>{snapshot.observedAt.slice(0, 10)} · App Store</p>
                </div>
                <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
              </Link>
            ))}
          </div>
        </PublicSection>
      ) : null}

      {sortedDirectoryProducts.length > 0 && (
        <nav
          className="gs-history-directory"
          aria-label={english ? "Browse price history by product" : "按产品查阅历史档案"}
        >
          <div className="gs-history-directory-head">
            <div>
              <h2>{english ? "Browse Price History by Product" : "按产品查阅历史档案"}</h2>
              <p>
                {english
                  ? "Open a dedicated product archive to inspect 120-day regional monitoring coverage, confirmed adjustments, and raw store snapshots."
                  : "进入单个订阅服务专页，查看该产品近 120 天的地区监测覆盖、调价轨迹与原始商店快照。"}
              </p>
            </div>
            {product && (
              <Link className="gs-history-directory-back" href={`/${locale}/price-history`}>
                <ArrowLeft size={14} aria-hidden="true" />
                {english ? "All products overview" : "全站调价总览"}
              </Link>
            )}
          </div>
          <div className="gs-history-directory-grid">
            {sortedDirectoryProducts.map((item) => {
              const count = productEventCounts[item.slug] ?? 0;
              return (
                <Link
                  key={item.slug}
                  href={`/${locale}/price-history/${item.slug}`}
                  aria-current={product?.slug === item.slug ? "page" : undefined}
                  className="gs-history-directory-tile"
                >
                  <BrandIcon product={item} size="sm" decorative className="gs-history-directory-brand" />
                  <div className="gs-history-directory-copy">
                    <strong>{item.name}</strong>
                    <small data-has-changes={count > 0 || undefined}>
                      {count > 0
                        ? english
                          ? `${count} ${count === 1 ? "change" : "changes"} in 120d`
                          : `近 120 天 ${count} 次调价`
                        : english
                          ? "Stable recently"
                          : "近期价格稳定"}
                    </small>
                  </div>
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {result ? (
        <div className={`mt-6 ${metaClass}`}>
          <p>
            {locale === "zh"
              ? "观察窗口：最近 120 天，分页读取，安全上限为最近 50,000 条观测；不推断两次采集之间的生效时刻。"
              : "Window: the last 120 days, paginated with a safety limit of 50,000 recent observations. Observation times do not establish exactly when a change took effect."}
            {result.truncated
              ? locale === "zh"
                ? " 本次已触及读取上限，当前结果不是完整历史。"
                : " The read limit was reached; this is not a complete history."
              : ""}
          </p>
          <p className="mt-2">
            {locale === "zh"
              ? "缺少周期身份、审核中断或来源改变时，不连接两次价格。"
              : "Missing period identity, review interruptions and source changes break the comparison."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
