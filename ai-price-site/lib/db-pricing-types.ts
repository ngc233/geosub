export type DbPricingCategory = "ai" | "streaming";

export type DbPricingRegion = {
  rank: number;
  code: string;
  countryName: string;
  localPrice: string;
  priceUsd: number;
  taxNote: string;
  taxConfidence?: "high" | "medium" | "low" | "unknown";
  taxSourceKind?: "manual" | "official" | "apple" | "provider" | "inferred";
  taxTreatment?: "included_likely" | "varies_by_region" | "checkout_may_add" | "unknown";
  taxReviewStatus?: "verified" | "needs_review" | "unknown";
  taxFrontendNote?: string;
  dataQuality: string;
  isReference: boolean;
  isCheap: boolean;
  isExpensive: boolean;
};

export type DbPricingPlan = {
  slug: string;
  name: string;
  billingCycle: string;
  regions: DbPricingRegion[];
};

export type DbPricingProduct = {
  slug: string;
  name: string;
  brand: string;
  category: DbPricingCategory;
  description: string;
  logoUrl?: string;
  updatedAt: string;
  plans: DbPricingPlan[];
};

export function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

const featuredPlanByProduct: Record<string, string[]> = {
  chatgpt: ["plus"],
  gemini: ["pro", "plus"],
  claude: ["pro"],
};

const featuredPlanFallback = [
  "plus",
  "pro",
  "premium",
  "standard",
  "basic",
];

export function getDefaultPlan(product: DbPricingProduct) {
  const explicitSlugs = featuredPlanByProduct[product.slug] || [];

  for (const slug of explicitSlugs) {
    const plan = product.plans.find((item) => item.slug === slug);

    if (plan) {
      return plan;
    }
  }

  const popularPlan = product.plans.find((plan) => {
    const slug = plan.slug.toLowerCase();

    return featuredPlanFallback.some((keyword) => slug.includes(keyword));
  });

  return popularPlan || product.plans[0];
}

export function getPlanSpread(plan: DbPricingPlan) {
  if (plan.regions.length <= 1) {
    return 0;
  }

  const sorted = [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (!min || !max || min.priceUsd <= 0) {
    return 0;
  }

  return Math.round(((max.priceUsd - min.priceUsd) / min.priceUsd) * 100);
}
