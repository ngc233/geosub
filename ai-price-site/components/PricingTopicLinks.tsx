import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type {
  ProductNavCategory,
  ProductNavItem,
} from "./ProductSidebar";
import { getProductHref } from "./ProductSidebar";
import type { SiteLocale } from "../lib/site-locale";
import {
  getPlanEditorialIndexingStatus,
  getProductEditorialContent,
} from "../lib/product-editorial-content";
import { getPlanDisplayName } from "../lib/pricing-labels";
import { getPricingPlanPath } from "../lib/pricing-routes";
import type { SubscriptionProduct } from "../lib/public-pricing-model";

type IndexablePricingLocale = Extract<SiteLocale, "zh" | "en">;

const copy: Record<
  IndexablePricingLocale,
  {
    allPlans: (productName: string) => string;
    relatedTitle: Record<ProductNavCategory, string>;
    relatedDescription: string;
    productAction: string;
    otherPlansTitle: (productName: string) => string;
    otherPlansDescription: string;
    planLink: (planName: string) => string;
  }
> = {
  zh: {
    allPlans: (productName) => `查看 ${productName} 全部套餐`,
    relatedTitle: {
      ai: "比较更多 AI 订阅",
      streaming: "比较更多流媒体订阅",
    },
    relatedDescription: "继续查看其他已上线产品的套餐和各地区价格。",
    productAction: "查看套餐和地区价格",
    otherPlansTitle: (productName) => `比较其他 ${productName} 套餐`,
    otherPlansDescription: "先按实际使用强度选择套餐，再比较对应的地区价格。",
    planLink: (planName) => `${planName} 地区价格`,
  },
  en: {
    allPlans: (productName) => `Compare all ${productName} plans`,
    relatedTitle: {
      ai: "Compare more AI subscriptions",
      streaming: "Compare more streaming subscriptions",
    },
    relatedDescription: "Explore plans and regional prices for other published services.",
    productAction: "View plans and prices by country",
    otherPlansTitle: (productName) => `Compare other ${productName} plans`,
    otherPlansDescription: "Choose for your actual usage first, then compare prices by country.",
    planLink: (planName) => `${planName} prices by country`,
  },
};

function isIndexablePricingLocale(
  locale: SiteLocale,
): locale is IndexablePricingLocale {
  return locale === "zh" || locale === "en";
}

export function ProductOverviewLink({
  locale,
  productName,
  href,
}: {
  locale: SiteLocale;
  productName: string;
  href: string;
}) {
  if (!isIndexablePricingLocale(locale)) return null;

  return (
    <Link
      href={href}
      data-track-event="click_product_overview"
      data-track-name="Compare all product plans"
      data-track-button={productName}
      data-track-placement="plan_tabs"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-lime-700 transition hover:text-lime-900 dark:text-lime-300 dark:hover:text-lime-200"
    >
      {copy[locale].allPlans(productName)}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

export function RelatedPricingProducts({
  locale,
  category,
  products,
  currentSlug,
  basePath,
}: {
  locale: SiteLocale;
  category: ProductNavCategory;
  products: ProductNavItem[];
  currentSlug: string;
  basePath: string;
}) {
  if (!isIndexablePricingLocale(locale)) return null;

  const relatedProducts = products
    .filter(
      (product) =>
        product.slug !== currentSlug && product.category === category,
    )
    .slice(0, 4);

  if (relatedProducts.length === 0) return null;

  const localeCopy = copy[locale];

  return (
    <section
      aria-labelledby="related-pricing-products-title"
      className="border-t border-zinc-200 pt-5 dark:border-zinc-800"
    >
      <h2
        id="related-pricing-products-title"
        className="text-lg font-semibold text-zinc-950 dark:text-white"
      >
        {localeCopy.relatedTitle[category]}
      </h2>
      <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {localeCopy.relatedDescription}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {relatedProducts.map((product) => (
          <Link
            key={product.slug}
            href={getProductHref(product, basePath)}
            data-track-event="click_related_pricing_product"
            data-track-name="Open related pricing product"
            data-track-button={product.slug}
            data-track-placement="product_overview"
            className="group flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 transition hover:border-lime-400 hover:bg-lime-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/15 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-lime-600 dark:hover:bg-lime-950/25"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-zinc-950 dark:text-white">
                {product.name}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                {localeCopy.productAction}
              </span>
            </span>
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-lime-100 text-lime-800 transition group-hover:bg-lime-200 dark:bg-lime-900/50 dark:text-lime-200 dark:group-hover:bg-lime-900/70">
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RelatedPlanChoices({
  locale,
  product,
  currentPlanSlug,
}: {
  locale: SiteLocale;
  product: SubscriptionProduct;
  currentPlanSlug: string;
}) {
  if (!isIndexablePricingLocale(locale)) return null;

  const plans = product.plans
    .filter(
      (plan) =>
        plan.slug !== currentPlanSlug &&
        plan.regions.length > 0 &&
        getPlanEditorialIndexingStatus(product.slug, plan.slug) === "current",
    )
    .slice(0, 3);

  if (plans.length === 0) return null;

  const localeCopy = copy[locale];

  return (
    <section
      aria-labelledby="related-plan-choices-title"
      className="border-t border-zinc-200 pt-5 dark:border-zinc-800"
    >
      <h2
        id="related-plan-choices-title"
        className="text-lg font-semibold text-zinc-950 dark:text-white"
      >
        {localeCopy.otherPlansTitle(product.name)}
      </h2>
      <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {localeCopy.otherPlansDescription}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const displayName = getPlanDisplayName(product.name, plan.name);
          const editorial = getProductEditorialContent(
            locale,
            product.slug,
            plan.slug,
          );

          return (
            <Link
              key={plan.slug}
              href={getPricingPlanPath(
                locale,
                product.category,
                product.slug,
                plan.slug,
              )}
              data-track-event="click_related_plan"
              data-track-name="Open related pricing plan"
              data-track-button={plan.slug}
              data-track-placement="plan_detail"
              className="group rounded-md border border-zinc-200 bg-white px-4 py-3 transition hover:border-lime-400 hover:bg-lime-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/15 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-lime-600 dark:hover:bg-lime-950/25"
            >
              <span className="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-900 group-hover:text-lime-800 dark:text-zinc-100 dark:group-hover:text-lime-200">
                {localeCopy.planLink(displayName)}
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-lime-100 text-lime-800 transition group-hover:bg-lime-200 dark:bg-lime-900/50 dark:text-lime-200 dark:group-hover:bg-lime-900/70">
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  />
                </span>
              </span>
              {editorial ? (
                <span className="mt-1 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {editorial.plan.bestFor}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
