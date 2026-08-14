import { prisma } from "./prisma.ts";
import {
  getEffectiveSeoSearchPageObservations,
  parseSeoSearchPageImportState,
  SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
} from "./seo-search-observation-import.ts";
import { seoSearchPerformanceBaseline } from "./seo-search-performance-baseline.ts";

export async function getSeoSearchPageObservationState() {
  const setting = await prisma.siteSetting.findUnique({
    where: { settingKey: SEO_SEARCH_PAGE_IMPORT_SETTING_KEY },
    select: { valueText: true },
  });
  return parseSeoSearchPageImportState(setting?.valueText);
}

export async function getEffectiveSeoSearchPageObservationsFromDatabase() {
  const state = await getSeoSearchPageObservationState();
  return {
    state,
    observations: getEffectiveSeoSearchPageObservations({
      baseline: seoSearchPerformanceBaseline,
      state,
    }),
  };
}
