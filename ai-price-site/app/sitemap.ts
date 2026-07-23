import type { MetadataRoute } from "next";
import { Locale, ProductCategory, PublishStatus } from "@prisma/client";
import {
  getPublishedArticleCategories,
  getPublishedArticleTags,
  getPublishedArticles,
} from "../lib/articles";
import { prisma } from "../lib/prisma";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org").replace(/\/$/, "");

type SitemapEntry = MetadataRoute.Sitemap[number];

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestDate(values: Array<Date | string | null | undefined>, fallback: Date) {
  return values.reduce<Date>((latest, value) => {
    const date = asDate(value);
    return date && date.getTime() > latest.getTime() ? date : latest;
  }, fallback);
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

async function getProductRoutes(now: Date): Promise<MetadataRoute.Sitemap> {
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

  return products.flatMap((product) => {
    const isStreaming = product.category === ProductCategory.STREAMING;
    const section = isStreaming ? "streaming-pricing" : "ai-pricing";
    const priority = product.featured ? 0.9 : isStreaming ? 0.72 : 0.82;

    return product.plans.flatMap((plan) => {
      const newestPrice = plan.regionPrices[0];
      const lastModified = latestDate(
        [
          newestPrice?.lastCheckedAt,
          newestPrice?.publishedAt,
          newestPrice?.updatedAt,
          plan.updatedAt,
          product.updatedAt,
        ],
        now,
      );
      const planPath = `${product.slug}/${plan.slug}`;

      return [
        route(`/zh/${section}/${planPath}`, "daily", priority, lastModified),
        route(`/zh-tw/${section}/${planPath}`, "daily", priority - 0.04, lastModified),
        route(`/en/${section}/${planPath}`, "daily", priority - 0.05, lastModified),
        route(`/ja/${section}/${planPath}`, "daily", priority - 0.06, lastModified),
        route(`/ko/${section}/${planPath}`, "daily", priority - 0.07, lastModified),
        route(`/es/${section}/${planPath}`, "daily", priority - 0.08, lastModified),
        route(`/tr/${section}/${planPath}`, "daily", priority - 0.09, lastModified),
        route(`/ar/${section}/${planPath}`, "daily", priority - 0.1, lastModified),
        route(`/fr/${section}/${planPath}`, "daily", priority - 0.11, lastModified),
        route(`/it/${section}/${planPath}`, "daily", priority - 0.12, lastModified),
        route(`/de/${section}/${planPath}`, "daily", priority - 0.13, lastModified),
        route(`/pt/${section}/${planPath}`, "daily", priority - 0.14, lastModified),
      ];
    });
  });
}

async function getArticleRoutesForLocale(
  now: Date,
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
        latestDate([article.updatedAt, article.publishedAt], now),
      ),
    ),
    ...categories.map((category) =>
      route(
        `/${pathLocale}/guides/category/${category.slug}`,
        "weekly",
        0.58,
        latestDate([category.updatedAt], now),
      ),
    ),
    ...tags.map((tag) =>
      route(
        `/${pathLocale}/guides/tag/${tag.slug}`,
        "weekly",
        0.5,
        latestDate([tag.updatedAt], now),
      ),
    ),
  ];
}

