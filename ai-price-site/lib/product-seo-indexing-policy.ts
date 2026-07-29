import type { SiteLocale } from "./site-locale.ts";
import {
  getLocaleRobotsPolicy,
  isSeoIndexableLocale,
} from "./seo-indexing-policy.ts";
import type { ProductSeoQualityStatus } from "./seo-page-quality.ts";
import type { ProductPlanEditorialContent } from "./product-editorial-content.ts";

export type ProductSeoGateMode = "observe" | "enforce";
export type PlanEditorialIndexingStatus = NonNullable<
  ProductPlanEditorialContent["indexingStatus"]
>;

export function getProductSeoGateMode(
  value = process.env.SEO_PRODUCT_QUALITY_GATE,
): ProductSeoGateMode {
  return value?.trim().toLowerCase() === "enforce" ? "enforce" : "observe";
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
          : "不进入 sitemap"
        : included
          ? "观察模式，当前仍保留"
          : "观察模式",
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
    index:
      isSeoIndexableLocale(locale) &&
      status === "indexable",
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
    label: eligible ? "当前套餐" : "历史续订层",
    currentAction:
      eligible
        ? mode === "enforce"
          ? "进入 sitemap"
          : "观察模式，当前仍保留"
        : "不进入 sitemap",
  };
}
