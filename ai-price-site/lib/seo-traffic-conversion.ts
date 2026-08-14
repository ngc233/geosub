export const SEO_CONVERSION_WINDOW_DAYS = 30;
export const SEO_CONVERSION_SESSION_MINUTES = 30;

export const PLAN_ENGAGEMENT_EVENT_KEYS = [
  "select_plan",
  "click_product_overview",
  "click_related_plan",
] as const;

export const COMMERCIAL_ACTION_EVENT_KEYS = [
  "click_official",
  "click_affiliate",
  "click_ad",
] as const;

export type SeoSearchEngine = "google" | "bing";

export type SeoConversionMetric = {
  landingSessions: number;
  pricingSessions: number;
  planSessions: number;
  officialSessions: number;
  commercialSessions: number;
  completedSessions: number;
};

export type SeoEngineConversion = SeoConversionMetric & {
  engine: SeoSearchEngine;
};

export type SeoLandingPageConversion = SeoConversionMetric & {
  path: string;
  engine: SeoSearchEngine;
};

export type SeoTrafficConversionOverview = {
  windowDays: number;
  sessionMinutes: number;
  since: string;
  total: SeoConversionMetric;
  engines: SeoEngineConversion[];
  topPages: SeoLandingPageConversion[];
};

export function getSeoConversionRate(value: number, base: number) {
  if (base <= 0) return 0;
  return Math.round((value / base) * 10_000) / 100;
}

export function classifySearchEngineReferrer(
  referrer?: string | null,
): SeoSearchEngine | null {
  if (!referrer) return null;

  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (hostname === "bing.com" || hostname.endsWith(".bing.com")) return "bing";
    if (/^(?:.+\.)?google\.[a-z.]+$/.test(hostname)) return "google";
  } catch {
    return null;
  }

  return null;
}

export function isPricingSearchLandingPath(path?: string | null) {
  if (!path) return false;
  const pathname = path.split("?")[0];
  return /^\/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)\/(ai-pricing|streaming-pricing)\/[^/]+(?:\/[^/]+)?\/?$/.test(
    pathname,
  );
}

export function isPlanPricingPath(path?: string | null) {
  if (!isPricingSearchLandingPath(path)) return false;
  return path!.split("?")[0].split("/").filter(Boolean).length === 4;
}
