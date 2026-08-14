import type { SiteLocale } from "./site-locale.ts";
import {
  getLocaleRobotsPolicy,
  isPlanSitemapPromotedProduct,
  isSeoIndexableLocale,
  seoIndexableLocales,
} from "./seo-indexing-policy.ts";
import type { ProductSeoQualityStatus } from "./seo-page-quality.ts";
import type { ProductPlanEditorialContent } from "./product-editorial-content.ts";

export type ProductSeoGateMode = "observe" | "enforce";
export type PlanEditorialIndexingStatus = NonNullable<
  ProductPlanEditorialContent["indexingStatus"]
>;
export type PlanSitemapPromotionState = "promoted" | "waiting" | "blocked";

export function getProductSeoGateMode(
  value = process.env.SEO_PRODUCT_QUALITY_GATE,
): ProductSeoGateMode {
  return value?.trim().toLowerCase() === "observe" ? "observe" : "enforce";
}

export function getProductSitemapDecision(
  status: ProductSeoQualityStatus,
  mode: ProductSeoGateMode,
) {
  const eligible = status === "indexable";
  const included = mode === "observe" || eligible;

  return {
    eligible,
    included,
    label: eligible ? "建议提交" : "建议暂缓",
    currentAction:
      mode === "enforce"
        ? included
          ? "进入 sitemap"
          : "暂不进入 sitemap"
        : included
          ? "观察模式，当前仍保留"
          : "观察模式",
  };
}

export function getProductPlanSitemapPromotion({
  productSlug,
  qualityStatus,
  gateMode,
  currentPlanCount,
  promotedProductSlugs,
}: {
  productSlug: string;
  qualityStatus: ProductSeoQualityStatus;
  gateMode: ProductSeoGateMode;
  currentPlanCount: number;
  promotedProductSlugs?: readonly string[];
}) {
  const qualityDecision = getProductSitemapDecision(qualityStatus, gateMode);
  const productOverviewPages = qualityDecision.included
    ? seoIndexableLocales.length
    : 0;
  const potentialPlanPages = Math.max(0, currentPlanCount)
    * seoIndexableLocales.length;

  if (!qualityDecision.included) {
    return {
      state: "blocked" as const,
      label: "质量暂缓",
      productOverviewPages,
      includedPlanPages: 0,
      potentialPlanPages,
      reason: "页面质量尚未达到收录门槛，产品概览与套餐页都不会主动提交。",
    };
  }

  if (isPlanSitemapPromotedProduct(productSlug, promotedProductSlugs)) {
    return {
      state: "promoted" as const,
      label: "套餐已推广",
      productOverviewPages,
      includedPlanPages: potentialPlanPages,
      potentialPlanPages,
      reason:
        "产品概览和当前套餐页已进入本轮 sitemap，后续继续观察搜索表现与转化。",
    };
  }

  return {
    state: "waiting" as const,
    label: "等待套餐推广",
    productOverviewPages,
    includedPlanPages: 0,
    potentialPlanPages,
    reason:
      "产品概览已提交；套餐页等待搜索需求、地区覆盖或转化信号后分批加入，避免 sitemap 一次扩张。",
  };
}

export function getProductRobotsPolicy(
  locale: SiteLocale,
  status: ProductSeoQualityStatus,
  mode: ProductSeoGateMode,
  planStatus: PlanEditorialIndexingStatus = "current",
) {
  if (planStatus === "legacy") {
    return {
      index: false,
      follow: true,
    };
  }

  if (mode === "observe") {
    return getLocaleRobotsPolicy(locale);
  }

  return {
    index: isSeoIndexableLocale(locale) && status === "indexable",
    follow: true,
  };
}

export function getPlanSitemapDecision(
  status: PlanEditorialIndexingStatus,
  mode: ProductSeoGateMode,
) {
  const eligible = status === "current";

  return {
    eligible,
    included: eligible,
    label: eligible ? "当前套餐" : "历史续订套餐",
    currentAction: eligible
      ? mode === "enforce"
        ? "进入 sitemap"
        : "观察模式，当前仍保留"
      : "暂不进入 sitemap",
  };
}
