import type { SiteLocale } from "./site-locale.ts";

// A locale can remain available to users without being promoted for indexing.
// Expand this list only after the locale passes the SEO content and route gates.
export const seoIndexableLocales = ["zh", "en"] as const satisfies readonly SiteLocale[];
export const seoIndexableLocaleBudget = 2;

export const seoSitemapBudgets = {
  total: 148,
  productPlanPages: 96,
  countryPages: 6,
  guideDetailPages: 24,
  currencyPairPages: 16,
} as const;

// Product overviews can be indexable while plan URLs are promoted in stages.
// Keep this list explicit so a catalog or content expansion cannot silently
// multiply the sitemap beyond the release budget.
export const seoPlanSitemapProductSlugs = [
  "chatgpt",
  "claude",
  "netflix",
  "gemini",
  "grok",
  "manus",
  "disney",
  "hbo-max",
  "perplexity",
  "suno",
  "youtube-premium",
] as const;

export function isPlanSitemapPromotedProduct(
  productSlug: string,
  promotedProductSlugs: readonly string[] = seoPlanSitemapProductSlugs,
) {
  return promotedProductSlugs.includes(productSlug);
}

export const seoLocalePromotionRequirements = [
  "localized-editorial-summary",
  "local-currency-context",
  "local-tax-payment-account-notes",
  "localized-search-intent-faq",
  "published-plan-coverage",
] as const;

export type SeoIndexableLocale = (typeof seoIndexableLocales)[number];

export function isSeoIndexableLocale(
  locale: SiteLocale,
): locale is SeoIndexableLocale {
  return seoIndexableLocales.includes(locale as SeoIndexableLocale);
}

export function getLocaleRobotsPolicy(locale: SiteLocale) {
  return {
    index: isSeoIndexableLocale(locale),
    follow: true,
  };
}
