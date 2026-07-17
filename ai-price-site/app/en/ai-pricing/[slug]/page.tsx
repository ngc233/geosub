import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ProductCategory } from "@prisma/client";
import BrandIcon from "../../../../components/BrandIcon";
import TrackedLink from "../../../../components/analytics/TrackedLink";
import ProductSidebar from "../../../../components/ProductSidebar";
import PlanTabs from "../../../../components/PlanTabs";
import SharePriceModal from "../../../../components/SharePriceModal";
import MobileProductSwitcher from "../../../../components/MobileProductSwitcher";
import PricingPlatformView from "../../../../components/PricingPlatformView";
import AffordabilityComparison from "../../../../components/AffordabilityComparison";
import {
  getPlanStats,
  getProductPlan,
} from "../../../../data/ai-pricing";
import { getPricingDetailProduct } from "../../../../lib/pricing-detail-adapter";
import { getPlanAffordability } from "../../../../lib/affordability";
import { getLatestExchangeRate } from "../../../../lib/exchange-rates";
import { getPlanDisplayName } from "../../../../lib/pricing-labels";
import {
  getPricingDetailPath,
  getPricingListPath,
} from "../../../../lib/pricing-routes";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    plan?: string;
  }>;
};

async function getProduct(slug: string) {
  return getPricingDetailProduct(slug, "en");
}

function toDbProductCategory(category: string) {
  return category === "streaming" ? ProductCategory.STREAMING : ProductCategory.AI;
}

async function getProductNavItems(category: string) {
  const products = await prisma.product.findMany({
    where: {
      category: toDbProductCategory(category),
      status: {
        in: ["PUBLISHED", "REVIEW"],
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
}

function getH1(productName: string, planName: string) {
  return `${getPlanDisplayName(productName, planName)} Global Price Comparison`;
}

function getDescription(productName: string) {
  return `Compare ${productName} public App Store subscription prices by plan and region, with USD, CNY and purchasing-power views.`;
}

function FaqSection({ productName }: { productName: string }) {
  const faqs = [
    {
      q: `Which country has the cheapest ${productName} subscription in 2026?`,
      a: "The current lowest region is shown in the ranking, map and price conclusion on this page. Results may change as App Store pricing, taxes and exchange rates change.",
    },
    {
      q: `Why does ${productName} pricing differ by App Store region?`,
      a: "Regional prices can differ because of local pricing strategy, tax treatment, exchange rates, platform policy and purchasing-power differences.",
    },
    {
      q: "Does this page rank App Store, web pricing or Google Play?",
      a: "GeoSub V1 official rankings use reviewed App Store regional subscription prices. Web and Google Play signals are kept for diagnostics unless they are labeled separately.",
    },
    {
      q: "Can I use this map to choose a cheaper subscription region?",
      a: "The map helps explain public price differences. Actual subscription availability can still depend on account region, payment method, billing information, taxes and platform risk controls.",
    },
  ];

  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-100 px-5 py-4 md:px-6 dark:border-zinc-800">
        <h2 className="text-xl font-semibold leading-tight text-zinc-950 dark:text-white">
          {productName} Pricing FAQ
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
  productName,
  planName,
}: {
  productName: string;
  planName: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Price pending
        </div>

        <h2 className="mt-2 text-2xl font-semibold leading-tight text-zinc-950 dark:text-white">
          {productName} {planName} prices are under review
        </h2>

        <p className="mt-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
          This plan is already in the collection flow, but it has not entered the official price database yet. After App Store stability checks pass, regional prices, maps and purchasing-power comparison will appear here automatically.
        </p>
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Pricing Detail",
    };
  }

  const activePlan = getProductPlan(product, resolvedSearchParams.plan);
  const enPath = getPricingDetailPath("en", product.category, product.slug);
  const zhPath = getPricingDetailPath("zh", product.category, product.slug);

  return {
    title: getH1(product.name, activePlan.name),
    description: getDescription(product.name),
    alternates: {
      canonical: enPath,
      languages: {
        "zh-CN": zhPath,
        en: enPath,
        "x-default": enPath,
      },
    },
  };
}

export default async function EnglishProductPricingPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const activePlan = getProductPlan(product, resolvedSearchParams.plan);
  const canonicalDetailPath = getPricingDetailPath(
    "en",
    product.category,
    product.slug,
  );
  const currentPath = (await headers())
    .get("x-pathname")
    ?.replace(/\/+$/, "");

  if (currentPath && currentPath !== canonicalDetailPath) {
    const planQuery = resolvedSearchParams.plan
      ? `?plan=${encodeURIComponent(resolvedSearchParams.plan)}`
      : "";
    redirect(`${canonicalDetailPath}${planQuery}`);
  }

  const sidebarProducts = await getProductNavItems(product.category);
  const detailBasePath = getPricingListPath("en", product.category);
  const hasPublishedPrices = activePlan.regions.length > 0;
  const [affordability, cnyExchangeRate] = await Promise.all([
    getPlanAffordability(product.slug, activePlan.slug),
    getLatestExchangeRate("USD", "CNY"),
  ]);
  const stats = hasPublishedPrices ? getPlanStats(activePlan) : null;

  return (
    <main className="mx-auto flex max-w-7xl gap-6 px-5 py-5">
      <ProductSidebar
        products={sidebarProducts}
        currentSlug={product.slug}
        basePath={detailBasePath}
        locale="en"
      />

      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-3">
          <Link
            href={detailBasePath}
            className="inline-flex text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            ← Back to pricing list
          </Link>

          <MobileProductSwitcher
            products={sidebarProducts}
            currentSlug={product.slug}
            basePath={detailBasePath}
            locale="en"
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
                  {getH1(product.name, activePlan.name)}
                </h1>

                <p className="mt-2 max-w-3xl text-[15px] leading-6 text-zinc-600 dark:text-zinc-300">
                  {getDescription(product.name)}
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
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800"
                  >
                    Visit official website ↗
                  </TrackedLink>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">Plans</span>
            <PlanTabs
              productName={product.name}
              productSlug={product.slug}
              plans={product.plans}
              activePlanSlug={activePlan.slug}
              basePath={detailBasePath}
              locale="en"
            />
          </div>
        </section>

        {stats ? (
          <>
            <PricingPlatformView
              productName={product.name}
              plan={activePlan}
              updatedAt={product.updatedAt}
              cnyExchangeRate={cnyExchangeRate}
              locale="en"
              shareAction={<SharePriceModal product={product} plan={activePlan} stats={stats} locale="en" />}
            />

            {affordability.rows.length > 0 ? (
              <AffordabilityComparison
                productName={product.name}
                planName={activePlan.name}
                summary={affordability.summary}
                rows={affordability.rows}
                locale="en"
              />
            ) : null}
          </>
        ) : (
          <NoPublishedPricesSection
            productName={product.name}
            planName={activePlan.name}
          />
        )}

        <FaqSection productName={product.name} />
      </div>
    </main>
  );
}
