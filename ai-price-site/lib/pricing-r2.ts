import type { RegionPrice } from "./public-pricing-model.ts";

export type PriceRelation = "all" | "lower" | "same" | "higher";

/** Representative preview, explicitly includes the real US and high endpoint. */
export function pricePreview(regions: RegionPrice[]) {
  if (regions.length <= 5) return regions;
  return [...regions.slice(0, 3), ...regions.filter(region => region.code === "US"), regions[regions.length - 1]]
    .filter((region, index, items) => items.findIndex(item => item.code === region.code) === index)
    .sort((a, b) => regions.indexOf(a) - regions.indexOf(b));
}

export function priceDifference(price: number, baseline?: number) {
  return baseline && baseline > 0 ? Math.round((price / baseline - 1) * 100) : null;
}

export function taxSummary(region: Pick<RegionPrice, "taxTreatment">, english = false) {
  if (region.taxTreatment === "included_likely") return english ? "Usually included" : "通常含税";
  if (region.taxTreatment === "checkout_may_add" || region.taxTreatment === "varies_by_region") {
    return english ? "Tax may be added" : "税费另计";
  }
  return english ? "Tax unconfirmed" : "税费待核验";
}

export function dateRange(values: (string | undefined)[]) {
  const dates = values.filter((v): v is string => Boolean(v && !Number.isNaN(Date.parse(v))))
    .map(v => v.slice(0, 10)).sort();
  if (!dates.length) return "—";
  return dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} – ${dates.at(-1)}`;
}

export function matchesRelation(region: RegionPrice, baseline: number | undefined, relation: PriceRelation) {
  if (relation === "all") return true;
  const difference = priceDifference(region.priceUsd, baseline);
  if (difference === null) return false;
  return relation === "lower" ? difference < 0 : relation === "higher" ? difference > 0 : difference === 0;
}
