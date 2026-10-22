import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatUsd, type SubscriptionProduct } from "../lib/public-pricing-model";
import { getPricingPlanPath } from "../lib/pricing-routes";
import { getProductEditorialContent } from "../lib/product-editorial-content";
import { getMonthlyAppStoreComparison } from "../lib/plan-comparison";
import type { SiteLocale } from "../lib/site-locale";
import styles from "./ManagedContent.module.css";

// A shared presenter keeps the common-country price and mobile table rules identical.
export default function PublishedPlanComparison({ product, locale, title, intro, footer, planSlugs, choices, showLowestPrices = false, placement = "product_overview_comparison" }: {
  product: SubscriptionProduct;
  locale: SiteLocale;
  title: string;
  intro: string;
  footer: string;
  planSlugs?: readonly string[];
  choices?: Record<string, { bestFor: string; difference: string }>;
  placement?: string;
  showLowestPrices?: boolean;
}) {
  const rows = getMonthlyAppStoreComparison(product).filter(({ plan }) => !planSlugs || planSlugs.includes(plan.slug));
  return (
      <section id="compare-plans" aria-labelledby="compare-plans-title" className={`${styles.scope} scroll-mt-20 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-[var(--color-text-primary)]`}>
        <h2 id="compare-plans-title" className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          {intro}
        </p>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm">No published plans are available for comparison yet.</p>
        ) : (
          <table className="mt-4 block w-full text-left text-sm md:table">
            <caption className="sr-only">{showLowestPrices ? "Each plan's lowest reviewed monthly App Store price, US monthly price and regional coverage" : "Published plans with US monthly App Store prices and regional coverage"}</caption>
            <thead className="hidden text-[var(--color-text-secondary)] md:table-header-group">
              <tr><th scope="col" className="p-3">Plan</th><th scope="col" className="p-3">{showLowestPrices ? "Monthly App Store prices" : "US / month"}</th><th scope="col" className="p-3">Choose when</th><th scope="col" className="p-3">App Store coverage</th></tr>
            </thead>
            <tbody className="block md:table-row-group">
              {rows.map(({ plan, usPrice, collectedAt, regionCount, freshness, lowest }) => {
                const editorial = getProductEditorialContent(locale, product.slug, plan.slug);
                const choice = choices?.[plan.slug] ?? editorial?.plan;
                return (
                  <tr key={plan.slug} className="block border-t border-[var(--color-border-default)] py-3 align-top md:table-row md:py-0">
                    <th scope="row" className="block px-3 md:table-cell md:py-3">
                      <Link href={getPricingPlanPath(locale, product.category, product.slug, plan.slug)} data-track-event="select_plan" data-track-name="Open plan country pricing" data-track-button={`${product.slug}:${plan.slug}`} data-track-placement={placement} className="inline-flex min-h-11 items-center gap-2 rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">
                        {plan.name}<ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                      </Link>
                    </th>
                    <td className="block px-3 py-2 md:table-cell md:py-3">
                      <span className={`block text-[var(--color-text-secondary)]${showLowestPrices ? "" : " md:hidden"}`}>US / month</span>
                      <span className="tabular-nums font-semibold">{usPrice === undefined ? "Not available" : `${formatUsd(usPrice)} USD`}</span>
                      {collectedAt ? <span className="mt-1 block text-xs leading-5 text-[var(--color-text-secondary)]">Price collected {collectedAt.slice(0, 10)}</span> : null}
                      {showLowestPrices ? <div data-plan-lowest-price className="mt-3 leading-6">
                        <span className="block text-[var(--color-text-secondary)]">Lowest reviewed / month</span>
                        {lowest ? <>
                          <span className="block font-semibold">{lowest.country}</span>
                          <span className="block tabular-nums">{lowest.localPrice} · {lowest.currencyCode}</span>
                          <span className="block tabular-nums">≈ {formatUsd(lowest.priceUsd)} USD</span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--color-text-secondary)]">Price collected {lowest.lastCheckedAt!.slice(0, 10)}</span>
                        </> : <span>Not available</span>}
                      </div> : null}
                    </td>
                    <td className="block px-3 py-2 leading-6 md:table-cell md:py-3">
                      <span className="block text-[var(--color-text-secondary)] md:hidden">Choose when</span>
                      {choice ? <><p>{choice.bestFor}</p><p className="mt-1 text-[var(--color-text-secondary)]">{choice.difference}</p></> : <p>Check the official plan details for current benefits.</p>}
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
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">{footer}</p>
      </section>
  );
}
