import { PublicMoney, PublicCurrencyLabel, PublicFxNote, PublicPriceCopy } from "./PricingDisplayContext";
import Link from "next/link";
import type { ReactNode } from "react";
import { PublicEvidence } from "./ui/PublicControls";
import CountryIdentity from "./CountryIdentity";
import { ArrowRight } from "lucide-react";
import { formatUsd, getPlanStats, type SubscriptionProduct } from "../lib/public-pricing-model";
import { getPricingPlanPath } from "../lib/pricing-routes";
import {
  getPricingProductOverviewCopy,
  getProductOverviewDecisionPlans,
  getProductOverviewRegionCount,
  getProductOverviewPriceFact,
  getProductOverviewLowestQuote,
} from "../lib/pricing-product-overview-copy";
import type { SiteLocale } from "../lib/site-locale";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import { getProductEditorialContent } from "../lib/product-editorial-content";
import { hasPlanComparison } from "../lib/plan-comparison";
import ProductRegionComparison from "./ProductRegionComparison";
import {getPlanTabLabel} from "../lib/pricing-labels";
import {taxSummary} from "../lib/pricing-r2";
import {countryPagePilots,getCountryPagePilotPath} from "../lib/country-page-pilot";
import PublishedPlanComparison from "./PublishedPlanComparison";
import styles from "./ManagedContent.module.css";
import { claudeOverviewEvidence, hasClaudeOverviewDecision } from "../lib/claude-overview-decision";
import { disneyOverviewEvidence, hasDisneyOverviewDecision } from "../lib/disney-overview-decision";

function PlanNotes({ unified, children }: { unified: boolean; children: ReactNode }) {
  return unified ? <PublicEvidence animated title="价格范围与套餐说明">{children}</PublicEvidence> : children;
}

