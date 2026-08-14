import { prisma } from "./prisma.ts";
import {
  parsePlanSitemapPromotionState,
  SEO_PLAN_PROMOTION_SETTING_KEY,
} from "./seo-plan-promotion-state.ts";

export async function getPlanSitemapPromotionState() {
  const setting = await prisma.siteSetting.findUnique({
    where: { settingKey: SEO_PLAN_PROMOTION_SETTING_KEY },
    select: { valueText: true },
  });

  return parsePlanSitemapPromotionState(setting?.valueText);
}

export async function getEffectivePlanSitemapProductSlugs() {
  return (await getPlanSitemapPromotionState()).activeSlugs;
}
