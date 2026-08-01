import { updateTag } from "next/cache";
import {
  getPublicPricingProductCacheTag,
  PUBLIC_PRICING_CACHE_TAG,
  PUBLIC_PRICING_LIST_CACHE_TAG,
  PUBLIC_PRICING_NAVIGATION_CACHE_TAG,
} from "./public-pricing-cache";

export function invalidatePublicPricing(productSlug?: string | null) {
  updateTag(PUBLIC_PRICING_LIST_CACHE_TAG);
  updateTag(PUBLIC_PRICING_NAVIGATION_CACHE_TAG);

  if (productSlug) {
    updateTag(getPublicPricingProductCacheTag(productSlug));
  } else {
    updateTag(PUBLIC_PRICING_CACHE_TAG);
  }
}
