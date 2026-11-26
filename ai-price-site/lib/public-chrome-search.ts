import type { SubscriptionProduct } from "./public-pricing-model.ts";
import { getDefaultPlanRegions, getPlanStats } from "./public-pricing-model.ts";
import { getProductOverviewDecisionPlans } from "./pricing-product-overview-copy.ts";
import { getPricingPagePlan } from "./pricing-page-facts.ts";
import { getPricingPlanPath } from "./pricing-routes.ts";
import { scoreSearchText, type PublicSearchResult } from "./public-search.ts";
import type { SiteLocale } from "./site-locale.ts";

export type ChromeSearchResult = {
  id: string;
  kind: "product" | "plan" | "country";
  title: string;
  subtitle: string;
  href: string;
  minimumUsd: number;
  cycle?: string;
  logoSlug?: string;
  countryCode?: string;
};

export type ChromeSearchCatalogEntry = ChromeSearchResult & {
  terms: string[];
};

export type ChromePopularItem = {
  id: string;
  title: string;
  href: string;
  logoSlug?: string;
  countryCode?: string;
};

export type ChromeSearchIndexPayload = {
  entries: ChromeSearchCatalogEntry[];
  popular: ChromePopularItem[];
};

/** Bound detail reads before loading: product and plan groups share at most three products. */
export function selectChromeSearchCandidates(results: PublicSearchResult[]) {
  const ranked = results
    .filter((result) => result.kind === "product" || result.kind === "plan")
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const slugs = new Set([...new Set(ranked.map((result) => result.logoSlug))].slice(0, 3));
  return ["product", "plan"].flatMap((kind) =>
    ranked.filter((result) => result.kind === kind && slugs.has(result.logoSlug)).slice(0, 3),
  );
}

/** Instant client- or server-side matcher over the prebuilt Chrome search catalog. */
export function matchChromeSearchCatalog(
  entries: ChromeSearchCatalogEntry[],
  rawQuery: string,
): ChromeSearchResult[] {
  const query = rawQuery.trim();
  if (!query) return [];

  const stripTerms = (entry: ChromeSearchCatalogEntry): ChromeSearchResult => ({
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    subtitle: entry.subtitle,
    href: entry.href,
    minimumUsd: entry.minimumUsd,
    cycle: entry.cycle,
    countryCode: entry.countryCode,
    logoSlug: entry.logoSlug,
  });

  const scoredProductsAndPlans = entries
    .filter((entry) => entry.kind === "product" || entry.kind === "plan")
    .flatMap((entry) => {
      const base = scoreSearchText(query, entry.terms, 1);
      if (base <= 0) return [];
      const boost = entry.kind === "product" ? 20 : 10;
      return [{ entry, score: base + boost }];
    })
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));

  const topSlugs = new Set(
    [...new Set(scoredProductsAndPlans.map((item) => item.entry.logoSlug).filter(Boolean))].slice(0, 3),
  );

  const selectedProductPlans = (["product", "plan"] as const).flatMap((kind) =>
    scoredProductsAndPlans
      .filter((item) => item.entry.kind === kind && topSlugs.has(item.entry.logoSlug))
      .slice(0, 3)
      .map((item) => stripTerms(item.entry)),
  );

  const selectedCountries = entries
    .filter((entry) => entry.kind === "country")
    .flatMap((entry) => {
      const score = scoreSearchText(query, entry.terms, 1);
      return score > 0 ? [{ entry, score }] : [];
    })
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, 3)
    .map((item) => stripTerms(item.entry));

  return [...selectedProductPlans, ...selectedCountries];
}

/** Match ProductPlanOverview and PricingDetailPage; no search-only freshness/quality policy. */
export function minimumSearchPrice(
  product: SubscriptionProduct,
  planSlug?: string,
  locale: SiteLocale = "zh",
) {
  let plans;
  if (planSlug) {
    const plan = product.plans.find((plan) => plan.slug === planSlug);
    const contentPlan =
      plan && getPricingPagePlan(plan, getPricingPlanPath(locale, product.category, product.slug, plan.slug));
    // PricingPlatformView selects the default platform even for locked Plus copy.
    plans = contentPlan ? [{ ...contentPlan, regions: getDefaultPlanRegions(contentPlan) }] : [];
  } else {
    const decisionPlans = getProductOverviewDecisionPlans(product);
    const monthly = decisionPlans.filter((plan) => plan.billing === "monthly");
    plans = monthly.length ? monthly : decisionPlans;
  }
  return (
    plans
      .filter((plan) => plan.regions.length > 0)
      .map((plan) => {
        const region = getPlanStats(plan).minRegion;
        return { usd: region.priceUsd, country: region.country, cycle: plan.billing, plan: plan.name };
      })
      .sort((a, b) => a.usd - b.usd)[0] ?? null
  );
}

/** Country page rows already carry eligibility and FX decisions; null USD is not a price. */
export function minimumCountrySearchPrice<T extends { usd: number | null }>(rows: T[]): T | null {
  return rows.reduce<T | null>(
    (minimum, row) => (row.usd !== null && (minimum === null || row.usd < minimum.usd!) ? row : minimum),
    null,
  );
}
