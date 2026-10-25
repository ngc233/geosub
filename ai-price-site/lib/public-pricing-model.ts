export type ProductCategory = "ai" | "streaming";

export type RegionPrice = {
  rank: number;
  country: string;
  code: string;
  priceUsd: number;
  localPrice: string;
  localPriceValue?: number;
  currencyCode?: string;
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
  sourceUrl?: string;
  observationId?: string;
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
  billing: "monthly" | "yearly" | "weekly" | "quarterly" | "one_time" | "lifetime" | "unknown";
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

export function getDefaultPlanRegions(plan: ProductPlan) {
  const normalizePlatform = (region: RegionPrice) => {
    const platform = (region.billingPlatform || "unknown").toLowerCase();
    return platform === "google_play" ? "android" : platform;
  };

  for (const platform of ["ios", "web", "android"]) {
    const regions = plan.regions.filter(
      (region) => normalizePlatform(region) === platform,
    );
    if (regions.length > 0) return regions;
  }

  return plan.regions;
}

function getLatestDate(values: Array<Date | string | null | undefined>) {
  const latest = values
    .map((value) => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    })
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latest ? latest.toISOString().slice(0, 10) : undefined;
}

export function getPlanFreshness(regions: RegionPrice[]) {
  const priceCollectedAt = getLatestDate(regions.map((region) => region.lastCheckedAt));
  const fxRateDate = getLatestDate(regions.map((region) => region.fxRateDate));
  const planReviewedAt = getLatestDate(regions.map((region) => region.reviewedAt));
  const sourceNames = [...new Set(regions.map((region) => region.sourceName).filter(Boolean))];
  const minimumConfidence = Math.min(
    ...regions.map((region) => region.confidenceScore ?? 0),
  );
  const qualities = regions.map((region) => region.dataQuality || "unknown");
  const trustStatus = regions.length > 0 && qualities.every((quality) => quality === "verified") && minimumConfidence >= 80
    ? "verified"
    : regions.length > 0 && qualities.every((quality) => quality === "verified" || quality === "estimated") &&
        minimumConfidence >= 60
      ? "reviewed"
      : "needs_review";

  return {
    sourceLabel: sourceNames.length > 0 ? sourceNames.join(" + ") : "App Store",
    priceCollectedAt,
    fxRateDate,
    planReviewedAt,
    pageUpdatedAt: getLatestDate([planReviewedAt, priceCollectedAt]),
    trustStatus,
  } satisfies NonNullable<ProductPlan["freshness"]>;
}
