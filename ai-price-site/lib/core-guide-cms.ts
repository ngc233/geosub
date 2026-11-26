import "server-only";

import type { Locale } from "@prisma/client";
import { cache } from "react";
import { getPublishedArticleBySlug } from "./articles";
import type { CanvasLocale } from "./canvas-ui-copy";
import {
  coreGuideSlugs,
  type CoreGuideSlug,
} from "./core-guide-content";
import { prisma } from "./prisma";

export function toGuideDatabaseLocale(locale: CanvasLocale): Locale | null {
  switch (locale) {
    case "zh":
      return "ZH";
    case "en":
      return "EN";
    case "ja":
      return "JA";
    case "ko":
      return "KO";
    case "es":
      return "ES";
    case "zh-tw":
      return null;
  }
}

export const loadCoreGuideCmsState = cache(
  async (locale: CanvasLocale, slug: CoreGuideSlug) => {
    const databaseLocale = toGuideDatabaseLocale(locale);
    if (!databaseLocale) {
      return {
        article: null,
        managed: false,
        databaseAvailable: true,
      };
    }

    try {
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

export const loadCoreGuideHubStates = cache(async (locale: CanvasLocale) => {
  const databaseLocale = toGuideDatabaseLocale(locale);
  if (!databaseLocale) {
    return new Map<string, { managed: boolean; published: boolean }>();
  }

  try {
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
