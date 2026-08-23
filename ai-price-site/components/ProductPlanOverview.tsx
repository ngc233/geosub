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
  const decisionPlans = getProductOverviewDecisionPlans(product).filter(
    (plan) => plan.regions.length > 0,
  );
  const singlePlan = decisionPlans.length === 1;
  const regionCount = new Set(
    decisionPlans.flatMap((plan) => plan.regions.map((region) => region.code)),
  ).size;
  const copy = getPricingProductOverviewCopy({
    locale,
    productName: product.name,
    planCount: decisionPlans.length,
    regionCount,
    lowest: getProductOverviewPriceFact(product),
  });
  const overviewEditorial = decisionPlans
    .map((plan) =>
      getProductEditorialContent(locale, product.slug, plan.slug),
    )
    .find(Boolean);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
      <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
        {copy.heading}
      </h2>
      {!singlePlan ? (
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {copy.intro}
        </p>
      ) : null}
      {!singlePlan && overviewEditorial ? (
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {overviewEditorial.summary}
        </p>
      ) : null}

      <div
        className={singlePlan
          ? "mt-5"
          : `mt-5 grid gap-3 md:grid-cols-2 ${
              decisionPlans.length === 4 ? "xl:grid-cols-2" : "xl:grid-cols-3"
            }`}
      >
        {decisionPlans.map((plan) => {
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
              data-single-plan={singlePlan ? "true" : "false"}
              className={singlePlan
                ? ""
                : "flex min-h-40 flex-col rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"}
            >
              <div className={singlePlan ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" : "flex h-full flex-col"}>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                      {plan.name}
                    </h3>
                    <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                      {getBillingCycleLabel(plan.billing, locale)}
                    </span>
                  </div>

                  <div className={`mt-4 grid gap-4 text-sm ${singlePlan ? "sm:grid-cols-3" : "grid-cols-2"}`}>
                    <div className={singlePlan ? "" : "col-span-2"}>
                      <div className="text-xs text-zinc-400">{copy.priceRange}</div>
                      <div className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        {formatUsd(stats.minRegion.priceUsd)} – {formatUsd(stats.maxRegion.priceUsd)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {stats.minRegion.country} – {stats.maxRegion.country}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">{copy.coverage}</div>
                      <div className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        {copy.regions(plan.regions.length)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">{copy.channel}</div>
                      <div className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        App Store
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
                      {!singlePlan ? (
                        <>
                          <div className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            {editorial.differenceLabel}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                            {editorial.plan.difference}
                          </p>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <Link
                  href={href}
                  data-track-event="select_plan"
                  data-track-name="Open plan country pricing"
                  data-track-button={`${product.slug}:${plan.slug}`}
                  data-track-placement="product_overview_card"
                  className={`group flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:text-zinc-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 ${
                    singlePlan ? "w-full lg:w-48" : "mt-5"
                  }`}
                >
                  <span>{copy.viewPlan}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
