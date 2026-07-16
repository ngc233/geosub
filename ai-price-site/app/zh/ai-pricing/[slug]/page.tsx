import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCategory } from "@prisma/client";
import BrandIcon from "../../../../components/BrandIcon";
import ProductSidebar from "../../../../components/ProductSidebar";
import PlanTabs from "../../../../components/PlanTabs";
import SharePriceModal from "../../../../components/SharePriceModal";
import MobileProductSwitcher from "../../../../components/MobileProductSwitcher";
import PricingPlatformView from "../../../../components/PricingPlatformView";
import AffordabilityComparison from "../../../../components/AffordabilityComparison";
import {
  formatUsd,
  getPlanStats,
  getProductPlan,
  type ProductPlan,
} from "../../../../data/ai-pricing";
import { getPricingDetailProduct } from "../../../../lib/pricing-detail-adapter";
import { getPlanAffordability } from "../../../../lib/affordability";
import { getLatestExchangeRate } from "../../../../lib/exchange-rates";
import { getPlanDisplayName } from "../../../../lib/pricing-labels";
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
  return getPricingDetailProduct(slug, "zh");
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

async function getProductSeoMeta(slug: string) {
  return prisma.seoMeta.findFirst({
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
  });
}

function hasChineseText(value?: string | null) {
  return Boolean(value && /[\u3400-\u9fff]/.test(value));
}

function getLocalizedH1({
  productName,
  planName,
  seoH1,
}: {
  productName: string;
  planName: string;
  seoH1?: string | null;
}) {
  if (hasChineseText(seoH1)) {
    return seoH1;
  }

  return `${getPlanDisplayName(productName, planName)} 全球价格对比`;
}

function getLocalizedDescription(productName: string) {
  return `按套餐和地区比较 ${productName} 在 App Store 的公开订阅价格，并提供美元、人民币和购买力视角。`;
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

function FaqSection({ productName }: { productName: string }) {
  const faqs = [
    {
      q: `截至 2026 年，哪个国家的 ${productName} Plus 订阅最便宜？`,
      a: `根据当前已发布的 App Store 地区价格，最低价会显示在本页排行榜和地图中。具体结果会随平台定价、税费和汇率变化而变化。`,
    },
    {
      q: `${productName} 在不同 App Store 地区的定价为什么不同？`,
      a: "不同地区会受到本地定价策略、税费、汇率、平台政策和购买力差异影响，因此同一个套餐在不同国家可能价格不同。",
    },
    {
      q: "本页追踪的是 App Store 价格、网页价格还是两者？",
      a: "V1 正式榜单优先追踪 App Store 各地区公开订阅价格。Web 官网和 Google Play 暂作为后台采集诊断与未来补充来源，不默认混入正式排名。",
    },
    {
      q: `本站地图能帮助我找到更便宜的 ${productName} 地区订阅吗？`,
      a: "地图可以帮助你快速理解 App Store 各地区价格差异，但最终是否可购买仍取决于账号地区、支付方式、税费和平台规则。",
    },
  ];

  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-100 px-5 py-4 md:px-6 dark:border-zinc-800">
        <h2 className="text-xl font-semibold leading-tight text-zinc-950 dark:text-white">
          {productName} 订阅定价 FAQ
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
                ⌄
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
          {productName} {planName} 价格正在审核
        </h2>

        <p className="mt-3 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
          该套餐已经进入采集流程，但还没有写入正式价格库。后台完成 App Store
          稳定性审核后，这里会自动显示地区价格、地图和购买力对比。
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="text-xs font-semibold text-zinc-400">当前状态</div>
          <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
            待审核
          </div>
        </div>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="text-xs font-semibold text-zinc-400">数据来源</div>
          <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
            App Store
          </div>
        </div>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="text-xs font-semibold text-zinc-400">展示条件</div>
          <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
            通过审核后发布
          </div>
        </div>
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, seoMeta] = await Promise.all([
    getProduct(slug),
    getProductSeoMeta(slug),
  ]);

  if (!product) {
    return {
      title: "订阅价格详情 - GeoSub",
    };
  }

  return {
    title: hasChineseText(seoMeta?.title)
      ? seoMeta?.title || `${product.name} App Store 地区订阅价格 - GeoSub`
      : `${product.name} App Store 地区订阅价格 - GeoSub`,
    description:
      hasChineseText(seoMeta?.description)
        ? seoMeta?.description ||
          `比较 ${product.name} 在不同 App Store 地区的订阅价格、美元折算、人民币估算和本地订阅负担。`
        : `比较 ${product.name} 在不同 App Store 地区的订阅价格、美元折算、人民币估算和本地订阅负担。`,
    alternates: seoMeta?.canonicalUrl
      ? {
          canonical: seoMeta.canonicalUrl,
        }
      : undefined,
  };
}

export default async function ProductPricingPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [product, seoMeta] = await Promise.all([
    getProduct(slug),
    getProductSeoMeta(slug),
  ]);

  if (!product) {
    notFound();
  }

  const activePlan = getProductPlan(product, resolvedSearchParams.plan);
  const sidebarProducts = await getProductNavItems(product.category);
  const detailBasePath =
    product.category === "streaming" ? "/zh/streaming-pricing" : "/zh/ai-pricing";
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
      />

      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-3">
          <Link
            href={detailBasePath}
            className="inline-flex text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            ← 返回订阅价格列表
          </Link>

          <MobileProductSwitcher
            products={sidebarProducts}
            currentSlug={product.slug}
            basePath={detailBasePath}
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
                  {getLocalizedH1({
                    productName: product.name,
                    planName: activePlan.name,
                    seoH1: seoMeta?.h1,
                  })}
                </h1>

                <p className="mt-2 max-w-3xl text-[15px] leading-6 text-zinc-600 dark:text-zinc-300">
                  {getLocalizedDescription(product.name)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">套餐</span>
            <PlanTabs
              productSlug={product.slug}
              plans={product.plans}
              activePlanSlug={activePlan.slug}
              basePath={detailBasePath}
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
              shareAction={<SharePriceModal product={product} plan={activePlan} stats={stats} locale="zh" />}
            />

            {affordability.rows.length > 0 ? (
              <AffordabilityComparison
                productName={product.name}
                planName={activePlan.name}
                summary={affordability.summary}
                rows={affordability.rows}
                locale="zh"
              />
            ) : (
              <PurchasingPowerSection productName={product.name} plan={activePlan} />
            )}
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
