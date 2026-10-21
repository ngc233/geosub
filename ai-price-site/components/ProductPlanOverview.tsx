import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatUsd, getPlanStats, type SubscriptionProduct } from "../lib/public-pricing-model";
import { getPricingPlanPath } from "../lib/pricing-routes";
import {
  getPricingProductOverviewCopy,
  getProductOverviewDecisionPlans,
  getProductOverviewRegionCount,
  getProductOverviewPriceFact,
} from "../lib/pricing-product-overview-copy";
import type { SiteLocale } from "../lib/site-locale";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import { getProductEditorialContent } from "../lib/product-editorial-content";
import { getMonthlyAppStoreComparison, hasPlanComparison } from "../lib/plan-comparison";
import styles from "./ManagedContent.module.css";

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
  const regionCount = getProductOverviewRegionCount(product);
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

  // Reuse this overview's published plans and editorial records. The compact
  // comparison is scoped to the approved English page; other layouts stay intact.
  if (hasPlanComparison(locale, product.slug)) {
    const rows = getMonthlyAppStoreComparison(product);
    return (
      <section id="compare-plans" aria-labelledby="compare-plans-title" className={`${styles.scope} scroll-mt-20 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-[var(--color-text-primary)]`}>
        <h2 id="compare-plans-title" className="text-xl font-semibold text-[var(--color-text-primary)]">Compare ChatGPT plans</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          Choose by your usage, then open a plan for prices by country. The US prices below compare monthly App Store subscriptions in USD. Regional availability, account eligibility and checkout taxes still need to be confirmed at purchase.
        </p>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm">No published plans are available for comparison yet.</p>
        ) : (
          <table className="mt-4 block w-full text-left text-sm md:table">
            <caption className="sr-only">Published plans with US monthly App Store prices and regional coverage</caption>
            <thead className="hidden text-[var(--color-text-secondary)] md:table-header-group">
              <tr><th scope="col" className="p-3">Plan</th><th scope="col" className="p-3">US / month</th><th scope="col" className="p-3">Choose when</th><th scope="col" className="p-3">App Store coverage</th></tr>
            </thead>
            <tbody className="block md:table-row-group">
              {rows.map(({ plan, usPrice, collectedAt, regionCount, freshness }) => {
                const editorial = getProductEditorialContent(locale, product.slug, plan.slug);
                return (
                  <tr key={plan.slug} className="block border-t border-[var(--color-border-default)] py-3 align-top md:table-row md:py-0">
                    <th scope="row" className="block px-3 md:table-cell md:py-3">
                      <Link href={getPricingPlanPath(locale, product.category, product.slug, plan.slug)} data-track-event="select_plan" data-track-name="Open plan country pricing" data-track-button={`${product.slug}:${plan.slug}`} data-track-placement="product_overview_comparison" className="inline-flex min-h-11 items-center gap-2 rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">
                        {plan.name}<ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                      </Link>
                    </th>
                    <td className="block px-3 py-2 md:table-cell md:py-3">
                      <span className="block text-[var(--color-text-secondary)] md:hidden">US / month</span>
                      <span className="tabular-nums font-semibold">{usPrice === undefined ? "Not available" : `${formatUsd(usPrice)} USD`}</span>
                      {collectedAt ? <span className="mt-1 block text-xs leading-5 text-[var(--color-text-secondary)]">Price collected {collectedAt.slice(0, 10)}</span> : null}
                    </td>
                    <td className="block px-3 py-2 leading-6 md:table-cell md:py-3">
                      <span className="block text-[var(--color-text-secondary)] md:hidden">Choose when</span>
                      {editorial ? <><p>{editorial.plan.bestFor}</p><p className="mt-1 text-[var(--color-text-secondary)]">{editorial.plan.difference}</p></> : <p>Check the official plan details for current benefits.</p>}
                    </td>
                    <td className="block px-3 py-2 md:table-cell md:py-3">
                      <span className="block text-[var(--color-text-secondary)] md:hidden">App Store coverage</span>
                      <span>{regionCount > 0 ? `${regionCount} regions` : "Not available"}</span>
                      {freshness.priceCollectedAt ? <span className="mt-1 block text-xs leading-5 text-[var(--color-text-secondary)]">Latest collection {freshness.priceCollectedAt}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">Prices and plan names follow the published regional dataset. Missing US monthly App Store prices are shown as unavailable. Open a plan to check its sources, collection dates and regional prices; confirm current benefits and usage limits with OpenAI.</p>
      </section>
    );
  }

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
                        {copy.regions(new Set(plan.regions.map((region) => region.code)).size)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">{copy.channel}</div>
                      <div className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        {plan.regions[0]?.billingPlatform === "web" ? "Web" : ["android", "google_play"].includes(plan.regions[0]?.billingPlatform || "") ? "Google Play" : "App Store"}
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
