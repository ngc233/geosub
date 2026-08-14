import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatUsd, getPlanStats, type SubscriptionProduct } from "../lib/public-pricing-model";
import { getPricingPlanPath } from "../lib/pricing-routes";
import {
  getPricingProductOverviewCopy,
  getProductOverviewDecisionPlans,
  getProductOverviewPriceFact,
} from "../lib/pricing-product-overview-copy";
import type { SiteLocale } from "../lib/site-locale";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import { getProductEditorialContent } from "../lib/product-editorial-content";

export default function ProductPlanOverview({
  product,
  locale,
}: {
  product: SubscriptionProduct;
  locale: SiteLocale;
}) {
  const publishedPlans = product.plans.filter((plan) => plan.regions.length > 0);
  const decisionPlans = getProductOverviewDecisionPlans(product);
  const regionCount = new Set(
    publishedPlans.flatMap((plan) => plan.regions.map((region) => region.code)),
  ).size;
  const copy = getPricingProductOverviewCopy({
    locale,
    productName: product.name,
    planCount: decisionPlans.length,
    regionCount,
    lowest: getProductOverviewPriceFact(product),
  });
  const overviewEditorial = publishedPlans
    .map((plan) =>
      getProductEditorialContent(locale, product.slug, plan.slug),
    )
    .find(Boolean);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
      <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
        {copy.heading}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {copy.intro}
      </p>
      {overviewEditorial ? (
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {overviewEditorial.summary}
        </p>
      ) : null}

      <div
        className={`mt-5 grid gap-3 md:grid-cols-2 ${
          publishedPlans.length === 4 ? "xl:grid-cols-2" : "xl:grid-cols-3"
        }`}
      >
        {publishedPlans.map((plan) => {
          const stats = getPlanStats(plan);
          const editorial = getProductEditorialContent(
            locale,
            product.slug,
            plan.slug,
          );
          const href = getPricingPlanPath(
            locale,
            product.category,
            product.slug,
            plan.slug,
          );

          return (
            <article
              key={plan.slug}
              className="flex min-h-40 flex-col rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  {plan.name}
                </h3>
                <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                  {getBillingCycleLabel(plan.billing, locale)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-zinc-400">{copy.priceRange}</div>
                  <div className="mt-1 font-semibold text-zinc-950 dark:text-white">
                    {formatUsd(stats.minRegion.priceUsd)} - {formatUsd(stats.maxRegion.priceUsd)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">App Store</div>
                  <div className="mt-1 font-semibold text-zinc-950 dark:text-white">
                    {copy.regions(plan.regions.length)}
                  </div>
                </div>
              </div>

              {editorial ? (
                <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {editorial.bestForLabel}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                    {editorial.plan.bestFor}
                  </p>
                </div>
              ) : null}

              <Link
                href={href}
                data-track-event="select_plan"
                data-track-name="Open plan country pricing"
                data-track-button={`${product.slug}:${plan.slug}`}
                data-track-placement="product_overview_card"
                className="group mt-5 flex min-h-11 items-center justify-between gap-3 rounded-md border border-lime-300 bg-lime-50 px-3 py-2.5 text-sm font-semibold text-lime-900 transition hover:border-lime-400 hover:bg-lime-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/15 dark:border-lime-700/70 dark:bg-lime-950/35 dark:text-lime-200 dark:hover:border-lime-600 dark:hover:bg-lime-950/55"
              >
                <span>{copy.viewPlan}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium">
                  {copy.regions(plan.regions.length)}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  />
                </span>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
