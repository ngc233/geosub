import "dotenv/config";
import { prisma } from "../lib/prisma.ts";
import { getProductSitemapDecision } from "../lib/product-seo-indexing-policy.ts";
import { getProductSeoQualityAudits } from "../lib/product-seo-quality-data.ts";
import {
  isPlanSitemapPromotedProduct,
  seoIndexableLocales,
} from "../lib/seo-indexing-policy.ts";
import { getEffectivePlanSitemapProductSlugs } from "../lib/seo-plan-promotion-data.ts";

const audits = await getProductSeoQualityAudits();
const promotedProductSlugs = await getEffectivePlanSitemapProductSlugs();
const report = audits.map((audit) => {
  const decision = getProductSitemapDecision(audit.status, "enforce");

  return {
    product: audit.title,
    score: audit.score,
    recommendation: audit.statusLabel,
    sitemapPlanPages:
      decision.included
      && isPlanSitemapPromotedProduct(audit.slug, promotedProductSlugs)
        ? audit.currentPlanCount * seoIndexableLocales.length
        : 0,
    plans: audit.planCount,
    currentPlans: audit.currentPlanCount,
    legacyPlans: audit.legacyPlanCount,
    countries: audit.countryCount,
    prices: audit.priceCount,
    stalePrices: audit.stalePriceCount,
    missingTaxProfiles: audit.taxGapCount,
    seoLocales: `${audit.completeSeoLocaleCount}/${audit.requiredSeoLocaleCount}`,
    nextAction: audit.nextAction,
    remainingIssues: audit.issues.slice(1).join("；") || "无",
  };
});

console.table(report);
console.log(
  JSON.stringify(
    {
      products: report.length,
      indexable: audits.filter((audit) => audit.status === "indexable").length,
      needsWork: audits.filter((audit) => audit.status === "needs_work").length,
      hold: audits.filter((audit) => audit.status === "hold").length,
      sitemapPlanPages: report.reduce(
        (total, item) => total + item.sitemapPlanPages,
        0,
      ),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
