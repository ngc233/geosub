import type { SubscriptionProduct } from "./public-pricing-model.ts";
import { getDefaultPlanRegions } from "./public-pricing-model.ts";
export type ChromeSearchResult = { id:string; kind:"product"|"plan"|"country"; title:string; subtitle:string; href:string; minimumUsd:number; cycle:string };
/** No fallback prices: use the destination's default platform and verified, recent rows. */
export function minimumSearchPrice(product: SubscriptionProduct, planSlug?:string, now=Date.now()) {
  const plans = planSlug ? product.plans.filter(plan=>plan.slug===planSlug) : product.plans;
  const candidates = plans.flatMap(plan=>getDefaultPlanRegions(plan).filter(region=> {
    const age=now-Date.parse(region.lastCheckedAt || "");
    return region.dataQuality === "verified" && Number.isFinite(region.priceUsd) && region.priceUsd>0 && age>=0 && age<=7*86400000;
  }).map(region=>({usd:region.priceUsd,country:region.country,cycle:plan.billing,plan:plan.name})));
  // Product result identifies the winning plan/cycle rather than implying mixed cycles are monthly.
  return candidates.sort((a,b)=>a.usd-b.usd)[0] ?? null;
}
