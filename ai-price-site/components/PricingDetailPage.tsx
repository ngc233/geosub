import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductCategory } from "@prisma/client";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Download,
  ExternalLink,
} from "lucide-react";
import BrandIcon from "./BrandIcon";
import TrackedLink from "./analytics/TrackedLink";
import ProductSidebar from "./ProductSidebar";
import ProductPlanOverview from "./ProductPlanOverview";
import PlanTabs from "./PlanTabs";
import MobileProductSwitcher from "./MobileProductSwitcher";
import {
  ProductOverviewLink,
  RelatedPlanChoices,
  RelatedPricingProducts,
} from "./PricingTopicLinks";
import PricingPlatformView from "./PricingPlatformView";
import AffordabilityComparison from "./AffordabilityComparison";
import PricingPressureSwitcher from "./PricingPressureSwitcher";
import {
  formatUsd,
  getPlanStats,
  getProductPlan,
  type ProductPlan,
} from "../lib/public-pricing-model";
import { getPricingDetailProduct } from "../lib/pricing-detail-adapter";
import {
  getPlanAffordability,
  type AffordabilityQuality,
  type BigMacBenchmark,
  type PlanAffordabilityRow,
} from "../lib/affordability";
import { getLocalizedRegionName } from "../lib/locale-format";
import { serializeJsonLd } from "../lib/json-ld";
import {
  getLatestUsdExchangeRates,
  type ExchangeRateSnapshot,
} from "../lib/exchange-rates";
import { getPricingDetailPageCopy } from "../lib/pricing-detail-page-copy";
import { getPricingPressureCopy } from "../lib/pricing-pressure-copy";
import { getPricingDetailSeoCopy } from "../lib/pricing-detail-seo-copy";
import {
  getPricingProductOverviewCopy,
  getProductOverviewDecisionPlans,
  getProductOverviewPriceFact,
} from "../lib/pricing-product-overview-copy";
import { getPlanDisplayName } from "../lib/pricing-labels";
import { getPlanSearchIntentCopy } from "../lib/plan-search-intent";
import { getProductOverviewSearchFaqs } from "../lib/product-overview-search-intent";
import {
  getPlanEditorialIndexingStatus,
  getProductEditorialContent,
} from "../lib/product-editorial-content";
import { ProductEditorialSection } from "./ProductEditorialSection";
import {
  buildPricingStructuredData,
  buildProductOverviewStructuredData,
  type PricingFaq,
} from "../lib/pricing-seo";
import {
  getPricingDetailPath,
  getPricingLanguageAlternates,
  getPricingListPath,
  getPricingPlanPath,
  stripGeoSubTitleSuffix,
} from "../lib/pricing-routes";
import {
  getProductRobotsPolicy,
  getProductSeoGateMode,
} from "../lib/product-seo-indexing-policy";
import { getProductSeoQualityAudit } from "../lib/product-seo-quality-data";
import { prisma } from "../lib/prisma";
import {
  getSiteLocaleDefinition,
  type SiteLocale,
} from "../lib/site-locale";
import {
  supportedDisplayCurrencies,
  type DisplayCurrency,
} from "../lib/display-currency";
import {
  getCountryPagePilotPath,
  getIndexApprovedCountryPagePilots,
  type CountryPagePilotLocale,
} from "../lib/country-page-pilot";
import {
  getPublicPricingProductCacheTag,
  PUBLIC_EXCHANGE_RATE_CACHE_TAG,
  PUBLIC_EXCHANGE_RATE_REVALIDATE_SECONDS,
  PUBLIC_PRICING_CACHE_TAG,
  PUBLIC_PRICING_NAVIGATION_CACHE_TAG,
  PUBLIC_PRICING_REVALIDATE_SECONDS,
} from "../lib/public-pricing-cache";

export type PricingDetailPageProps = {
  params: Promise<{
    slug: string;
    plan?: string;
  }>;
  searchParams?: Promise<{
    plan?: string;
  }>;
};

async function getProduct(slug: string, locale: SiteLocale) {
  return unstable_cache(
    () => getPricingDetailProduct(slug, locale),
    ["public-pricing-product", slug, locale],
    {
      revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
      tags: [PUBLIC_PRICING_CACHE_TAG, getPublicPricingProductCacheTag(slug)],
    },
  )();
}

function toDbProductCategory(category: string) {
  return category === "streaming" ? ProductCategory.STREAMING : ProductCategory.AI;
}

async function getProductNavItems(category: string) {
  return unstable_cache(async () => {
    const products = await prisma.product.findMany({
    where: {
      category: toDbProductCategory(category),
      status: "PUBLISHED",
      plans: {
        some: {
          status: "PUBLISHED",
          regionPrices: {
            some: {
              status: "PUBLISHED",
            },
          },
        },
      },
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      slug: true,
      name: true,
      category: true,
      logoUrl: true,
      officialUrl: true,
    },
  });

    return products.map((product) => ({
      slug: product.slug,
      name: product.name,
      category: product.category === ProductCategory.STREAMING ? "streaming" as const : "ai" as const,
      logoUrl: product.logoUrl,
      officialUrl: product.officialUrl,
    }));
  }, ["public-pricing-navigation", category], {
    revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
    tags: [PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_NAVIGATION_CACHE_TAG],
  })();
}

