import type { MetadataRoute } from "next";
import { subscriptionPricingData } from "../data/ai-pricing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.com";

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...staticRoutes, ...pricingRoutes];
}
