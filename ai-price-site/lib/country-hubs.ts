import { getAppStoreSourceUrl, isObservationId } from "./price-records.ts";

export const priorityCountries = [
  { slug: "turkey", code: "TR", zh: "土耳其", en: "Turkey" },
  { slug: "india", code: "IN", zh: "印度", en: "India" },
  { slug: "philippines", code: "PH", zh: "菲律宾", en: "Philippines" },
  { slug: "japan", code: "JP", zh: "日本", en: "Japan" },
] as const;
export type HubLocale = "zh" | "en";
export function getPriorityCountry(slug: string) { return priorityCountries.find(country => country.slug === slug); }
export type CountryHubPrice = {
  productSlug: string; productName: string; category: "ai" | "streaming";
  planSlug: string; planName: string; countryCode: string; amount: number; currency: string;
  platform: string; billingCycle: string; priceType: string; quality: string; confidence: number;
  checkedAt: string | null; sourceUrl: string | null; observationId: string | null;
};
type HubRate = { rate: number; source: string | null; rateDate: string | null; fetchedAt: string | null; isFallback: boolean; isStale?: boolean; isExpired?: boolean };
export function getCountryHubRows(prices: CountryHubPrice[], countryCode: string, rates: Record<string, HubRate>, now = new Date()) {
  const valid = prices.filter(price => price.platform === "ios" && price.billingCycle === "monthly"
    && price.priceType === "list_price" && price.quality === "verified" && price.confidence >= 80
    && Number.isFinite(price.amount) && price.amount > 0 && /^[A-Z]{3}$/.test(price.currency)
    && Boolean(price.checkedAt) && now.getTime() - Date.parse(price.checkedAt!) >= 0
    && now.getTime() - Date.parse(price.checkedAt!) <= 14 * 86_400_000
    && Boolean(getAppStoreSourceUrl(price.sourceUrl, price.countryCode)));
  const convert = (price: CountryHubPrice) => {
    if (price.currency === "USD") return { usd: price.amount, fxDate: null };
    const rate = rates[price.currency];
    const age = rate?.fetchedAt ? now.getTime() - Date.parse(rate.fetchedAt) : Infinity;
    if (!rate || rate.rate <= 0 || !Number.isFinite(rate.rate) || !rate.source || !rate.rateDate
      || rate.isFallback || rate.isStale || rate.isExpired || !Number.isFinite(age) || age < 0 || age > 18 * 3_600_000) return null;
    return { usd: price.amount / rate.rate, fxDate: rate.rateDate };
  };
  return valid.filter(price => price.countryCode === countryCode).map(price => {
    const converted = convert(price);
    const us = valid.find(other => other.countryCode === "US" && other.productSlug === price.productSlug
      && other.planSlug === price.planSlug && other.platform === price.platform && other.billingCycle === price.billingCycle);
    const reference = us ? convert(us) : null;
    return { ...price, sourceUrl: getAppStoreSourceUrl(price.sourceUrl, price.countryCode)!,
      observationId: price.observationId && isObservationId(price.observationId) ? price.observationId : null,
      usd: converted?.usd ?? null, fxDate: converted?.fxDate ?? null,
      usPrice: reference?.usd ?? null,
      difference: converted && reference ? (Math.round((converted.usd / reference.usd - 1) * 100) || 0) : null };
  }).sort((a, b) => (a.difference ?? Infinity) - (b.difference ?? Infinity) || a.productName.localeCompare(b.productName) || a.planName.localeCompare(b.planName));
}