async function getProductSeoMeta(slug: string, locale: SiteLocale) {
  if (locale !== "zh") return null;

  return unstable_cache(
    () => prisma.seoMeta.findFirst({
      where: {
        locale: "ZH",
        status: "PUBLISHED",
        product: {
          slug,
        },
        planId: null,
        articleId: null,
        categoryId: null,
      },
    }),
    ["public-pricing-seo", slug, locale],
    {
      revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
      tags: [PUBLIC_PRICING_CACHE_TAG, getPublicPricingProductCacheTag(slug)],
    },
  )();
}

const getCachedPublicExchangeRates = unstable_cache(
  () => getLatestUsdExchangeRates(supportedDisplayCurrencies),
  ["public-pricing-exchange-rates"],
  {
    revalidate: PUBLIC_EXCHANGE_RATE_REVALIDATE_SECONDS,
    tags: [PUBLIC_EXCHANGE_RATE_CACHE_TAG],
  },
);

function getCachedPlanAffordability(productSlug: string, planSlug: string) {
  return unstable_cache(
    () => getPlanAffordability(productSlug, planSlug),
    ["public-pricing-affordability-v3", productSlug, planSlug],
    {
      revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
      tags: [
        PUBLIC_PRICING_CACHE_TAG,
        getPublicPricingProductCacheTag(productSlug),
      ],
    },
  )();
}

function getCachedProductSeoQualityAudit(productSlug: string) {
  return unstable_cache(
    () => getProductSeoQualityAudit(productSlug),
    ["public-pricing-quality", productSlug],
    {
      revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
      tags: [
        PUBLIC_PRICING_CACHE_TAG,
        getPublicPricingProductCacheTag(productSlug),
      ],
    },
  )();
}

function hasChineseText(value?: string | null) {
  return Boolean(value && /[\u3400-\u9fff]/.test(value));
}

const reportDownloadLabel: Record<SiteLocale, string> = {
  zh: "下载价格报告",
  "zh-tw": "下載價格報告",
  en: "Download price report",
  ja: "価格レポートをダウンロード",
  ko: "가격 보고서 다운로드",
  es: "Descargar informe de precios",
  tr: "Fiyat raporunu indir",
  ar: "تنزيل تقرير الأسعار",
  fr: "Télécharger le rapport de prix",
  it: "Scarica il rapporto prezzi",
  de: "Preisbericht herunterladen",
  pt: "Baixar relatório de preços",
};

function getDiffPercent(price: number, referencePrice: number) {
  if (referencePrice <= 0) return 0;
  return Math.round(((price - referencePrice) / referencePrice) * 100);
}

function getDiffText(diffPercent: number) {
  if (diffPercent === 0) return "0%";
  if (diffPercent > 0) return `+${diffPercent}%`;
  return `${diffPercent}%`;
}

function getSortedRegions(plan: ProductPlan) {
  return [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd);
}

function getReferenceRegion(plan: ProductPlan) {
  return (
    plan.regions.find((region) => region.code.toUpperCase() === "US") ||
    getSortedRegions(plan)[0]
  );
}

