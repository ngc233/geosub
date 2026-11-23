import { getDefaultPlanRegions, getPlanFreshness, type ProductPlan } from "./public-pricing-model.ts";
import { getActiveSeoExperimentLock } from "./seo-experiment-locks.ts";

// The approved Chinese Plus copy continues to use its original plan input.
export function getPricingPagePlan(plan: ProductPlan, canonicalPath: string): ProductPlan {
  if (canonicalPath.replace(/\/+$/, "") === "/zh/ai-pricing/chatgpt/plus" || getActiveSeoExperimentLock(canonicalPath)) {
    return plan;
  }
  const regions = getDefaultPlanRegions(plan)
    .slice().sort((a, b) => a.priceUsd - b.priceUsd)
    .map((region, index) => ({ ...region, rank: index + 1 }));
  return { ...plan, regions, freshness: getPlanFreshness(regions) };
}

// The price-position chart must use the table's platform, including on pages
// whose experiment copy intentionally retains its original input.
export function getPricePositionPlan(plan: ProductPlan): ProductPlan {
  const regions = getDefaultPlanRegions(plan).slice().sort((a, b) => a.priceUsd - b.priceUsd)
    .map((region, index) => ({ ...region, rank: index + 1 }));
  return { ...plan, regions, freshness: getPlanFreshness(regions) };
}

export function getCountryPricingPlans(plans: ProductPlan[], countryCode: string) {
  return plans
    .filter((plan) => plan.billing === "monthly")
    .map((plan) => ({
      ...plan,
      regions: plan.regions.filter((region) => region.billingPlatform?.toLowerCase() === "ios")
        .sort((a, b) => a.priceUsd - b.priceUsd)
        .map((region, index) => ({ ...region, rank: index + 1 })),
    }))
    .map((plan) => ({
      ...plan,
      region: plan.regions.find((region) => region.code.toUpperCase() === countryCode.toUpperCase()),
    }))
    .filter((plan) => Boolean(plan.region));
}

export function getPricingChannelLabel(plan: ProductPlan) {
  const platforms = new Set(plan.regions.map((region) => region.billingPlatform?.toLowerCase()));
  if (platforms.size !== 1) return "available sources";
  if (platforms.has("ios")) return "App Store";
  if (platforms.has("web")) return "Web";
  if (platforms.has("android") || platforms.has("google_play")) return "Google Play";
  return "available sources";
}
