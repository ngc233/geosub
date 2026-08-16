import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductCategory } from "@prisma/client";
import BrandIcon from "./BrandIcon";
import TrackedLink from "./analytics/TrackedLink";
import ProductSidebar from "./ProductSidebar";
import ProductPlanOverview from "./ProductPlanOverview";
import PlanTabs from "./PlanTabs";
import SharePriceModal from "./SharePriceModal";
import MobileProductSwitcher from "./MobileProductSwitcher";
import {
  ProductOverviewLink,
  RelatedPlanChoices,
  RelatedPricingProducts,
} from "./PricingTopicLinks";
import PricingPlatformView from "./PricingPlatformView";
import AffordabilityComparison from "./AffordabilityComparison";
import {
  formatUsd,
  getPlanStats,
  getProductPlan,
  type ProductPlan,
} from "../lib/public-pricing-model";
import { getPricingDetailProduct } from "../lib/pricing-detail-adapter";
import { getPlanAffordability } from "../lib/affordability";
import {
  getLatestUsdExchangeRates,
  type ExchangeRateSnapshot,
} from "../lib/exchange-rates";
import { getPricingDetailPageCopy } from "../lib/pricing-detail-page-copy";
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
    ["public-pricing-affordability", productSlug, planSlug],
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

function PurchasingPowerSection({
  productName,
  plan,
}: {
  productName: string;
  plan: ProductPlan;
}) {
  const sortedRegions = getSortedRegions(plan);
  const referenceRegion = getReferenceRegion(plan);
  const referencePrice = referenceRegion.priceUsd;

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
    };
  });
  const cheapest = rows[0];
  const mostExpensive = rows[rows.length - 1];
  const nearBaseline =
    rows.find(({ diff }) => Math.abs(diff) <= 10) ||
    rows.reduce((closest, row) =>
      Math.abs(row.diff) < Math.abs(closest.diff) ? row : closest,
    rows[0]);
  const matrixRows = rows.slice(0, 28);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-100 px-5 py-5 dark:border-zinc-800 md:px-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
            {productName} 价格压力判断
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            收入指标还未完成本地刷新时，先用已发布 App Store 价格做过渡判断：看哪些地区低于基准、哪些地区明显溢价。收入数据接入后会自动升级为本地订阅负担排行。
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-b border-zinc-100 px-5 py-5 dark:border-zinc-800 md:grid-cols-3 md:px-6">
        {[
          { label: "最低公开价", row: cheapest, helper: "可作为价格锚点，但仍需结合税费和账号风险。" },
          { label: "接近基准", row: nearBaseline, helper: `${referenceRegion.country} 作为当前基准地区。` },
          { label: "最高溢价", row: mostExpensive, helper: "适合放入解释和风险提示，而不是推荐位。" },
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
          </div>
        ))}
      </div>

      <div className="grid gap-5 px-5 py-5 dark:border-zinc-800 md:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-zinc-950 dark:text-white">价格差矩阵</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                以 {referenceRegion.country} 为 0% 基准，越靠左越便宜，越靠右溢价越明显。
              </p>
            </div>
            <div className="text-xs text-zinc-400">{matrixRows.length} 个地区</div>
          </div>

          <div className="relative h-[220px] overflow-hidden rounded-lg border border-zinc-200 bg-[linear-gradient(to_right,rgba(113,113,122,0.10)_1px,transparent_1px)] bg-[size:25%_100%] dark:border-zinc-800">
            <div className="absolute inset-y-0 left-1/2 border-l border-zinc-300 dark:border-zinc-700" />
            <div className="absolute left-3 top-3 text-xs text-zinc-400">更便宜</div>
            <div className="absolute right-3 top-3 text-xs text-zinc-400">更贵</div>
            {matrixRows.map(({ region, diff, tone }, index) => {
              const x = Math.max(5, Math.min(95, 50 + diff / 2));
              const y = 18 + (index % 7) * 26;

              return (
                <div
                  key={`fallback-power-${region.code}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}px` }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
                    <span className="rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 shadow-sm dark:bg-zinc-900/85 dark:text-zinc-300">
                      {region.code}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="content-start space-y-2">
          {rows.slice(0, 8).map(({ region, diff, label, tone, normalized }) => (
            <div key={`fallback-row-${region.code}`} className="rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-950 dark:text-white">{region.country}</div>
                  <div className="mt-0.5 text-xs text-zinc-400">{formatUsd(region.priceUsd)}</div>
                </div>
                <div className="text-right text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                  {getDiffText(diff)}
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${normalized}%` }} />
              </div>
              <div className="mt-1.5 text-xs text-zinc-400">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
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
              <span className="text-zinc-400 transition group-open:rotate-180">
                ↓
              </span>
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
            className="group flex min-w-0 items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition hover:border-lime-300 hover:bg-lime-50/60 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-lime-500/40 dark:hover:bg-lime-500/10"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-950 dark:text-white">
                {pilot.title[pilotLocale]}
              </span>
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                {pilot.countryName[pilotLocale]} · {copy.action}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-lg text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-lime-700 dark:group-hover:text-lime-300"
            >
              →
            </span>
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
      <main className="mx-auto flex max-w-7xl gap-6 px-5 py-5">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
              className="inline-flex text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
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
              <BrandIcon product={product} size="md" />
              <div>
                <div className="text-sm font-medium text-zinc-400">
                  {product.brand}
                </div>
                <h1 className="mt-0.5 text-[26px] font-semibold leading-tight text-zinc-950 md:text-[32px] dark:text-white">
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
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-lime-500/40 dark:hover:bg-lime-500/10 dark:hover:text-lime-200"
                  >
                    {pageCopy.visitOfficial}
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
      : Promise.resolve({ summary: null, rows: [] }),
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
    <main className="mx-auto flex max-w-7xl gap-6 px-5 py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
            className="inline-flex text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
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
              <BrandIcon product={product} size="md" />

              <div>
                <div className="text-sm font-medium text-zinc-400">
                  {product.brand}
                </div>

                <h1 className="mt-0.5 text-[26px] font-semibold leading-tight text-zinc-950 md:text-[32px] dark:text-white">
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
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-lime-500/40 dark:hover:bg-lime-500/10 dark:hover:text-lime-200"
                  >
                    {pageCopy.visitOfficial}
                  </TrackedLink>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">
              {pageCopy.plans}
            </span>
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
              plan={activePlan}
              defaultCurrency={defaultCurrency}
              exchangeRates={exchangeRates}
              locale={locale}
              shareAction={
                <SharePriceModal
                  product={product}
                  plan={activePlan}
                  stats={stats}
                  locale={locale}
                />
              }
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
                content={editorialContent}
              />
            ) : null}

            {affordability.rows.length > 0 ? (
              <AffordabilityComparison
                productName={product.name}
                planName={activePlan.name}
                summary={affordability.summary}
                rows={affordability.rows}
                locale={locale}
              />
            ) : locale === "zh" ? (
              <PurchasingPowerSection productName={product.name} plan={activePlan} />
            ) : null}
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
