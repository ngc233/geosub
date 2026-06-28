import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  subscriptionPricingData,
  type ProductPlan,
} from "../../../../data/ai-pricing";
import { getPricingDetailProduct } from "../../../../lib/pricing-detail-adapter";
import { getPlanAffordability } from "../../../../lib/affordability";
import { getLatestExchangeRate } from "../../../../lib/exchange-rates";

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

  const grouped = sortedRegions.map((region) => {
    const diff = getDiffPercent(region.priceUsd, referencePrice);
    let group = "接近公平定价";

    if (diff >= 80) group = "严重偏高";
    else if (diff >= 20) group = "中度偏高";
    else if (diff <= -20) group = "更划算";

    return {
      region,
      diff,
      group,
      burden: Math.max(8, Math.min(100, 50 + diff)),
    };
  });

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-tight text-zinc-950 dark:text-white">
            {productName} 本地购买力对比
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500 md:text-[15px] md:leading-7 dark:text-zinc-400">
            当前先用美国价格作为基准观察地区负担。后续可以继续接入 PPP、人均收入和真实购买力指数。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {grouped.map(({ region, diff, group, burden }) => (
          <div
            key={`power-${region.code}`}
            className="grid grid-cols-[96px_80px_1fr_70px] items-center gap-3 text-sm"
          >
            <div className="font-bold text-zinc-700 dark:text-zinc-200">
              {region.country}
            </div>

            <div className="font-mono text-xs text-zinc-400">
              {formatUsd(region.priceUsd)}
            </div>

            <div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={[
                    "h-2 rounded-full",
                    diff > 20
                      ? "bg-rose-400"
                      : diff < -10
                        ? "bg-lime-500"
                        : "bg-zinc-400",
                  ].join(" ")}
                  style={{ width: `${burden}%` }}
                />
              </div>

              <div className="mt-1 text-[11px] font-bold text-zinc-400">
                {group}
              </div>
            </div>

            <div
              className={[
                "text-right text-xs font-black",
                diff > 0
                  ? "text-rose-600"
                  : diff < 0
                    ? "text-lime-700"
                    : "text-zinc-500",
              ].join(" ")}
            >
              {getDiffText(diff)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqSection({ productName }: { productName: string }) {
  const faqs = [
    {
      q: `截至 2026 年，哪个国家的 ${productName} Plus 订阅最便宜？`,
      a: `根据当前收录数据，最低价通常出现在菲律宾、日本、加拿大等地区附近，具体结果会随税费、汇率和平台定价变化而变化。`,
    },
    {
      q: `${productName} 在不同 App Store 地区的定价为什么不同？`,
      a: "不同地区会受到本地定价策略、税费、汇率、平台政策和购买力差异影响，因此同一个套餐在不同国家可能价格不同。",
    },
    {
      q: "本页追踪的是 App Store 价格、网页价格还是两者？",
      a: "当前页面以已录入的地区订阅价格为准。后续可以继续区分 App Store、Google Play、Web 官网和礼品卡等不同计费平台。",
    },
    {
      q: `本站地图能帮助我找到更便宜的 ${productName} 地区订阅吗？`,
      a: "地图可以帮助你理解不同地区的价格差异，但最终是否可购买还取决于账号地区、支付方式、税费和平台规则。",
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "订阅价格详情 - GeoSub",
    };
  }

  return {
    title: `${product.name} 订阅价格 - GeoSub`,
    description: product.description,
  };
}

export default async function ProductPricingPage({
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
  const [affordability, cnyExchangeRate] = await Promise.all([
    getPlanAffordability(product.slug, activePlan.slug),
    getLatestExchangeRate("USD", "CNY"),
  ]);
  const stats = getPlanStats(activePlan);

  return (
    <main className="mx-auto flex max-w-7xl gap-6 px-5 py-5">
      <ProductSidebar products={subscriptionPricingData} currentSlug={product.slug} />

      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-3">
          <Link
            href="/zh/ai-pricing/"
            className="inline-flex text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            ← 返回订阅价格列表
          </Link>

          <MobileProductSwitcher
            products={subscriptionPricingData}
            currentSlug={product.slug}
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
                  {product.name} 订阅价格
                </h1>

                <p className="mt-2 max-w-3xl text-[15px] leading-6 text-zinc-600 dark:text-zinc-300">
                  按套餐、地区和价格来源比较 {product.name} 订阅价格。
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
            />
          </div>
        </section>

        <PricingPlatformView
          productName={product.name}
          plan={activePlan}
          updatedAt={product.updatedAt}
          cnyExchangeRate={cnyExchangeRate}
          shareAction={<SharePriceModal product={product} plan={activePlan} stats={stats} />}
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

        <FaqSection productName={product.name} />
      </div>
    </main>
  );
}
