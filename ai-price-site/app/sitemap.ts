import type { MetadataRoute } from "next";
import {
  BillingCycle,
  BillingPlatform,
  Locale,
  PriceType,
  ProductCategory,
  PublishStatus,
} from "@prisma/client";
import {
  getPublishedArticleCategories,
  getPublishedArticleTags,
  getPublishedArticles,
} from "../lib/articles";
import { prisma } from "../lib/prisma";
import {
  siteLocaleDefinitions,
} from "../lib/site-locale";
import { getFeaturedCurrencyPairs } from "../lib/currency-pairs";
import {
  isPlanSitemapPromotedProduct,
  seoIndexableLocales,
  seoSitemapBudgets,
} from "../lib/seo-indexing-policy";
import {
  getPlanSitemapDecision,
  getProductSeoGateMode,
  getProductSitemapDecision,
} from "../lib/product-seo-indexing-policy";
import { getProductSeoQualityAudits } from "../lib/product-seo-quality-data";
import { getPlanEditorialIndexingStatus } from "../lib/product-editorial-content";
import { indexableStaticGuidePaths } from "../lib/public-launch-routes";
import { getEffectivePlanSitemapProductSlugs } from "../lib/seo-plan-promotion-data";
import {
  getCountryPageIndexApproval,
  getCountryPagePilotPath,
  getIndexApprovedCountryPagePilots,
} from "../lib/country-page-pilot";
import { latestSitemapDate } from "../lib/sitemap-lastmod";
import {
  resolveSitemapWithLastKnownGood,
  SITEMAP_LKG_DYNAMIC_SENTINELS,
} from "../lib/sitemap-lkg";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org").replace(/\/$/, "");

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

function route(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
  lastModified?: Date,
): SitemapEntry {
  return {
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  };
}

function dedupeRoutes(routes: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const byUrl = new Map<string, SitemapEntry>();

  for (const entry of routes) {
    const previous = byUrl.get(entry.url);
    byUrl.set(entry.url, previous ? { ...previous, ...entry } : entry);
  }

  return [...byUrl.values()];
}

function getSitemapFallbackReason(error: unknown) {
  if (error && typeof error === "object") {
    const maybeCode = "code" in error ? String((error as { code?: unknown }).code) : "";
    if (maybeCode === "ECONNREFUSED") {
      return "database is unavailable";
    }
  }

  if (error instanceof Error && /ECONNREFUSED|Can't reach database|connect/i.test(error.message)) {
    return "database is unavailable";
  }

  return error instanceof Error ? error.message : "unknown error";
}

