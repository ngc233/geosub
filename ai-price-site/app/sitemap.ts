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
      regionPrices: {
        where: {
          status: PublishStatus.PUBLISHED,
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
    const newestPrice = product.regionPrices[0];
    const lastModified = latestDate(
      [newestPrice?.lastCheckedAt, newestPrice?.publishedAt, newestPrice?.updatedAt, product.updatedAt],
      now,
    );
    const isStreaming = product.category === ProductCategory.STREAMING;
    const section = isStreaming ? "streaming-pricing" : "ai-pricing";
    const priority = product.featured ? 0.9 : isStreaming ? 0.72 : 0.82;

    return [
      route(`/zh/${section}/${product.slug}`, "daily", priority, lastModified),
      route(`/en/${section}/${product.slug}`, "daily", priority - 0.05, lastModified),
    ];
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
    route("/en", "daily", 0.72),
    route("/en/ai-pricing", "daily", 0.74),
    route("/en/streaming-pricing", "daily", 0.62),
    route("/en/guides", "weekly", 0.48),
    route("/en/data-sources", "monthly", 0.42),
    route("/en/about", "monthly", 0.32),
    route("/en/privacy", "yearly", 0.2),
    route("/en/terms", "yearly", 0.2),
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
