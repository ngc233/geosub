import { getDefaultPlanRegions, type ProductPlan } from "./public-pricing-model.ts";
import type { SiteLocale } from "./site-locale";

// Product/channel evidence, separate from changing regional prices and their dates.
const netflixAppleEvidence = {
  url: "https://help.netflix.com/en/node/25097",
  checkedAt: "2026-10-21",
};

export function getPurchaseEligibility(locale: SiteLocale, productSlug: string, plans: ProductPlan[]) {
  if (productSlug !== "netflix" || (locale !== "zh" && locale !== "en")) return null;
  if (!plans.some((plan) => getDefaultPlanRegions(plan).some((region) => region.billingPlatform?.toLowerCase() === "ios"))) return null;
  return {
    ...netflixAppleEvidence,
    title: locale === "zh" ? "App Store 续费价格 · 现有 Apple 计费用户" : "App Store renewal prices · existing Apple-billed members",
    description: locale === "zh"
      ? "Apple 计费不向新订阅或重新加入 Netflix 的用户开放；部分现有用户也可能需要更换付款方式。新用户请在 Netflix 官网确认可选套餐和结算价。地区标价不代表账号具备购买资格；税费以对应价格记录和结算页为准。"
      : "Apple billing is unavailable to new or rejoining Netflix customers. Some existing members may need another payment method. New customers should check Netflix.com for available plans and checkout prices. Regional prices do not establish account eligibility; use each price record and checkout for tax treatment.",
    sourceLabel: locale === "zh" ? "Netflix 官方计费说明" : "Netflix billing guidance",
    checkedLabel: locale === "zh" ? "资格说明核对" : "Eligibility guidance checked",
    priceScope: locale === "zh" ? "App Store 续费价" : "App Store renewal prices",
  };
}