async function getProductRoutes(): Promise<MetadataRoute.Sitemap> {
  const gateMode = getProductSeoGateMode();
  const [qualityAudits, promotedProductSlugs] = await Promise.all([
    gateMode === "enforce" ? getProductSeoQualityAudits() : Promise.resolve([]),
    getEffectivePlanSitemapProductSlugs(),
  ]);
  const sitemapEligibleProducts = new Set(
    qualityAudits
      .filter(
        (audit) =>
          getProductSitemapDecision(audit.status, gateMode).included,
      )
      .map((audit) => audit.id),
  );
  const products = await prisma.product.findMany({
    where: {
      status: PublishStatus.PUBLISHED,
      category: {
        in: [ProductCategory.AI, ProductCategory.STREAMING],
      },
      regionPrices: {
        some: {
          status: PublishStatus.PUBLISHED,
          priceUsd: {
            gt: 0,
          },
        },
      },
    },
    select: {
      id: true,
      slug: true,
      category: true,
      updatedAt: true,
      featured: true,
      plans: {
        where: {
          status: PublishStatus.PUBLISHED,
          regionPrices: {
            some: {
              status: PublishStatus.PUBLISHED,
              priceUsd: {
                gt: 0,
              },
            },
          },
        },
        select: {
          slug: true,
          updatedAt: true,
          regionPrices: {
            where: {
              status: PublishStatus.PUBLISHED,
              priceUsd: {
                gt: 0,
              },
            },
            select: {
              lastCheckedAt: true,
              publishedAt: true,
              updatedAt: true,
            },
            orderBy: [
              {
                lastCheckedAt: "desc",
              },
              {
                updatedAt: "desc",
              },
            ],
            take: 1,
          },
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      },
    },
    orderBy: [
      {
        featured: "desc",
      },
      {
        sortOrder: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });

  return products
    .filter(
      (product) =>
        gateMode === "observe" || sitemapEligibleProducts.has(product.id),
    )
    .flatMap((product) => {
      const isStreaming = product.category === ProductCategory.STREAMING;
      const section = isStreaming ? "streaming-pricing" : "ai-pricing";
      const productPriority = product.featured ? 0.9 : isStreaming ? 0.76 : 0.86;
      const productLastModified = latestSitemapDate(
        [
          product.updatedAt,
          ...product.plans.flatMap((plan) => [
            plan.updatedAt,
            plan.regionPrices[0]?.lastCheckedAt,
            plan.regionPrices[0]?.publishedAt,
            plan.regionPrices[0]?.updatedAt,
          ]),
        ],
      );
      const productRoutes = seoIndexableLocales.map((locale, index) =>
        route(
          `/${siteLocaleDefinitions[locale].path}/${section}/${product.slug}`,
          "daily",
          productPriority - index * 0.05,
          productLastModified,
        ),
      );

      const planRoutes = product.plans.flatMap((plan) => {
        if (
          !isPlanSitemapPromotedProduct(product.slug, promotedProductSlugs)
        ) {
          return [];
        }

        const planDecision = getPlanSitemapDecision(
          getPlanEditorialIndexingStatus(product.slug, plan.slug),
          gateMode,
        );
        if (!planDecision.included) return [];

        const newestPrice = plan.regionPrices[0];
        const lastModified = latestSitemapDate(
          [
            newestPrice?.lastCheckedAt,
            newestPrice?.publishedAt,
            newestPrice?.updatedAt,
            plan.updatedAt,
            product.updatedAt,
          ],
        );
        const planPath = `${product.slug}/${plan.slug}`;

        return seoIndexableLocales.map((locale, index) =>
          route(
            `/${siteLocaleDefinitions[locale].path}/${section}/${planPath}`,
            "daily",
            productPriority - 0.08 - index * 0.05,
            lastModified,
          ),
        );
      });

      return [...productRoutes, ...planRoutes];
    });
}

async function getArticleRoutesForLocale(
  locale: Locale,
  pathLocale: "zh" | "en",
): Promise<MetadataRoute.Sitemap> {
  const [articles, categories, tags] = await Promise.all([
    getPublishedArticles(locale),
    getPublishedArticleCategories(locale),
    getPublishedArticleTags(locale),
  ]);

  return [
    ...articles.map((article) =>
      route(
        `/${pathLocale}/guides/${article.slug}`,
        "weekly",
        article.isFeatured ? 0.78 : 0.64,
        latestSitemapDate([article.updatedAt, article.publishedAt]),
      ),
    ),
    ...categories.map((category) =>
      route(
        `/${pathLocale}/guides/category/${category.slug}`,
        "weekly",
        0.58,
        latestSitemapDate([category.updatedAt]),
      ),
    ),
    ...tags.map((tag) =>
      route(
        `/${pathLocale}/guides/tag/${tag.slug}`,
        "weekly",
        0.5,
        latestSitemapDate([tag.updatedAt]),
      ),
    ),
  ];
}

async function getArticleRoutes(): Promise<MetadataRoute.Sitemap> {
  const [chineseRoutes, englishRoutes] = await Promise.all([
    getArticleRoutesForLocale(Locale.ZH, "zh"),
    getArticleRoutesForLocale(Locale.EN, "en"),
  ]);

  return [...chineseRoutes, ...englishRoutes];
}

async function getCountryPageRoutes(): Promise<MetadataRoute.Sitemap> {
  const pilots = getIndexApprovedCountryPagePilots();
  const productSlugs = [...new Set(pilots.map((pilot) => pilot.productSlug))];
  const countryCodes = [...new Set(pilots.map((pilot) => pilot.countryCode))];
  const products = await prisma.product.findMany({
    where: {
      slug: { in: productSlugs },
      status: PublishStatus.PUBLISHED,
    },
    select: {
      slug: true,
      category: true,
      updatedAt: true,
      plans: {
        where: {
          status: PublishStatus.PUBLISHED,
          billingCycle: BillingCycle.MONTHLY,
        },
        select: {
          updatedAt: true,
          regionPrices: {
            where: {
              status: PublishStatus.PUBLISHED,
              priceUsd: { gt: 0 },
              billingPlatform: BillingPlatform.IOS,
              priceType: PriceType.LIST_PRICE,
              country: { code: { in: countryCodes } },
            },
            select: {
              lastCheckedAt: true,
              publishedAt: true,
              updatedAt: true,
              country: { select: { code: true } },
            },
          },
        },
      },
    },
  });

  return pilots.flatMap((pilot) => {
    const expectedCategory = pilot.category === "streaming"
      ? ProductCategory.STREAMING
      : ProductCategory.AI;
    const product = products.find(
      (candidate) =>
        candidate.slug === pilot.productSlug &&
        candidate.category === expectedCategory,
    );
    if (!product) return [];

    const matchingPlans = product.plans.filter((plan) =>
      plan.regionPrices.some(
        (price) => price.country.code.toUpperCase() === pilot.countryCode,
      ),
    );
    const matchingPrices = matchingPlans.flatMap((plan) =>
      plan.regionPrices.filter(
        (price) => price.country.code.toUpperCase() === pilot.countryCode,
      ),
    );
    if (matchingPrices.length === 0) return [];

    const approval = getCountryPageIndexApproval(pilot);
    const approvalDate = approval ? new Date(approval.approvedAt) : undefined;
    const lastModified = latestSitemapDate(
      [
        product.updatedAt,
        approvalDate,
        ...matchingPlans.map((plan) => plan.updatedAt),
        ...matchingPrices.flatMap((price) => [
          price.lastCheckedAt,
          price.publishedAt,
          price.updatedAt,
        ]),
      ],
    );

    return seoIndexableLocales.map((locale, index) =>
      route(
        getCountryPagePilotPath(pilot, locale),
        "daily",
        0.7 - index * 0.04,
        lastModified,
      ),
    );
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    ...seoIndexableLocales.flatMap((locale) =>
      indexableStaticGuidePaths.map((path) =>
        route(
          `/${siteLocaleDefinitions[locale].path}${path}`,
          "monthly",
          locale === "zh" ? 0.6 : 0.56,
        ),
      ),
    ),
    ...seoIndexableLocales.map((locale) =>
      route(
        `/${siteLocaleDefinitions[locale].path}/tools/currency-converter`,
        "daily",
        locale === "zh" ? 0.72 : locale === "en" ? 0.68 : 0.58,
      ),
    ),
    ...seoIndexableLocales.flatMap((locale) =>
      getFeaturedCurrencyPairs(locale).map((pair) =>
        route(
          `/${siteLocaleDefinitions[locale].path}/tools/currency-converter/${pair.slug}`,
          "daily",
          locale === "zh" ? 0.66 : locale === "en" ? 0.64 : 0.54,
        ),
      ),
    ),
    route("/zh", "daily", 1),
    route("/zh/ai-pricing", "daily", 0.95),
    route("/zh/streaming-pricing", "daily", 0.82),
    route("/zh/guides", "weekly", 0.72),
    route("/zh/data-sources", "monthly", 0.64),
    route("/zh/about", "monthly", 0.45),
    route("/zh/privacy", "yearly", 0.25),
    route("/zh/terms", "yearly", 0.25),
    route("/en", "daily", 0.72),
    route("/en/ai-pricing", "daily", 0.74),
    route("/en/streaming-pricing", "daily", 0.62),
    route("/en/guides", "weekly", 0.48),
    route("/en/data-sources", "monthly", 0.42),
    route("/en/about", "monthly", 0.32),
    route("/en/privacy", "yearly", 0.2),
    route("/en/terms", "yearly", 0.2),
  ];

  const generateCompleteSitemap = async () => {
    const [productRoutes, articleRoutes, countryPageRoutes] = await Promise.all([
      getProductRoutes(),
      getArticleRoutes(),
      getCountryPageRoutes(),
    ]);

    return dedupeRoutes([
      ...staticRoutes,
      ...productRoutes,
      ...articleRoutes,
      ...countryPageRoutes,
    ]);
  };

  try {
    if (process.env.NODE_ENV === "production") {
      const result = await resolveSitemapWithLastKnownGood({
        generate: generateCompleteSitemap,
        snapshotPath: process.env.GEOSUB_SITEMAP_LKG_PATH?.trim() || undefined,
        siteOrigin: new URL(siteUrl).origin,
        now,
        totalBudget: seoSitemapBudgets.total,
        requiredSentinelPaths: SITEMAP_LKG_DYNAMIC_SENTINELS,
        onSnapshotWriteError: (error) => {
          console.error(
            `Fresh sitemap was served but its LKG snapshot could not be persisted (${getSitemapFallbackReason(error)}).`,
          );
        },
      });

      if (result.source === "last_known_good") {
        console.error(
          `Sitemap last-known-good snapshot accepted after live generation failed (${getSitemapFallbackReason(result.liveError)}).`,
        );
      }

      return result.entries;
    }

    return await generateCompleteSitemap();
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `Sitemap generation failed (${getSitemapFallbackReason(error)}).`,
      );
      throw error;
    }

    console.warn(
      `Development sitemap is using static routes only (${getSitemapFallbackReason(error)}).`,
    );
    return staticRoutes;
  }
}
