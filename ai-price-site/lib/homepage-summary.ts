import { getChinesePlanDisplayName, getPlanTabLabel } from "./pricing-labels.ts";
import { priorityCountries, type getComparablePriceRows, type HubRate } from "./country-hubs.ts";
import type { getHomepageRepresentatives } from "./homepage-representatives.ts";

type Rows = ReturnType<typeof getComparablePriceRows>;
type Representatives = ReturnType<typeof getHomepageRepresentatives>["representatives"];
export function homepageStatistics(rows: Rows) {
  if (!rows.length) return null;
  const times = rows.flatMap(row => row.checkedAt && Number.isFinite(Date.parse(row.checkedAt)) ? [row.checkedAt] : []);
  return { products: new Set(rows.map(row => row.productSlug)).size,
    regions: new Set(rows.map(row => row.countryCode)).size, prices: rows.length,
    updatedAt: times.sort((a,b) => Date.parse(b)-Date.parse(a))[0] ?? null };
}
export function homepageProducts(representatives: Representatives) {
  return representatives.map(rep => {
    const first = rep.prices[0];
    const prices = rep.prices.map(row => ({ code: row.countryCode, usd: row.usd }));
    const lowest = prices.reduce((a,b) => a.usd <= b.usd ? a : b);
    return { slug: rep.productSlug, name: first.productName, plan: getPlanTabLabel(first.productName, getChinesePlanDisplayName(first.productName, first.planName)),
      planDisplayName: getChinesePlanDisplayName(first.productName, first.planName), category: first.category,
      href: `/zh/${first.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${rep.productSlug}/${rep.planSlug}/`,
      productHref: `/zh/${first.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${rep.productSlug}/`,
      usPrice: rep.usPrice, prices, lowest, saving: (rep.usPrice-lowest.usd)/rep.usPrice };
  });
}
export type HomepageRepresentative = ReturnType<typeof homepageProducts>[number];
/** D8: each product/plan/platform/cycle has one vote, including negative savings.
 * Minimum five comparable plans. No rounded `difference`, no US-as-country row. */
export function homepageCountries(rows: Rows) {
  const countries = new Map<string,Map<string,number>>();
  for (const row of rows) {
    if (row.countryCode === "US" || !row.usPrice || !Number.isFinite(row.usPrice) || row.usPrice <= 0) continue;
    const plans = countries.get(row.countryCode) ?? new Map<string,number>();
    const key = JSON.stringify([row.productSlug,row.planSlug,row.platform,row.billingCycle]);
    if (!plans.has(key)) plans.set(key,1-row.usd/row.usPrice);
    countries.set(row.countryCode,plans);
  }
  return [...countries].flatMap(([code,plans]) => {
    if (plans.size < 5) return [];
    const values = [...plans.values()].sort((a,b)=>a-b), middle = Math.floor(values.length/2);
    const median = values.length%2 ? values[middle] : (values[middle-1]+values[middle])/2;
    const country = priorityCountries.find(item=>item.code===code);
    return [{ code, median, count: values.length, cheaper: values.filter(value=>value>0).length,
      href: country ? `/zh/countries/${country.slug}` : null }];
  }).sort((a,b)=>b.median-a.median || a.code.localeCompare(b.code));
}
export function homepageDisplayRates(rates: Record<string,HubRate>, now = new Date()) {
  return Object.fromEntries([["USD",1],...Object.entries(rates).filter(([,rate])=>{
    const age = rate.fetchedAt ? now.getTime()-Date.parse(rate.fetchedAt) : Infinity;
    return rate.rate>0 && Number.isFinite(rate.rate) && rate.source && rate.rateDate && !rate.isFallback
      && !rate.isStale && !rate.isExpired && age>=0 && age<=18*3_600_000;
  }).map(([code,rate])=>[code,rate.rate])]) as Record<string,number>;
}
