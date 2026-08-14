import type { CoreGuideLocale, CoreGuideSlug } from "./core-guide-content";

export type CoreGuideCluster = {
  productSlugs: readonly string[];
  relatedGuideSlugs: readonly CoreGuideSlug[];
};

const clusters: Record<CoreGuideSlug, CoreGuideCluster> = {
  "price-guide": {
    productSlugs: ["chatgpt", "netflix"],
    relatedGuideSlugs: ["methodology", "payment-account"],
  },
  "gift-card-guide": {
    productSlugs: ["chatgpt", "youtube-premium"],
    relatedGuideSlugs: ["payment-account", "price-guide"],
  },
  "payment-account": {
    productSlugs: ["claude", "disney"],
    relatedGuideSlugs: ["gift-card-guide", "price-guide"],
  },
  methodology: {
    productSlugs: ["chatgpt", "netflix"],
    relatedGuideSlugs: ["price-guide", "payment-account"],
  },
};

export function getCoreGuideCluster(slug: CoreGuideSlug) {
  return clusters[slug];
}

export function getCoreGuideProductRelationCopy(
  locale: CoreGuideLocale,
  productName: string,
) {
  return locale === "zh"
    ? {
        title: `查看 ${productName} 地区价格`,
        description: "比较该产品经过核验的套餐价格、税费与地区差异。",
      }
    : {
        title: `View ${productName} regional prices`,
        description: "Compare reviewed plan prices, tax notes and regional differences.",
      };
}

export function getCoreGuideArticleRelationDescription(locale: CoreGuideLocale) {
  return locale === "zh"
    ? "继续了解价格判断、账号条件与数据依据。"
    : "Continue with the pricing, account and data checks behind the comparison.";
}
