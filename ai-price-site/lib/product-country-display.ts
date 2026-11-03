import type { ExchangeRateSnapshot } from "./exchange-rates";
import type { ProductPlan, RegionPrice } from "./public-pricing-model";

type CountryPlan = ProductPlan & { region?: RegionPrice };
export type CountryMetricQuote = Pick<RegionPrice, "code" | "country" | "priceUsd" | "localPrice" | "taxTreatment" | "fxRateDate" | "lastCheckedAt">;
export type ProductCountryRow = {
  slug: string; name: string; billing: ProductPlan["billing"]; region: RegionPrice;
  us?: CountryMetricQuote; highest: CountryMetricQuote; count: number;
  nearby: Pick<RegionPrice,"country" | "priceUsd">[];
};
const metricQuote = (r: RegionPrice): CountryMetricQuote => ({code:r.code,country:r.country,priceUsd:r.priceUsd,localPrice:r.localPrice,taxTreatment:r.taxTreatment,fxRateDate:r.fxRateDate,lastCheckedAt:r.lastCheckedAt});

/** Projection only: getCountryPricingPlans already selects the canonical monthly iOS rows. */
export function productCountryRows(plans: CountryPlan[]): ProductCountryRow[] {
  return plans.filter((p): p is CountryPlan & {region:RegionPrice} => Boolean(p.region)).map(plan => {
    const us=plan.regions.find(r=>r.code.toUpperCase()==="US");
    const index=plan.regions.findIndex(r=>r.code===plan.region.code);
    return {slug:plan.slug,name:plan.name,billing:plan.billing,region:plan.region,
      us:us ? metricQuote(us) : undefined,highest:metricQuote(plan.regions.reduce((high,r)=>r.priceUsd>high.priceUsd?r:high,plan.region)),
      count:plan.regions.length,nearby:[plan.regions[index-1],plan.regions[index+1]].filter((r): r is RegionPrice=>Boolean(r)).map(r=>({country:r.country,priceUsd:r.priceUsd}))};
  });
}

export function usableCountryDisplayRate(rate: ExchangeRateSnapshot | undefined) {
  return Boolean(rate && !rate.isFallback && !rate.isExpired && Number.isFinite(rate.rate) && rate.rate>0);
}
