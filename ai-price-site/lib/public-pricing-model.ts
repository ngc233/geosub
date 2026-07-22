export type ProductCategory = "ai" | "streaming";

export type RegionPrice = {
  rank: number;
  country: string;
  code: string;
  priceUsd: number;
  localPrice: string;
  tax: string;
  taxConfidence?: "high" | "medium" | "low" | "unknown";
  taxSourceKind?: "manual" | "official" | "apple" | "provider" | "inferred";
  taxTreatment?: "included_likely" | "varies_by_region" | "checkout_may_add" | "unknown";
  taxCalculationPolicy?: "do_not_calculate" | "informational_only";
  taxReviewStatus?: "verified" | "needs_review" | "unknown";
  taxFrontendNote?: string;
  riskLevel?: "low" | "medium" | "high" | "unknown";
  riskScore?: number;
  riskNote?: string;
  riskRequirements?: string;
  riskFactors?: string;
  billingPlatform?: string;
  billingPlatformLabel?: string;
  lastCheckedAt?: string;
  fxRateDate?: string;
  reviewedAt?: string;
  sourceName?: string;
  confidenceScore?: number;
  dataQuality?: "verified" | "estimated" | "stale" | "pending_review" | "unknown";
  isCheap?: boolean;
  isExpensive?: boolean;
  isReference?: boolean;
};

export type PlanDataFreshness = {
  sourceLabel: string;
  priceCollectedAt?: string;
  fxRateDate?: string;
  planReviewedAt?: string;
  pageUpdatedAt?: string;
  trustStatus: "verified" | "reviewed" | "needs_review";
};

export type ProductPlan = {
  slug: string;
  name: string;
  billing: "monthly" | "yearly";
  description?: string;
  priceStatus?: "published" | "pending" | "empty";
  pendingObservationCount?: number;
  freshness?: PlanDataFreshness;
  regions: RegionPrice[];
};

export type SubscriptionProduct = {
  slug: string;
  category: ProductCategory;
  name: string;
  brand: string;
  description: string;
  icon?: string;
  logoUrl?: string;
  officialUrl?: string;
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
  const spreadPercent = ((maxRegion.priceUsd - minRegion.priceUsd) / minRegion.priceUsd) * 100;
  const savingPercent = ((maxRegion.priceUsd - minRegion.priceUsd) / maxRegion.priceUsd) * 100;

  return {
    minRegion,
    maxRegion,
    referenceRegion,
    spreadPercent: Math.round(spreadPercent),
    savingPercent: Math.round(savingPercent),
  };
}

