import {
  siteLocaleDefinitions,
  supportedSiteLocales,
  type SiteLocale,
} from "./site-locale.ts";

export type PricingLocale = SiteLocale;

export function getPricingSection(category: string) {
  return category.trim().toLowerCase() === "streaming"
    ? "streaming-pricing"
    : "ai-pricing";
}

export function getPricingListPath(locale: PricingLocale, category: string) {
  return `/${locale}/${getPricingSection(category)}`;
}

export function getPricingDetailPath(
  locale: PricingLocale,
  category: string,
  slug: string,
) {
  return `${getPricingListPath(locale, category)}/${slug}`;
}

export function getPricingPlanPath(
  locale: PricingLocale,
  category: string,
  slug: string,
  planSlug: string,
) {
  return `${getPricingDetailPath(locale, category, slug)}/${planSlug}`;
}

export function getPricingLanguageAlternates(
  category: string,
  slug?: string,
  planSlug?: string,
): Record<string, string> {
  const localizedPaths = Object.fromEntries(
    supportedSiteLocales.map((locale) => [
      siteLocaleDefinitions[locale].htmlLang,
      slug && planSlug
        ? getPricingPlanPath(locale, category, slug, planSlug)
        : slug
        ? getPricingDetailPath(locale, category, slug)
        : getPricingListPath(locale, category),
    ]),
  );

  return {
    ...localizedPaths,
    "x-default": slug && planSlug
      ? getPricingPlanPath("en", category, slug, planSlug)
      : slug
      ? getPricingDetailPath("en", category, slug)
      : getPricingListPath("en", category),
  };
}

export function stripGeoSubTitleSuffix(title: string) {
  return title.replace(/\s*(?:-|\||·)\s*GeoSub\s*$/i, "").trim();
}
