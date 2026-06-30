export type ProductCategory = "ai" | "streaming";

export type RegionPrice = {
  rank: number;
  country: string;
  code: string;
  priceUsd: number;
  localPrice: string;
  tax: string;
  billingPlatform?: string;
  billingPlatformLabel?: string;
  isCheap?: boolean;
  isExpensive?: boolean;
  isReference?: boolean;
};

export type ProductPlan = {
  slug: string;
  name: string;
  billing: "monthly" | "yearly" | "weekly" | "quarterly" | "one_time" | "lifetime" | "unknown";
  description?: string;
  priceStatus?: "published" | "pending" | "empty";
  pendingObservationCount?: number;
  regions: RegionPrice[];
};

export type SubscriptionProduct = {
  slug: string;
  category: ProductCategory;
  name: string;
  brand: string;
  description: string;
  icon?: string;
  accentIcon?: string;
  defaultPlan: string;
  updatedAt: string;
  sourceNote?: string;
  plans: ProductPlan[];
};

export type PlanStats = {
  minRegion: RegionPrice;
  maxRegion: RegionPrice;
  referenceRegion: RegionPrice;
  spreadPercent: number;
  savingPercent: number;
};

export function formatUsd(price: number) {
  return `$${price.toFixed(2)}`;
}

export function getProductPlan(product: SubscriptionProduct, planSlug?: string) {
  const availablePlans = product.plans.filter((plan) => plan.regions.length > 0);

  return (
    availablePlans.find((plan) => plan.slug === planSlug) ||
    availablePlans.find((plan) => plan.slug === product.defaultPlan) ||
    availablePlans[0] ||
    product.plans[0]
  );
}

export function getReferenceRegion(plan: ProductPlan) {
  return (
    plan.regions.find((region) => region.code.toUpperCase() === "US") ||
    [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd)[0]
  );
}

export function getPlanStats(plan: ProductPlan): PlanStats {
  const sorted = [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd);
  const minRegion = sorted[0];
  const maxRegion = sorted[sorted.length - 1];
  const referenceRegion = getReferenceRegion(plan);

  const spreadPercent =
    minRegion.priceUsd > 0
      ? ((maxRegion.priceUsd - minRegion.priceUsd) / minRegion.priceUsd) * 100
      : 0;

  const savingPercent =
    maxRegion.priceUsd > 0
      ? ((maxRegion.priceUsd - minRegion.priceUsd) / maxRegion.priceUsd) * 100
      : 0;

  return {
    minRegion,
    maxRegion,
    referenceRegion,
    spreadPercent: Math.round(spreadPercent),
    savingPercent: Math.round(savingPercent),
  };
}
