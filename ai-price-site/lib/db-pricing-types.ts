export type DbPricingCategory = "ai" | "streaming";

export type DbPricingRegion = {
  rank: number;
  code: string;
  countryName: string;
  localPrice: string;
  priceUsd: number;
  taxNote: string;
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
  updatedAt: string;
  plans: DbPricingPlan[];
};

export function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

export function getDefaultPlan(product: DbPricingProduct) {
  return product.plans[0];
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