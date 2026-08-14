import "server-only";

import { cache } from "react";
import { getPublishedArticleBySlug } from "./articles";
import {
  coreGuideSlugs,
  type CoreGuideLocale,
  type CoreGuideSlug,
} from "./core-guide-content";
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

export const loadCoreGuideHubStates = cache(async (locale: CoreGuideLocale) => {
  try {
    const databaseLocale = toDatabaseLocale(locale);
    const now = new Date();
    const records = await prisma.article.findMany({
      where: {
        locale: databaseLocale,
        slug: {
          in: [...coreGuideSlugs],
        },
      },
      select: {
        slug: true,
        status: true,
        scheduledAt: true,
        deletedAt: true,
      },
    });

    return new Map(
      records.map((record) => [
        record.slug,
        {
          managed: true,
          published:
            !record.deletedAt &&
            (record.status === "PUBLISHED" ||
              (record.status === "SCHEDULED" &&
                Boolean(record.scheduledAt && record.scheduledAt <= now))),
        },
      ]),
    );
  } catch (error) {
    console.warn(
      `[core-guide] Falling back to the reviewed hub baseline for ${locale}: ${
        error instanceof Error ? error.message : "database unavailable"
      }`,
    );

    return new Map<string, { managed: boolean; published: boolean }>();
  }
});
