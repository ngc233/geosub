import type { MetadataRoute } from "next";
import { subscriptionPricingData } from "../data/ai-pricing";
import {
  getPublishedArticleCategories,
  getPublishedArticleTags,
  getPublishedArticles,
} from "../lib/articles";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org";

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/zh"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/zh/ai-pricing"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/zh/streaming-pricing"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.55,
    },
    {
      url: absoluteUrl("/zh/methodology"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/zh/data-sources"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const pricingRoutes: MetadataRoute.Sitemap = subscriptionPricingData.map(
    (product) => ({
      url: absoluteUrl(`/zh/ai-pricing/${product.slug}`),
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: "daily",
      priority: product.slug === "chatgpt" ? 0.95 : 0.75,
    }),
  );

  const [articles, categories, tags] = await Promise.all([
    getPublishedArticles("ZH"),
    getPublishedArticleCategories("ZH"),
    getPublishedArticleTags("ZH"),
  ]);

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/zh/guides/${article.slug}`),
    lastModified: article.updatedAt || article.publishedAt || now,
    changeFrequency: "weekly",
    priority: article.isFeatured ? 0.8 : 0.65,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/zh/guides/category/${category.slug}`),
    lastModified: category.updatedAt || now,
    changeFrequency: "weekly",
    priority: 0.62,
  }));

  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: absoluteUrl(`/zh/guides/tag/${tag.slug}`),
    lastModified: tag.updatedAt || now,
    changeFrequency: "weekly",
    priority: 0.55,
  }));

  return [
    ...staticRoutes,
    ...pricingRoutes,
    ...articleRoutes,
    ...categoryRoutes,
    ...tagRoutes,
  ];
}
