import type { CountryHubPrice } from "./country-hubs.ts";
import type { readVerifiedPriceSource } from "./verified-price-source.ts";

type Source = Awaited<ReturnType<typeof readVerifiedPriceSource>>;
type Plan = [productSlug: string, productName: string, category: CountryHubPrice["category"],
  planSlug: string, planName: string, platform: string, billingCycle: string, priceType: string, quality: string];
type Price = [plan: number, countryCode: string, amount: number, currency: string, confidence: number,
  checkedAt: string | null, sourceUrl: string | null, observationId: string | null];
type CompactSource = { plans: Plan[]; prices: Price[]; rates: Source["rates"] };

// Lossless cache transport only. Preserve evidence URLs, IDs, FX metadata and
// every quality field; eligibility/freshness are still checked after decoding.
export function packVerifiedPriceSource(source: Source): CompactSource {
  const plans: Plan[] = [];
  const indices = new Map<string, number>();
  const prices = source.prices.map((price): Price => {
    const plan: Plan = [price.productSlug, price.productName, price.category, price.planSlug, price.planName,
      price.platform, price.billingCycle, price.priceType, price.quality];
    // Include all shared values, not just the slug, so inconsistent names or
    // quality/platform/cycle fields can never silently overwrite another row.
    const key = JSON.stringify(plan);
    let index = indices.get(key);
    if (index === undefined) {
      index = plans.length;
      plans.push(plan);
      indices.set(key, index);
    }
    return [index, price.countryCode, price.amount, price.currency, price.confidence,
      price.checkedAt, price.sourceUrl, price.observationId];
  });
  return { plans, prices, rates: source.rates };
}

export function unpackVerifiedPriceSource(source: CompactSource): Source {
  const prices = source.prices.map(([index, countryCode, amount, currency, confidence, checkedAt, sourceUrl, observationId]) => {
    const [productSlug, productName, category, planSlug, planName, platform, billingCycle, priceType, quality] = source.plans[index];
    return { productSlug, productName, category, planSlug, planName, countryCode, amount, currency,
      platform, billingCycle, priceType, quality, confidence, checkedAt, sourceUrl, observationId };
  });
  return { prices, rates: source.rates };
}
