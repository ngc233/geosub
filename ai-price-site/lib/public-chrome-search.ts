import type { SubscriptionProduct } from "./public-pricing-model.ts";
import { getDefaultPlanRegions, getPlanStats } from "./public-pricing-model.ts";
import { getProductOverviewDecisionPlans } from "./pricing-product-overview-copy.ts";
import { getPricingPagePlan } from "./pricing-page-facts.ts";
import { getPricingPlanPath } from "./pricing-routes.ts";
import type { PublicSearchResult } from "./public-search.ts";
export type ChromeSearchResult = { id:string; kind:"product"|"plan"|"country"; title:string; subtitle:string; href:string; minimumUsd:number; cycle:string };

/** Bound detail reads before loading: product and plan groups share at most three products. */
export function selectChromeSearchCandidates(results: PublicSearchResult[]) {
  const ranked = results.filter(result => result.kind === "product" || result.kind === "plan")
    .sort((a,b) => b.score-a.score || a.title.localeCompare(b.title));
  const slugs = new Set([...new Set(ranked.map(result => result.logoSlug))].slice(0,3));
  return ["product","plan"].flatMap(kind => ranked.filter(result => result.kind === kind && slugs.has(result.logoSlug)).slice(0,3));
}

/** Match ProductPlanOverview and PricingDetailPage; no search-only freshness/quality policy. */
export function minimumSearchPrice(product: SubscriptionProduct, planSlug?:string) {
  let plans;
  if (planSlug) {
    const plan = product.plans.find(plan => plan.slug === planSlug);
    const contentPlan = plan && getPricingPagePlan(plan, getPricingPlanPath("zh",product.category,product.slug,plan.slug));
    // PricingPlatformView selects the default platform even for locked Plus copy.
    plans = contentPlan ? [{...contentPlan,regions:getDefaultPlanRegions(contentPlan)}] : [];
  } else {
    const decisionPlans = getProductOverviewDecisionPlans(product);
    const monthly = decisionPlans.filter(plan => plan.billing === "monthly");
    plans = monthly.length ? monthly : decisionPlans;
  }
  return plans.filter(plan => plan.regions.length > 0).map(plan => {
    const region = getPlanStats(plan).minRegion;
    return {usd:region.priceUsd,country:region.country,cycle:plan.billing,plan:plan.name};
  }).sort((a,b)=>a.usd-b.usd)[0] ?? null;
}

/** Country page rows already carry eligibility and FX decisions; null USD is not a price. */
export function minimumCountrySearchPrice<T extends {usd:number|null}>(rows: T[]): T | null {
  return rows.reduce<T|null>((minimum,row) => row.usd !== null && (minimum === null || row.usd < minimum.usd!) ? row : minimum,null);
}
