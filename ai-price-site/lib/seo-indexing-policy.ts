import type { SiteLocale } from "./site-locale.ts";

// A locale can remain available to users without being promoted for indexing.
// Expand this list only after the locale passes the SEO content and route gates.
export const seoIndexableLocales = ["zh", "en"] as const satisfies readonly SiteLocale[];
export const seoIndexableLocaleBudget = 2;

export const seoSitemapBudgets = {
  total: 140,
  productPlanPages: 96,
  guideDetailPages: 24,
  currencyPairPages: 16,
} as const;

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
