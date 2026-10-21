import { getProductOverviewDecisionPlans } from "./pricing-product-overview-copy.ts";
import { getPlanFreshness, type SubscriptionProduct } from "./public-pricing-model.ts";
import type { SiteLocale } from "./site-locale.ts";

export function hasPlanComparison(locale: SiteLocale, productSlug: string) {
  return locale === "en" && productSlug === "chatgpt";
}

// A common country, channel and billing period; never substitute another
// country's minimum or a web price when the US App Store price is absent.
export function getMonthlyAppStoreComparison(product: SubscriptionProduct) {
  return getProductOverviewDecisionPlans(product)
    .filter((plan) => plan.priceStatus !== "pending" && plan.priceStatus !== "empty")
    .map((plan) => {
      const regions = plan.billing === "monthly"
        ? plan.regions.filter((region) => region.billingPlatform?.toLowerCase() === "ios" && region.dataQuality === "verified")
        : [];
      const us = regions.find((region) => region.code.toUpperCase() === "US");
      const usPrice = us?.currencyCode === "USD" && Number.isFinite(us.localPriceValue) && (us.localPriceValue ?? 0) > 0
        ? us.localPriceValue : undefined;
      return {
        plan,
        usPrice,
        collectedAt: usPrice === undefined ? undefined : us?.lastCheckedAt,
        regionCount: new Set(regions.map((region) => region.code.toUpperCase())).size,
        freshness: getPlanFreshness(regions),
      };
    });
}
