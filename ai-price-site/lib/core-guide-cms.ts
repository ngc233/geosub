import "server-only";

import { cache } from "react";
import { getPublishedArticleBySlug } from "./articles";
import type { CoreGuideLocale, CoreGuideSlug } from "./core-guide-content";
import { prisma } from "./prisma";

function toDatabaseLocale(locale: CoreGuideLocale) {
  return locale === "zh" ? ("ZH" as const) : ("EN" as const);
}

export const loadCoreGuideCmsState = cache(
  async (locale: CoreGuideLocale, slug: CoreGuideSlug) => {
    try {
      const databaseLocale = toDatabaseLocale(locale);
      const [article, record] = await Promise.all([
        getPublishedArticleBySlug(slug, databaseLocale),
        prisma.article.findUnique({
          where: {
            slug_locale: {
              slug,
              locale: databaseLocale,
            },
          },
          select: {
            id: true,
          },
        }),
      ]);

      return {
        article,
        managed: Boolean(record),
        databaseAvailable: true,
      };
    } catch (error) {
      console.warn(
        `[core-guide] Falling back to the reviewed baseline for ${locale}/${slug}: ${
          error instanceof Error ? error.message : "database unavailable"
        }`,
      );

      return {
        article: null,
        managed: false,
        databaseAvailable: false,
      };
    }
  },
);