export default function ProductPlanOverview({
  product,
  locale,
  appearance,
}: {
  product: SubscriptionProduct;
  locale: SiteLocale;
  appearance?: "public";
}) {
  const unified = appearance === "public";
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

  if (hasClaudeOverviewDecision(locale, product.slug) || hasDisneyOverviewDecision(locale, product.slug)) {
    const disney = hasDisneyOverviewDecision(locale, product.slug);
    const guide = disney ? disneyOverviewEvidence : claudeOverviewEvidence;
    const purchaseTitleId = `${product.slug}-overview-purchase-title`;
    return <>
      <PublishedPlanComparison product={product} locale={locale} planSlugs={disney ? ["standard-with-ads", "standard", "premium"] : ["pro", "max-5x", "max-20x"]} showLowestPrices={!disney}
        referenceMarket={disney ? disneyOverviewEvidence.referenceMarket : undefined} choiceColumnLabel={disney ? "UK plan features" : undefined}
        title={guide.comparisonTitle} intro={guide.comparisonIntro} footer={guide.comparisonFooter} choices={guide.choices} placement={`${product.slug}_overview_comparison`} />
      <section aria-labelledby={purchaseTitleId} className={`${styles.scope} rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-sm leading-6 text-[var(--color-text-secondary)]`}>
        <h2 id={purchaseTitleId} className="text-xl font-semibold text-[var(--color-text-primary)]">{guide.purchaseTitle}</h2>
        {guide.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3">{paragraph}</p>)}
        <ul className="mt-3 flex flex-col items-start">
          {guide.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">{source.label}</a></li>)}
        </ul>
        <p className="mt-2 text-xs">Benefit and eligibility guidance checked: {guide.checkedAt}. Price collection dates are shown separately for each quote above.</p>
      </section>
    </>;
  }

  // Reuse this overview's published plans and editorial records. The compact
  // comparison is scoped to the approved English page; other layouts stay intact.
  if (hasPlanComparison(locale, product.slug)) {
    return <PublishedPlanComparison product={product} locale={locale} title="Compare ChatGPT plans"
      intro="Choose by your usage, then open a plan for prices by country. The US prices below compare monthly App Store subscriptions in USD. Regional availability, account eligibility and checkout taxes still need to be confirmed at purchase."
      footer="Prices and plan names follow the published regional dataset. Missing US monthly App Store prices are shown as unavailable. Open a plan to check its sources, collection dates and regional prices; confirm current benefits and usage limits with OpenAI." />;
  }

  return (
    <section data-gs-overview={unified ? "" : undefined} className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
      <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
        {copy.heading}
      </h2>
      {!singlePlan ? (
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {unified ? <PublicPriceCopy text={copy.intro} value={getProductOverviewLowestQuote(product)?.stats.minRegion.priceUsd} /> : copy.intro}
        </p>
      ) : null}
      {!singlePlan && overviewEditorial ? (
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {overviewEditorial.summary}
        </p>
      ) : null}
      {locale === "en" && product.slug === "grok" && decisionPlans.some((plan) => plan.slug === "super") ? (
        <p className={`${styles.scope} text-sm leading-6 text-[var(--color-text-secondary)]`}>
          Comparing App Store SuperGrok with the current website offer?{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Scoped native-fragment RFC: docs/grok-super-decision-2026-10-23.md */}
          <a href="/en/ai-pricing/grok/super#compare-plans" className="inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Compare the collected app plans and check new versus existing subscriber eligibility</a>. The website&apos;s new subscription names do not identify these App Store listings.
        </p>
      ) : null}
      {locale === "en" && product.slug === "gemini" && ["pro", "ultra"].every((slug) => decisionPlans.some((plan) => plan.slug === slug)) ? (
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Considering the higher tier? <Link href="/en/ai-pricing/gemini/ultra#compare-plans" className="inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Compare Pro with Ultra and check purchase eligibility</Link> before choosing a country price.
        </p>
      ) : null}

      {locale === "en" && product.slug === "youtube-premium" && decisionPlans.some((plan) => plan.slug === "family") ? (
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          Sharing with your household? <Link href="/en/streaming-pricing/youtube-premium/family#compare-plans" className="inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">Compare Individual, Family and Premium Lite</Link> and check the same-address requirements before choosing a regional price.
        </p>
      ) : null}

      {unified && <PublicFxNote />}
      <div
        data-gs-plan-count={unified ? decisionPlans.length : undefined} data-gs-plan-cards={unified ? "" : undefined}
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
                      {unified ? getPlanTabLabel(product.name,plan.name) : plan.name}
                    </h3>
                    <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                      {getBillingCycleLabel(plan.billing, locale)}
                    </span>
                  </div>

                  {unified && <div className="gs-overview-lowest">
                    <p><span className="gs-overview-lowest-full-label">最低地区价格 · <PublicCurrencyLabel /></span><span className="gs-overview-lowest-short-label">最低价</span></p><strong><PublicMoney value={stats.minRegion.priceUsd} /></strong>
                    <span><CountryIdentity code={stats.minRegion.code} />{stats.minRegion.country}</span>
                  </div>}

                  <PlanNotes unified={unified}>
                  <div className={`mt-4 grid gap-4 text-sm ${singlePlan ? "sm:grid-cols-3" : "grid-cols-2"}`}>
                    <div className={singlePlan ? "" : "col-span-2"}>
                      <div className="text-xs text-zinc-400">{unified ? <><PublicCurrencyLabel /> 价格范围</> : copy.priceRange}</div>
                      <div data-gs-overview-range={unified ? "" : undefined} className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        {unified ? <><PublicMoney value={stats.minRegion.priceUsd} /> – <PublicMoney value={stats.maxRegion.priceUsd} /></> : <>{formatUsd(stats.minRegion.priceUsd)} – {formatUsd(stats.maxRegion.priceUsd)}</>}
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
                  </PlanNotes>
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
      {unified && <ProductRegionComparison plans={decisionPlans.map(plan=>({slug:plan.slug,name:getPlanTabLabel(product.name,plan.name),billing:plan.billing,platform:plan.regions[0]?.billingPlatform||"unknown",href:getPricingPlanPath("zh",product.category,product.slug,plan.slug),regions:plan.regions.map(region=>({code:region.code,country:region.country,priceUsd:region.priceUsd,localPrice:region.localPrice,tax:taxSummary(region),lastCheckedAt:region.lastCheckedAt,fxRateDate:region.fxRateDate,observationId:region.observationId}))}))} regionLinks={Object.fromEntries(countryPagePilots.filter(pilot=>pilot.productSlug===product.slug&&pilot.category===product.category&&!pilot.releaseBlockers?.length).map(pilot=>[pilot.countryCode,getCountryPagePilotPath(pilot,"zh")]))}/>}
    </section>
  );
}
