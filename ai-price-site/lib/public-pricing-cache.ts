export const PUBLIC_PRICING_CACHE_TAG = "public-pricing";
export const PUBLIC_PRICING_LIST_CACHE_TAG = "public-pricing-list";
export const PUBLIC_PRICING_NAVIGATION_CACHE_TAG =
  "public-pricing-navigation";
export const PUBLIC_EXCHANGE_RATE_CACHE_TAG =
  "public-pricing-exchange-rates";

export const PUBLIC_PRICING_REVALIDATE_SECONDS = 30 * 60;
export const PUBLIC_EXCHANGE_RATE_REVALIDATE_SECONDS = 60 * 60;

export function getPublicPricingProductCacheTag(productSlug: string) {
  return `public-pricing:${productSlug}`;
}
