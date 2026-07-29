import { ProductCategory } from "@prisma/client";
import { prisma } from "./prisma.ts";
import {
  scoreProductSeoQuality,
  type ProductSeoQualityResult,
} from "./seo-page-quality.ts";
import { getProductSeoEffectiveCopy } from "./product-seo-effective-copy.ts";
import {
  getPlanEditorialIndexingStatus,
  getProductEditorialCoverage,
} from "./product-editorial-content.ts";

type TaxGapRow = {
  product_id: string;
  missing_tax_profile_count: number;
};

type ProductSeoQualityQuery = {
  slug?: string;
  take?: number;
};

export type ProductSeoQualityAudit = ProductSeoQualityResult & {
  id: string;
  slug: string;
  title: string;
  category: string;
  path: string;
  editPath: string;
  planCount: number;
  currentPlanCount: number;
  legacyPlanCount: number;
  priceCount: number;
  countryCount: number;
  stalePriceCount: number;
  taxGapCount: number;
};

function countDuplicatePlanGroups(plans: Array<{ name: string }>) {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    const key = plan.name.trim().toLocaleLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function countPublishedOutliers(
  plans: Array<{
    regionPrices: Array<{ priceUsd: unknown }>;
  }>,
) {
  return plans.reduce((total, plan) => {
    const prices = plan.regionPrices
      .map((price) => Number(price.priceUsd))
      .filter(Number.isFinite);
    const planMedian = median(prices.filter((price) => price >= 1));

    return (
      total +
      prices.filter(
        (price) =>
          price < 1 ||
          (prices.length >= 8 &&
            planMedian !== null &&
            (price < planMedian * 0.2 || price > planMedian * 3.5)),
      ).length
    );
  }, 0);
}

export async function getProductSeoQualityAudits({
  slug,
  take,
}: ProductSeoQualityQuery = {}): Promise<ProductSeoQualityAudit[]> {
  const [products, taxGapRows, databaseClockRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        ...(slug ? { slug } : {}),
      },
      include: {
        seoMetas: {
          where: {
            locale: "ZH",
            status: "PUBLISHED",
          },
        },
        plans: {
          where: {
            status: "PUBLISHED",
          },
          select: {
            slug: true,
            name: true,
            description: true,
            regionPrices: {
              where: {
                status: "PUBLISHED",
                billingPlatform: "IOS",
              },
              select: {
                countryId: true,
                priceUsd: true,
                lastCheckedAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      ...(take ? { take } : {}),
    }),
    prisma.$queryRaw<TaxGapRow[]>`
      SELECT
        price.product_id,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE tax.id IS NULL
        )::int AS missing_tax_profile_count
      FROM region_prices price
      LEFT JOIN country_tax_profiles tax
        ON tax.country_id = price.country_id
       AND tax.status = 'active'
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
      GROUP BY price.product_id
    `,
    prisma.$queryRaw<Array<{ current_time: Date }>>`
      SELECT NOW() AS current_time
    `,
  ]);

  const taxGapByProduct = new Map(
    taxGapRows.map((row) => [row.product_id, row.missing_tax_profile_count]),
  );
  const staleBefore =
    databaseClockRows[0].current_time.getTime() - 14 * 24 * 60 * 60 * 1000;

  return products
    .map((product) => {
      const meta = product.seoMetas[0];
      const prices = product.plans.flatMap((plan) => plan.regionPrices);
      const countryCount = new Set(prices.map((price) => price.countryId)).size;
      const stalePriceCount = prices.filter(
        (price) =>
          !price.lastCheckedAt ||
          price.lastCheckedAt.getTime() < staleBefore,
      ).length;
      const taxGapCount = taxGapByProduct.get(product.id) || 0;
      const legacyPlanCount = product.plans.filter(
        (plan) =>
          getPlanEditorialIndexingStatus(product.slug, plan.slug) === "legacy",
      ).length;
      const currentPlanCount = product.plans.length - legacyPlanCount;
      const effectiveCopy = getProductSeoEffectiveCopy({
        productName: product.name,
        countryCount,
        configuredTitle: meta?.title,
        configuredDescription: meta?.description,
        configuredH1: meta?.h1,
      });
      const editorialCoverage = getProductEditorialCoverage(
        product.slug,
        product.plans.map((plan) => plan.slug),
      );
      const quality = scoreProductSeoQuality({
        title: effectiveCopy.title,
        description: effectiveCopy.description,
        h1: effectiveCopy.h1,
        officialUrl: product.officialUrl,
        productDescription: editorialCoverage.summary,
        publishedPlanCount: product.plans.length,
        describedPlanCount: editorialCoverage.describedPlanCount,
        publishedPriceCount: prices.length,
        publishedCountryCount: countryCount,
        stalePriceCount,
        missingTaxProfileCount: taxGapCount,
        duplicatePlanGroupCount: countDuplicatePlanGroups(product.plans),
        publishedOutlierCount: countPublishedOutliers(product.plans),
      });

      return {
        id: product.id,
        slug: product.slug,
        title: product.name,
        category: product.category,
        path: `/${product.category === ProductCategory.STREAMING ? "zh/streaming-pricing" : "zh/ai-pricing"}/${product.slug}`,
        editPath: `/admin/products/${product.id}/edit`,
        planCount: product.plans.length,
        currentPlanCount,
        legacyPlanCount,
        priceCount: prices.length,
        countryCount,
        stalePriceCount,
        taxGapCount,
        ...quality,
      };
    })
    .sort((a, b) => a.score - b.score);
}

export async function getProductSeoQualityAudit(slug: string) {
  const audits = await getProductSeoQualityAudits({ slug, take: 1 });
  return audits[0] || null;
}
