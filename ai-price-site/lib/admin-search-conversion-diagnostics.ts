import { prisma } from "./prisma.ts";
import {
  getProductSeoQualityAudits,
  type ProductSeoQualityAudit,
} from "./product-seo-quality-data.ts";
import {
  diagnoseSearchConversionBlocker,
  type SearchConversionDiagnostic,
  type SearchConversionTargetSnapshot,
} from "./search-conversion-diagnostics.ts";
import type { SearchConversionTerm } from "./admin-search-demand.ts";

export async function getSearchConversionDiagnostics(
  terms: SearchConversionTerm[],
  providedAudits?: ProductSeoQualityAudit[],
): Promise<SearchConversionDiagnostic[]> {
  const candidates = terms.filter(
    (term) =>
      term.planEngagementCount > 0
      && term.commercialConversionCount === 0,
  );
  if (candidates.length === 0) return [];

  const [products, audits] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        id: true,
        slug: true,
        name: true,
        officialUrl: true,
        affiliateLinks: {
          where: {
            status: "PUBLISHED",
          },
          select: {
            id: true,
          },
        },
        plans: {
          where: {
            status: "PUBLISHED",
          },
          select: {
            id: true,
            name: true,
            description: true,
            regionPrices: {
              where: {
                status: "PUBLISHED",
                billingPlatform: "IOS",
              },
              select: {
                countryId: true,
                lastCheckedAt: true,
              },
            },
          },
        },
      },
    }),
    providedAudits
      ? Promise.resolve(providedAudits)
      : getProductSeoQualityAudits(),
  ]);

  const auditByProductId = new Map(audits.map((audit) => [audit.id, audit]));
  const targetByProductId = new Map<string, SearchConversionTargetSnapshot>();
  const targetByPlanId = new Map<string, SearchConversionTargetSnapshot>();
  const staleBefore = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const product of products) {
    const audit = auditByProductId.get(product.id);
    if (!audit) continue;

    const base = {
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      officialUrl: product.officialUrl,
      publishedAffiliateCount: product.affiliateLinks.length,
      priceCount: audit.priceCount,
      countryCount: audit.countryCount,
      stalePriceCount: audit.stalePriceCount,
      taxGapCount: audit.taxGapCount,
      seoScore: audit.score,
      seoStatus: audit.status,
      dataQualityPath: `/admin/data-quality/${product.slug}`,
      editPath: audit.editPath,
    } satisfies Omit<
      SearchConversionTargetSnapshot,
      "planId" | "planName" | "planDescription"
    >;

    targetByProductId.set(product.id, {
      ...base,
      planId: null,
      planName: null,
      planDescription: null,
    });

    for (const plan of product.plans) {
      const planCountryCount = new Set(
        plan.regionPrices.map((price) => price.countryId),
      ).size;
      const planStalePriceCount = plan.regionPrices.filter(
        (price) =>
          !price.lastCheckedAt
          || price.lastCheckedAt.getTime() < staleBefore,
      ).length;
      targetByPlanId.set(plan.id, {
        ...base,
        planId: plan.id,
        planName: plan.name,
        planDescription: plan.description,
        priceCount: plan.regionPrices.length,
        countryCount: planCountryCount,
        stalePriceCount: planStalePriceCount,
      });
    }
  }

  return candidates.map((term) => {
    const target =
      (term.planId ? targetByPlanId.get(term.planId) : null)
      || (term.productId ? targetByProductId.get(term.productId) : null)
      || null;
    return diagnoseSearchConversionBlocker(term, target);
  });
}
