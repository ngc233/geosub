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

export function getPricingLanguageAlternates(
  category: string,
  slug?: string,
): Record<string, string> {
  const localizedPaths = Object.fromEntries(
    supportedSiteLocales.map((locale) => [
      siteLocaleDefinitions[locale].htmlLang,
      slug
        ? getPricingDetailPath(locale, category, slug)
        : getPricingListPath(locale, category),
    ]),
  );

  return {
    ...localizedPaths,
    "x-default": slug
      ? getPricingDetailPath("en", category, slug)
      : getPricingListPath("en", category),
  };
}

export function stripGeoSubTitleSuffix(title: string) {
  return title.replace(/\s*(?:-|\||·)\s*GeoSub\s*$/i, "").trim();
}