function PricePositionSection({
  plan,
  bigMacBenchmarks = [],
  locale,
}: {
  plan: ProductPlan;
  bigMacBenchmarks: BigMacBenchmark[];
  locale: SiteLocale;
}) {
  const copy = getPricingPressureCopy(locale).position;
  const intlLocale = getSiteLocaleDefinition(locale).intlLocale;
  const sortedRegions = getSortedRegions(plan);
  const referenceRegion = getReferenceRegion(plan);
  const referencePrice = referenceRegion.priceUsd;
  const bigMacByCountry = new Map(
    bigMacBenchmarks.map((benchmark) => [benchmark.countryCode.toUpperCase(), benchmark]),
  );
  const latestBigMacObservation = bigMacBenchmarks
    .map((benchmark) => benchmark.observedOn)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];
  const latestBigMacDate = latestBigMacObservation
    ? new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(latestBigMacObservation))
    : "-";

  const rows = sortedRegions.map((region) => {
    const diff = getDiffPercent(region.priceUsd, referencePrice);
    const normalized = Math.max(6, Math.min(100, 50 + diff / 2));
    let label = "接近基准";
    let tone = "bg-zinc-400";

    if (diff >= 80) {
      label = "明显偏贵";
      tone = "bg-rose-500";
    } else if (diff >= 20) {
      label = "偏贵";
      tone = "bg-amber-500";
    } else if (diff <= -20) {
      label = "价格友好";
      tone = "bg-emerald-500";
    }

    return {
      region,
      diff,
      label,
      tone,
      normalized,
      bigMac: bigMacByCountry.get(region.code.toUpperCase()) || null,
    };
  });
  const cheapest = rows[0];
  const mostExpensive = rows[rows.length - 1];
  const nearBaseline =
    rows.find(({ diff }) => Math.abs(diff) <= 10) ||
    rows.reduce((closest, row) =>
      Math.abs(row.diff) < Math.abs(closest.diff) ? row : closest,
    rows[0]);
  const referenceRow = rows.find(
    ({ region }) => region.code.toUpperCase() === referenceRegion.code.toUpperCase(),
  ) || nearBaseline;
  const representativeRows = rows.length <= 12
    ? rows
    : [...rows.slice(0, 6), referenceRow, ...rows.slice(-5)]
        .filter((row, index, collection) =>
          collection.findIndex((candidate) => candidate.region.code === row.region.code) === index,
        )
        .sort((a, b) => a.diff - b.diff);
  const maxAbsoluteDiff = Math.max(
    20,
    ...representativeRows.map((row) => Math.abs(row.diff)),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-100 px-5 py-5 dark:border-zinc-800 md:px-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {copy.description}
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-b border-zinc-100 px-5 py-5 dark:border-zinc-800 md:grid-cols-3 md:px-6">
        {[
          { label: copy.lowest, row: cheapest, helper: copy.lowestHint },
          { label: copy.nearBase, row: nearBaseline, helper: copy.baseHint(referenceRegion.country) },
          { label: copy.highest, row: mostExpensive, helper: copy.highestHint },
        ].map(({ label, row, helper }) => (
          <div key={label} className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="text-xs font-medium text-zinc-400">{label}</div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-zinc-950 dark:text-white">
                  {row.region.country}
                </div>
                <div className="mt-1 text-xs text-zinc-400">{row.region.code}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
                  {formatUsd(row.region.priceUsd)}
                </div>
                <div className={["mt-1 text-xs font-medium tabular-nums", row.diff > 0 ? "text-rose-600" : row.diff < 0 ? "text-emerald-700" : "text-zinc-500"].join(" ")}>
                  {getDiffText(row.diff)}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{helper}</div>
            <div className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {row.bigMac
                ? copy.bigMac(new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(row.region.priceUsd / row.bigMac.priceUsd), row.bigMac.usesRegionalReference)
                : copy.noBigMac}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-5 md:px-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-950 dark:text-white">{copy.chartTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {copy.chartDescription(referenceRegion.country)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#84cc16]" />{copy.lowEnd}</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-950 dark:bg-white" />{copy.usBase}</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#c56550]" />{copy.highEnd}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-[72px_minmax(0,1fr)_70px] items-center gap-3 border-b border-zinc-100 bg-zinc-50/70 px-3 py-2 text-[11px] font-medium text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/40 sm:grid-cols-[150px_minmax(0,1fr)_120px]">
            <span>{copy.region}</span>
            <span className="flex justify-between"><span>{copy.cheaper}</span><span>{copy.usBase} 0%</span><span>{copy.pricier}</span></span>
            <span className="text-right">{copy.priceDiff}</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {representativeRows.map(({ region, diff, bigMac }) => {
              const position = 50 + (diff / maxAbsoluteDiff) * 44;
              const code = region.code.toUpperCase();
              const isCheapest = code === cheapest.region.code.toUpperCase();
              const isMostExpensive = code === mostExpensive.region.code.toUpperCase();
              const isReference = code === referenceRegion.code.toUpperCase();
              const pointTone = isCheapest
                ? "bg-[#84cc16] ring-lime-500/20"
                : isMostExpensive
                  ? "bg-[#c56550] ring-[#c56550]/20"
                  : isReference
                    ? "bg-zinc-950 ring-zinc-950/15 dark:bg-white"
                    : "bg-zinc-400 ring-zinc-400/15";

              return (
                <div key={`price-position-${code}`} className="grid min-h-12 grid-cols-[72px_minmax(0,1fr)_70px] items-center gap-3 px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)_120px]">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200 sm:text-sm">{region.country}</div>
                    <div className="text-[10px] text-zinc-400">{code}</div>
                  </div>

                  <div className="relative h-5" title={`${region.country}：${getDiffText(diff)}`}>
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-zinc-200 dark:bg-zinc-700" />
                    <div className="absolute bottom-0 top-0 left-1/2 border-l border-zinc-300 dark:border-zinc-600" />
                    <span
                      className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ${pointTone}`}
                      style={{ left: `${Math.max(6, Math.min(94, position))}%` }}
                    />
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-white sm:text-sm">{formatUsd(region.priceUsd)}</div>
                    <div className="text-[10px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">{getDiffText(diff)}</div>
                  </div>

                  <div className="col-start-2 col-end-4 -mt-1 text-[10px] text-zinc-400 sm:hidden">
                    {bigMac ? copy.bigMac(new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(region.priceUsd / bigMac.priceUsd), bigMac.usesRegionalReference) : copy.noBigMac}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {rows.length > representativeRows.length ? (
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            {copy.limited(representativeRows.length, rows.length)}
          </p>
        ) : null}
      </div>
      <div className="border-t border-zinc-100 px-5 py-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:px-6">
        {copy.source(latestBigMacDate)}{" "}<a className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200" href="https://github.com/TheEconomist/big-mac-data" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </section>
  );
}

function PriceBurdenMatrix({ rows, locale }: { rows: PlanAffordabilityRow[]; locale: SiteLocale }) {
  const copy = getPricingPressureCopy(locale).matrix;
  const maxBurden = Math.max(1, ...rows.map((row) => row.burdenVsUs));
  const minDiff = Math.min(...rows.map((row) => row.diffVsUsPercent));
  const maxDiff = Math.max(...rows.map((row) => row.diffVsUsPercent));
  const diffRange = Math.max(20, maxDiff - minDiff);
  const xMin = minDiff - diffRange * 0.08;
  const xMax = maxDiff + diffRange * 0.08;
  const highestBurden = [...rows].sort((a, b) => b.burdenVsUs - a.burdenVsUs)[0];
  const lowestBurden = [...rows].sort((a, b) => a.burdenVsUs - b.burdenVsUs)[0];
  const cheapest = [...rows].sort((a, b) => a.diffVsUsPercent - b.diffVsUsPercent)[0];
  const mostExpensive = [...rows].sort((a, b) => b.diffVsUsPercent - a.diffVsUsPercent)[0];
  const highlighted = new Set([
    "US",
    highestBurden.countryCode.toUpperCase(),
    lowestBurden.countryCode.toUpperCase(),
    cheapest.countryCode.toUpperCase(),
    mostExpensive.countryCode.toUpperCase(),
  ]);
  const quadrants = [
    {
      ...copy.quadrants[0],
      count: rows.filter((row) => row.diffVsUsPercent < 0 && row.burdenVsUs <= 1).length,
    },
    {
      ...copy.quadrants[1],
      count: rows.filter((row) => row.diffVsUsPercent < 0 && row.burdenVsUs > 1).length,
    },
    {
      ...copy.quadrants[2],
      count: rows.filter((row) => row.diffVsUsPercent >= 0 && row.burdenVsUs <= 1).length,
    },
    {
      ...copy.quadrants[3],
      count: rows.filter((row) => row.diffVsUsPercent >= 0 && row.burdenVsUs > 1).length,
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-100 px-5 py-5 dark:border-zinc-800 md:px-6">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">{copy.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-5 px-5 py-5 md:px-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
        <div
          className="relative h-[360px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/40"
          role="img"
          aria-label={copy.ariaLabel}
        >
          <div className="absolute inset-y-0 border-l border-zinc-300 dark:border-zinc-700" style={{ left: `${((0 - xMin) / (xMax - xMin)) * 100}%` }} />
          <div className="absolute inset-x-0 border-t border-zinc-300 dark:border-zinc-700" style={{ bottom: `${Math.min(94, (1 / maxBurden) * 100)}%` }} />
          <span className="absolute left-3 top-3 text-[11px] font-medium text-zinc-400">{copy.heavier}</span>
          <span className="absolute bottom-3 left-3 text-[11px] font-medium text-zinc-400">{copy.lowerPrice}</span>
          <span className="absolute bottom-3 right-3 text-[11px] font-medium text-zinc-400">{copy.higherPrice}</span>

          {rows.map((row) => {
            const code = row.countryCode.toUpperCase();
            const x = ((row.diffVsUsPercent - xMin) / (xMax - xMin)) * 100;
            const y = Math.max(6, Math.min(94, (row.burdenVsUs / maxBurden) * 100));
            const isHighlighted = highlighted.has(code);
            const tone = code === "US"
              ? "bg-zinc-950 ring-zinc-950/15 dark:bg-white"
              : row.diffVsUsPercent < 0
                ? "bg-[#84cc16] ring-lime-500/20"
                : "bg-[#c56550] ring-[#c56550]/20";
            const country = getLocalizedRegionName(code, locale) || row.countryNameZh || code;

            return (
              <span
                key={`pressure-matrix-${row.planSlug}-${code}`}
                className="absolute -translate-x-1/2 translate-y-1/2"
                style={{ left: `${x}%`, bottom: `${y}%` }}
                title={copy.pointTitle(country, getDiffText(row.diffVsUsPercent), row.burdenVsUs.toFixed(2))}
              >
                <span className={`block rounded-full ring-4 ${tone} ${isHighlighted ? "size-3" : "size-2 opacity-75"}`} />
                {isHighlighted ? (
                  <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {code}
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>

        <div className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {quadrants.map((quadrant) => (
            <div key={quadrant.title} className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{quadrant.title}</h3>
                <span className="text-lg font-semibold tabular-nums text-zinc-950 dark:text-white">{quadrant.count}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{quadrant.helper}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100 px-5 py-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:px-6">
        {copy.note}
      </div>
    </section>
  );
}

function getAffordabilityUnavailableReason(quality: AffordabilityQuality, locale: SiteLocale) {
  const copy = getPricingPressureCopy(locale).pending;
  if (quality.reasons.includes("no_computed_rows")) {
    return copy.noRows;
  }
  if (quality.reasons.includes("insufficient_coverage")) {
    return copy.coverage(quality.coveredRegions, quality.publishedRegions);
  }
  if (quality.reasons.includes("missing_us_baseline")) {
    return copy.noUs;
  }
  if (quality.reasons.includes("stale_income_data")) {
    return copy.stale;
  }
  return copy.generic;
}

function FaqSection({
  title,
  faqs,
}: {
  title: string;
  faqs: PricingFaq[];
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-100 px-5 py-4 md:px-6 dark:border-zinc-800">
        <h2 className="text-xl font-semibold leading-tight text-zinc-950 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {faqs.map((faq, index) => (
          <details
            key={faq.q}
            className="group px-5 py-4 md:px-6"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-zinc-950 dark:text-white">
              {faq.q}
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
                strokeWidth={1.8}
              />
            </summary>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function NoPublishedPricesSection({
  copy,
}: {
  copy: ReturnType<typeof getPricingDetailPageCopy>["empty"];
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {copy.eyebrow}
        </div>

        <h2 className="mt-2 text-2xl font-semibold leading-tight text-zinc-950 dark:text-white">
          {copy.title}
        </h2>

        <p className="mt-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
          {copy.description}
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="text-xs font-semibold text-zinc-400">{copy.status}</div>
          <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
            {copy.statusValue}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="text-xs font-semibold text-zinc-400">{copy.source}</div>
          <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
            App Store
          </div>
        </div>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="text-xs font-semibold text-zinc-400">{copy.condition}</div>
          <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
            {copy.conditionValue}
          </div>
        </div>
      </div>
    </section>
  );
}

export async function getPricingDetailMetadata({
  params,
  searchParams,
  locale,
}: PricingDetailPageProps & { locale: SiteLocale }): Promise<Metadata> {
  const { slug, plan: routePlanSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const productSeoGateMode = getProductSeoGateMode();
  const [product, seoMeta, qualityAudit] = await Promise.all([
    getProduct(slug, locale),
    getProductSeoMeta(slug, locale),
    productSeoGateMode === "enforce"
      ? getCachedProductSeoQualityAudit(slug)
      : Promise.resolve(null),
  ]);

  if (!product) {
    const fallbackCopy = getPricingDetailPageCopy({
      locale,
      productName: "",
      planName: "",
      stats: null,
    });

    return {
      title: fallbackCopy.metadataFallbackTitle,
    };
  }

  const routePlan = routePlanSlug
    ? product.plans.find(
        (plan) => plan.slug === routePlanSlug && plan.regions.length > 0,
      )
    : null;

  if (routePlanSlug && !routePlan) {
    return {
      title: product.name,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const productCanonicalPath = getPricingDetailPath(
    locale,
    product.category,
    product.slug,
  );
  const isProductOverview = !routePlanSlug;

  if (isProductOverview) {
    const publishedPlans = product.plans.filter(
      (plan) => plan.regions.length > 0,
    );
    const regionCount = new Set(
      publishedPlans.flatMap((plan) =>
        plan.regions.map((region) => region.code),
      ),
    ).size;
    const overviewCopy = getPricingProductOverviewCopy({
      locale,
      productName: product.name,
      planCount: getProductOverviewDecisionPlans(product).length,
      regionCount,
      lowest: getProductOverviewPriceFact(product),
    });
    const hasOverviewEditorial = publishedPlans.some((plan) =>
      Boolean(getProductEditorialContent(locale, product.slug, plan.slug)),
    );
    const configuredTitle = hasChineseText(seoMeta?.title)
      ? stripGeoSubTitleSuffix(seoMeta?.title || "")
      : "";
    const title =
      locale === "zh" && configuredTitle && !hasOverviewEditorial
        ? configuredTitle
        : overviewCopy.metadataTitle;
    const description =
      locale === "zh" &&
      hasChineseText(seoMeta?.description) &&
      !hasOverviewEditorial
        ? seoMeta?.description || overviewCopy.description
        : overviewCopy.description;
    const robots = getProductRobotsPolicy(
      locale,
      qualityAudit?.status ||
        (productSeoGateMode === "enforce" ? "hold" : "indexable"),
      productSeoGateMode,
      "current",
    );

    return {
      title,
      description,
      robots,
      alternates: {
        canonical: productCanonicalPath,
        ...(robots.index
          ? {
              languages: getPricingLanguageAlternates(
                locale,
                product.category,
                product.slug,
              ),
            }
          : {}),
      },
      openGraph: {
        type: "website",
        title,
        description,
        url: productCanonicalPath,
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  }

  const activePlan =
    routePlan || getProductPlan(product, resolvedSearchParams.plan);
  const stats =
    activePlan.regions.length > 0 ? getPlanStats(activePlan) : null;
  const pageCopy = getPricingDetailPageCopy({
    locale,
    productName: product.name,
    planName: activePlan.name,
    stats,
  });
  const seoCopy = getPricingDetailSeoCopy({
    locale,
    productName: product.name,
    planName: activePlan.name,
    stats,
    regionCount: activePlan.regions.length,
  });
  const editorialContent = getProductEditorialContent(
    locale,
    product.slug,
    activePlan.slug,
  );
  const searchIntentCopy = getPlanSearchIntentCopy({
    locale,
    displayName: getPlanDisplayName(product.name, activePlan.name),
    productName: product.name,
    regionCount: activePlan.regions.length,
    lowestCountry: stats?.minRegion.country,
    lowestPrice: stats ? formatUsd(stats.minRegion.priceUsd) : null,
    content: editorialContent,
  });
  const canonicalPath = getPricingPlanPath(
    locale,
    product.category,
    product.slug,
    activePlan.slug,
  );
  const configuredTitle = hasChineseText(seoMeta?.title)
    ? stripGeoSubTitleSuffix(seoMeta?.title || "")
    : "";
  const hasSinglePublishedPlan =
    product.plans.filter((plan) => plan.regions.length > 0).length === 1;

  const title =
    locale === "zh" && configuredTitle && hasSinglePublishedPlan
      ? configuredTitle
      : seoCopy.title;
  const description =
    locale === "zh" &&
    hasChineseText(seoMeta?.description) &&
    hasSinglePublishedPlan
      ? seoMeta?.description || pageCopy.description
      : searchIntentCopy?.description || seoCopy.description;
  const robots = getProductRobotsPolicy(
    locale,
    qualityAudit?.status ||
      (productSeoGateMode === "enforce" ? "hold" : "indexable"),
    productSeoGateMode,
    getPlanEditorialIndexingStatus(product.slug, activePlan.slug),
  );

  return {
    title,
    description,
    robots,
    alternates: {
      canonical: canonicalPath,
      ...(robots.index
        ? {
            languages: getPricingLanguageAlternates(
              locale,
              product.category,
              product.slug,
              activePlan.slug,
            ),
          }
        : {}),
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalPath,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function CountryAnalysisLinks({
  locale,
  productSlug,
  category,
}: {
  locale: SiteLocale;
  productSlug: string;
  category: "ai" | "streaming";
}) {
  if (locale !== "zh" && locale !== "en") return null;

  const pilotLocale: CountryPagePilotLocale = locale;
  const pilots = getIndexApprovedCountryPagePilots().filter(
    (pilot) =>
      pilot.productSlug === productSlug && pilot.category === category,
  );

  if (pilots.length === 0) return null;

  const copy = locale === "zh"
    ? {
        title: "地区价格分析",
        description:
          "查看已经完成价格与来源复核的重点地区，了解本币变化、套餐结构和购买前需要确认的条件。",
        action: "查看完整分析",
      }
    : {
        title: "Regional price analysis",
        description:
          "Explore reviewed regional pages covering local-price changes, plan structure and conditions to confirm before subscribing.",
        action: "Read the full analysis",
      };

  return (
    <section className="border-y border-zinc-200 py-6 dark:border-zinc-800">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
          {copy.title}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {copy.description}
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {pilots.map((pilot) => (
          <TrackedLink
            key={`${pilot.productSlug}-${pilot.countryCode}`}
            href={getCountryPagePilotPath(pilot, pilotLocale)}
            eventKey="click_country"
            eventName="Open regional price analysis"
            buttonKey={`${pilot.productSlug}:${pilot.countryCode}`}
            countryId={pilot.countryCode}
            placement="product_country_analysis"
            className="group flex min-w-0 items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-800"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-950 dark:text-white">
                {pilot.title[pilotLocale]}
              </span>
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                {pilot.countryName[pilotLocale]} · {copy.action}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700 rtl:rotate-180 dark:group-hover:text-zinc-200"
              strokeWidth={1.8}
            />
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}

export default async function PricingDetailPage({
  params,
  searchParams,
  locale,
  routeCategory,
}: PricingDetailPageProps & {
  locale: SiteLocale;
  routeCategory: "ai" | "streaming";
}) {
  const { slug, plan: routePlanSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [product, seoMeta] = await Promise.all([
    getProduct(slug, locale),
    getProductSeoMeta(slug, locale),
  ]);

  if (!product) {
    notFound();
  }

  const routePlan = routePlanSlug
    ? product.plans.find(
        (plan) => plan.slug === routePlanSlug && plan.regions.length > 0,
      )
    : null;

  if (routePlanSlug && !routePlan) {
    notFound();
  }

  const detailBasePath = getPricingListPath(locale, product.category);
  const productCanonicalPath = getPricingDetailPath(
    locale,
    product.category,
    product.slug,
  );

  if (product.category !== routeCategory) {
    permanentRedirect(
      routePlan
        ? getPricingPlanPath(
            locale,
            product.category,
            product.slug,
            routePlan.slug,
          )
        : productCanonicalPath,
    );
  }

  if (resolvedSearchParams.plan) {
    permanentRedirect(productCanonicalPath);
  }

  const sidebarProducts = await getProductNavItems(product.category);

  if (!routePlanSlug) {
    const publishedPlans = product.plans.filter(
      (plan) => plan.regions.length > 0,
    );
    const regionCount = new Set(
      publishedPlans.flatMap((plan) =>
        plan.regions.map((region) => region.code),
      ),
    ).size;
    const overviewCopy = getPricingProductOverviewCopy({
      locale,
      productName: product.name,
      planCount: getProductOverviewDecisionPlans(product).length,
      regionCount,
      lowest: getProductOverviewPriceFact(product),
    });
    const hasOverviewEditorial = publishedPlans.some((plan) =>
      Boolean(getProductEditorialContent(locale, product.slug, plan.slug)),
    );
    const pageTitle =
      locale === "zh" &&
      hasChineseText(seoMeta?.h1) &&
      !hasOverviewEditorial
        ? seoMeta?.h1 || overviewCopy.pageTitle
        : overviewCopy.pageTitle;
    const pageDescription =
      locale === "zh" &&
      hasChineseText(seoMeta?.description) &&
      !hasOverviewEditorial
        ? seoMeta?.description || overviewCopy.description
        : overviewCopy.description;
    const overviewFaqs = getProductOverviewSearchFaqs({ locale, product });
    const structuredData = buildProductOverviewStructuredData({
      locale,
      path: productCanonicalPath,
      title: pageTitle,
      description: pageDescription,
      product,
      faqs: overviewFaqs,
    });
    const pageCopy = getPricingDetailPageCopy({
      locale,
      productName: product.name,
      planName: "",
      stats: null,
    });

    return (
      <main className="mx-auto flex max-w-6xl gap-5 px-5 py-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
        <ProductSidebar
          products={sidebarProducts}
          currentSlug={product.slug}
          basePath={detailBasePath}
          locale={locale}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-3">
            <Link
              href={detailBasePath}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5 shrink-0 rtl:rotate-180" strokeWidth={1.8} />
              {pageCopy.backToPricing}
            </Link>

            <MobileProductSwitcher
              products={sidebarProducts}
              currentSlug={product.slug}
              basePath={detailBasePath}
              locale={locale}
            />
          </div>

          <section className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div className="flex items-start gap-3">
              <BrandIcon
                product={{
                  slug: product.slug,
                  name: product.name,
                  logoUrl: product.logoUrl,
                  officialUrl: product.officialUrl,
                }}
                size="md"
                priority
              />
              <div>
                <div className="text-sm font-medium text-zinc-400">
                  {product.brand}
                </div>
                <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950 md:text-[30px] dark:text-white">
                  {pageTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-[15px] leading-6 text-zinc-600 dark:text-zinc-300">
                  {pageDescription}
                </p>
                {product.officialUrl ? (
                  <TrackedLink
                    href={product.officialUrl}
                    eventKey="click_official"
                    eventName="Open official website"
                    buttonKey={product.slug}
                    placement="product_overview_hero"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-zinc-200 hover:text-zinc-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {pageCopy.visitOfficial}
                    <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
                  </TrackedLink>
                ) : null}
              </div>
            </div>
          </section>

          <ProductPlanOverview product={product} locale={locale} />

          <CountryAnalysisLinks
            locale={locale}
            productSlug={product.slug}
            category={product.category}
          />

          <RelatedPricingProducts
            locale={locale}
            category={product.category}
            products={sidebarProducts}
            currentSlug={product.slug}
            basePath={detailBasePath}
          />

          {overviewFaqs.length > 0 ? (
            <FaqSection title={pageCopy.faqTitle} faqs={overviewFaqs} />
          ) : null}
        </div>
      </main>
    );
  }

  const activePlan =
    routePlan || getProductPlan(product, resolvedSearchParams.plan);
  const canonicalDetailPath = getPricingPlanPath(
    locale,
    product.category,
    product.slug,
    activePlan.slug,
  );
  const hasPublishedPrices = activePlan.regions.length > 0;
  const defaultCurrency =
    getSiteLocaleDefinition(locale).defaultCurrency;
  const [affordability, latestExchangeRates] = await Promise.all([
    activePlan.billing === "monthly"
      ? getCachedPlanAffordability(product.slug, activePlan.slug)
      : Promise.resolve({
          summary: null,
          rows: [],
          bigMacBenchmarks: [],
          quality: {
            publishable: false,
            reasons: ["no_computed_rows" as const],
            coveredRegions: 0,
            publishedRegions: 0,
            coverageRatio: 0,
            minIncomeYear: null,
            maxIncomeYear: null,
          },
        }),
    getCachedPublicExchangeRates(),
  ]);
  const exchangeRates = Object.fromEntries(
    supportedDisplayCurrencies.map((currency) => [
      currency,
      currency === "USD"
        ? {
            baseCurrency: "USD",
            quoteCurrency: "USD",
            rate: 1,
            source: null,
            rateDate: activePlan.freshness?.fxRateDate || null,
            fetchedAt: null,
            isFallback: false,
            isStale: false,
            isExpired: false,
          }
        : latestExchangeRates[currency] || {
            baseCurrency: "USD",
            quoteCurrency: currency,
            rate: 0,
            source: null,
            rateDate: null,
            fetchedAt: null,
            isFallback: true,
            isStale: true,
            isExpired: true,
          },
    ]),
  ) as Record<DisplayCurrency, ExchangeRateSnapshot>;
  const stats = hasPublishedPrices ? getPlanStats(activePlan) : null;
  const pageCopy = getPricingDetailPageCopy({
    locale,
    productName: product.name,
    planName: activePlan.name,
    stats,
  });
  const hasSinglePublishedPlan =
    product.plans.filter((plan) => plan.regions.length > 0).length === 1;
  const pageTitle =
    locale === "zh" &&
    hasChineseText(seoMeta?.h1) &&
    hasSinglePublishedPlan
      ? seoMeta?.h1 || pageCopy.pageTitle
      : pageCopy.pageTitle;
  const pageDescription =
    locale === "zh" &&
    hasChineseText(seoMeta?.description) &&
    hasSinglePublishedPlan
      ? seoMeta?.description || pageCopy.description
      : pageCopy.description;
  const editorialContent = getProductEditorialContent(
    locale,
    product.slug,
    activePlan.slug,
  );
  const searchIntentCopy = getPlanSearchIntentCopy({
    locale,
    displayName: getPlanDisplayName(product.name, activePlan.name),
    productName: product.name,
    regionCount: activePlan.regions.length,
    lowestCountry: stats?.minRegion.country,
    lowestPrice: stats ? formatUsd(stats.minRegion.priceUsd) : null,
    content: editorialContent,
  });
  const effectiveFaqs = searchIntentCopy
    ? [...searchIntentCopy.faqs, ...pageCopy.faqs]
    : pageCopy.faqs;
  const structuredData = buildPricingStructuredData({
    locale,
    path: canonicalDetailPath,
    title: pageTitle,
    description: searchIntentCopy?.description || pageDescription,
    product,
    plan: activePlan,
    faqs: effectiveFaqs,
  });

  return (
    <main className="mx-auto flex max-w-6xl gap-5 px-5 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <ProductSidebar
        products={sidebarProducts}
        currentSlug={product.slug}
        basePath={detailBasePath}
        locale={locale}
      />

      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-3">
          <Link
            href={detailBasePath}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5 shrink-0 rtl:rotate-180" strokeWidth={1.8} />
            {pageCopy.backToPricing}
          </Link>

          <MobileProductSwitcher
            products={sidebarProducts}
            currentSlug={product.slug}
            basePath={detailBasePath}
            locale={locale}
          />
        </div>

        <section className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <BrandIcon
                product={{
                  slug: product.slug,
                  name: product.name,
                  logoUrl: product.logoUrl,
                  officialUrl: product.officialUrl,
                }}
                size="md"
                priority
              />

              <div>
                <div className="text-sm font-medium text-zinc-400">
                  {product.brand}
                </div>

                <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950 md:text-[30px] dark:text-white">
                  {pageTitle}
                </h1>

                <p className="mt-2 max-w-3xl text-[15px] leading-6 text-zinc-600 dark:text-zinc-300">
                  {searchIntentCopy?.description || pageDescription}
                </p>

                {product.officialUrl ? (
                  <TrackedLink
                    href={product.officialUrl}
                    eventKey="click_official"
                    eventName="Open official website"
                    buttonKey={product.slug}
                    placement="product_hero"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-zinc-200 hover:text-zinc-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {pageCopy.visitOfficial}
                    <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
                  </TrackedLink>
                ) : null}
              </div>
            </div>
            <TrackedLink
              href={`/reports/${locale}/${product.slug}-global-pricing.pdf`}
              eventKey="download_price_report"
              eventName="Download global pricing report"
              buttonKey={product.slug}
              placement="product_hero"
              download={`${product.slug}-${locale}-global-pricing.pdf`}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <Download aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
              {reportDownloadLabel[locale]}
            </TrackedLink>
          </div>

          <div className="mt-4 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
            <PlanTabs
              productName={product.name}
              productSlug={product.slug}
              plans={product.plans}
              activePlanSlug={activePlan.slug}
              basePath={detailBasePath}
              locale={locale}
            />
            <ProductOverviewLink
              locale={locale}
              productName={product.name}
              href={productCanonicalPath}
            />
          </div>
        </section>

        {stats ? (
          <>
            <PricingPlatformView
              key={`${locale}-${activePlan.slug}`}
              productName={product.name}
              shareProduct={{
                name: product.name,
                slug: product.slug,
                brand: product.brand,
                updatedAt: product.updatedAt,
              }}
              plan={activePlan}
              defaultCurrency={defaultCurrency}
              exchangeRates={exchangeRates}
              locale={locale}
            />

            <CountryAnalysisLinks
              locale={locale}
              productSlug={product.slug}
              category={product.category}
            />

            {editorialContent ? (
              <ProductEditorialSection
                productSlug={product.slug}
                planName={activePlan.name}
                locale={locale}
                content={editorialContent}
              />
            ) : null}

            <PricingPressureSwitcher
              locale={locale}
              productName={product.name}
              priceView={(
                <PricePositionSection
                  plan={activePlan}
                  bigMacBenchmarks={affordability.bigMacBenchmarks}
                  locale={locale}
                />
              )}
              burdenView={affordability.rows.length > 0 ? (
                <AffordabilityComparison
                  productName={product.name}
                  planName={activePlan.name}
                  summary={affordability.summary}
                  rows={affordability.rows}
                  locale={locale}
                  embedded
                />
              ) : undefined}
              matrixView={affordability.rows.length > 0 ? (
                <PriceBurdenMatrix rows={affordability.rows} locale={locale} />
              ) : undefined}
              unavailableReason={getAffordabilityUnavailableReason(affordability.quality, locale)}
            />
          </>
        ) : (
          <NoPublishedPricesSection copy={pageCopy.empty} />
        )}

        <RelatedPlanChoices
          locale={locale}
          product={product}
          currentPlanSlug={activePlan.slug}
        />

        <FaqSection
          title={pageCopy.faqTitle}
          faqs={effectiveFaqs}
        />
      </div>
    </main>
  );
}
