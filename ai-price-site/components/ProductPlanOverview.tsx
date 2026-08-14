import Link from "next/link";
import { formatUsd, getPlanStats, type SubscriptionProduct } from "../lib/public-pricing-model";
import { getPricingPlanPath } from "../lib/pricing-routes";
import { getPricingProductOverviewCopy } from "../lib/pricing-product-overview-copy";
import type { SiteLocale } from "../lib/site-locale";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";

export default function ProductPlanOverview({
  product,
  locale,
}: {
  product: SubscriptionProduct;
  locale: SiteLocale;
}) {
  const publishedPlans = product.plans.filter((plan) => plan.regions.length > 0);
  const regionCount = new Set(
    publishedPlans.flatMap((plan) => plan.regions.map((region) => region.code)),
  ).size;
  const copy = getPricingProductOverviewCopy({
    locale,
    productName: product.name,
    planCount: publishedPlans.length,
    regionCount,
  });

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
      <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
        {copy.heading}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {copy.intro}
      </p>

      <div
        className={`mt-5 grid gap-3 md:grid-cols-2 ${
          publishedPlans.length === 4 ? "xl:grid-cols-2" : "xl:grid-cols-3"
        }`}
      >
        {publishedPlans.map((plan) => {
          const stats = getPlanStats(plan);
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

              <Link
                href={href}
                className="mt-auto inline-flex pt-5 text-sm font-semibold text-lime-700 transition hover:text-lime-900 dark:text-lime-300 dark:hover:text-lime-200"
              >
                {copy.viewPlan}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