async function getArticleRoutes(now: Date): Promise<MetadataRoute.Sitemap> {
  const [chineseRoutes, englishRoutes] = await Promise.all([
    getArticleRoutesForLocale(now, Locale.ZH, "zh"),
    getArticleRoutesForLocale(now, Locale.EN, "en"),
  ]);

  return [...chineseRoutes, ...englishRoutes];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    route("/zh", "daily", 1),
    route("/zh/ai-pricing", "daily", 0.95),
    route("/zh/streaming-pricing", "daily", 0.82),
    route("/zh/guides", "weekly", 0.72),
    route("/zh/data-sources", "monthly", 0.64),
    route("/zh/about", "monthly", 0.45),
    route("/zh/contact", "monthly", 0.35),
    route("/zh/privacy", "yearly", 0.25),
    route("/zh/terms", "yearly", 0.25),
    route("/zh-tw", "daily", 0.76),
    route("/zh-tw/ai-pricing", "daily", 0.78),
    route("/zh-tw/streaming-pricing", "daily", 0.66),
    route("/zh-tw/guides", "weekly", 0.52),
    route("/zh-tw/guides/price-guide", "monthly", 0.48),
    route("/zh-tw/guides/payment-account", "monthly", 0.46),
    route("/zh-tw/guides/methodology", "monthly", 0.46),
    route("/zh-tw/data-sources", "monthly", 0.46),
    route("/zh-tw/about", "monthly", 0.36),
    route("/zh-tw/privacy", "yearly", 0.22),
    route("/zh-tw/terms", "yearly", 0.22),
    route("/en", "daily", 0.72),
    route("/en/ai-pricing", "daily", 0.74),
    route("/en/streaming-pricing", "daily", 0.62),
    route("/en/guides", "weekly", 0.48),
    route("/en/data-sources", "monthly", 0.42),
    route("/en/about", "monthly", 0.32),
    route("/en/privacy", "yearly", 0.2),
    route("/en/terms", "yearly", 0.2),
    route("/ja", "daily", 0.7),
    route("/ja/ai-pricing", "daily", 0.72),
    route("/ja/streaming-pricing", "daily", 0.6),
    route("/ja/guides", "weekly", 0.46),
    route("/ja/guides/price-guide", "monthly", 0.42),
    route("/ja/guides/payment-account", "monthly", 0.4),
    route("/ja/guides/methodology", "monthly", 0.4),
    route("/ja/data-sources", "monthly", 0.4),
    route("/ja/about", "monthly", 0.3),
    route("/ja/privacy", "yearly", 0.18),
    route("/ja/terms", "yearly", 0.18),
    route("/ko", "daily", 0.69),
    route("/ko/ai-pricing", "daily", 0.71),
    route("/ko/streaming-pricing", "daily", 0.59),
    route("/ko/guides", "weekly", 0.45),
    route("/ko/guides/price-guide", "monthly", 0.41),
    route("/ko/guides/payment-account", "monthly", 0.39),
    route("/ko/guides/methodology", "monthly", 0.39),
    route("/ko/data-sources", "monthly", 0.39),
    route("/ko/about", "monthly", 0.29),
    route("/ko/privacy", "yearly", 0.17),
    route("/ko/terms", "yearly", 0.17),
    route("/es", "daily", 0.68),
    route("/es/ai-pricing", "daily", 0.7),
    route("/es/streaming-pricing", "daily", 0.58),
    route("/es/guides", "weekly", 0.44),
    route("/es/guides/price-guide", "monthly", 0.4),
    route("/es/guides/payment-account", "monthly", 0.38),
    route("/es/guides/methodology", "monthly", 0.38),
    route("/es/data-sources", "monthly", 0.38),
    route("/es/about", "monthly", 0.28),
    route("/es/privacy", "yearly", 0.16),
    route("/es/terms", "yearly", 0.16),
    route("/tr", "daily", 0.67),
    route("/tr/ai-pricing", "daily", 0.69),
    route("/tr/streaming-pricing", "daily", 0.57),
    route("/tr/guides", "weekly", 0.43),
    route("/tr/guides/price-guide", "monthly", 0.39),
    route("/tr/guides/payment-account", "monthly", 0.37),
    route("/tr/guides/methodology", "monthly", 0.37),
    route("/tr/data-sources", "monthly", 0.37),
    route("/tr/about", "monthly", 0.27),
    route("/tr/privacy", "yearly", 0.15),
    route("/tr/terms", "yearly", 0.15),
    route("/ar", "daily", 0.66),
    route("/ar/ai-pricing", "daily", 0.68),
    route("/ar/streaming-pricing", "daily", 0.56),
    route("/ar/guides", "weekly", 0.42),
    route("/ar/guides/price-guide", "monthly", 0.38),
    route("/ar/guides/payment-account", "monthly", 0.36),
    route("/ar/guides/methodology", "monthly", 0.36),
    route("/ar/data-sources", "monthly", 0.36),
    route("/ar/about", "monthly", 0.26),
    route("/ar/privacy", "yearly", 0.14),
    route("/ar/terms", "yearly", 0.14),
    route("/fr", "daily", 0.65),
    route("/fr/ai-pricing", "daily", 0.67),
    route("/fr/streaming-pricing", "daily", 0.55),
    route("/fr/guides", "weekly", 0.41),
    route("/fr/guides/price-guide", "monthly", 0.37),
    route("/fr/guides/payment-account", "monthly", 0.35),
    route("/fr/guides/methodology", "monthly", 0.35),
    route("/fr/data-sources", "monthly", 0.35),
    route("/fr/about", "monthly", 0.25),
    route("/fr/privacy", "yearly", 0.13),
    route("/fr/terms", "yearly", 0.13),
    route("/it", "daily", 0.64),
    route("/it/ai-pricing", "daily", 0.66),
    route("/it/streaming-pricing", "daily", 0.54),
    route("/it/guides", "weekly", 0.4),
    route("/it/guides/price-guide", "monthly", 0.36),
    route("/it/guides/payment-account", "monthly", 0.34),
    route("/it/guides/methodology", "monthly", 0.34),
    route("/it/data-sources", "monthly", 0.34),
    route("/it/about", "monthly", 0.24),
    route("/it/privacy", "yearly", 0.12),
    route("/it/terms", "yearly", 0.12),
    route("/de", "daily", 0.63),
    route("/de/ai-pricing", "daily", 0.65),
    route("/de/streaming-pricing", "daily", 0.53),
    route("/de/guides", "weekly", 0.39),
    route("/de/guides/price-guide", "monthly", 0.35),
    route("/de/guides/payment-account", "monthly", 0.33),
    route("/de/guides/methodology", "monthly", 0.33),
    route("/de/data-sources", "monthly", 0.33),
    route("/de/about", "monthly", 0.23),
    route("/de/privacy", "yearly", 0.11),
    route("/de/terms", "yearly", 0.11),
    route("/pt", "daily", 0.62),
    route("/pt/ai-pricing", "daily", 0.64),
    route("/pt/streaming-pricing", "daily", 0.52),
    route("/pt/guides", "weekly", 0.38),
    route("/pt/guides/price-guide", "monthly", 0.34),
    route("/pt/guides/payment-account", "monthly", 0.32),
    route("/pt/guides/methodology", "monthly", 0.32),
    route("/pt/data-sources", "monthly", 0.32),
    route("/pt/about", "monthly", 0.22),
    route("/pt/privacy", "yearly", 0.1),
    route("/pt/terms", "yearly", 0.1),
  ];

  try {
    const [productRoutes, articleRoutes] = await Promise.all([
      getProductRoutes(now),
      getArticleRoutes(now),
    ]);

    return [...staticRoutes, ...productRoutes, ...articleRoutes];
  } catch (error) {
    console.warn(
      `Sitemap dynamic routes skipped; using static routes only (${getSitemapFallbackReason(error)}).`,
    );
    return staticRoutes;
  }
}
