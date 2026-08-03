import {
  isSiteLocale,
  siteLocaleDefinitions,
  type SiteLocale,
} from "./site-locale.ts";
import {
  isSeoIndexableLocale,
  seoIndexableLocales,
} from "./seo-indexing-policy.ts";
import { resolveLegacyPricingPlanSlug } from "./legacy-pricing-plan-routes.ts";

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

export function getLegacyPricingPlanRedirectPath(
  pathname: string,
  planSlug?: string | null,
) {
  const normalizedPlanSlug = String(planSlug || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedPlanSlug)) {
    return null;
  }

  const normalizedPathname = String(pathname || "").replace(/\/+$/, "");
  const segments = normalizedPathname.split("/").filter(Boolean);
  if (segments.length !== 3) return null;

  const [locale, section, productSlug] = segments;
  if (
    !isSiteLocale(locale) ||
    !["ai-pricing", "streaming-pricing"].includes(section) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)
  ) {
    return null;
  }

  const canonicalPlanSlug = resolveLegacyPricingPlanSlug(
    productSlug,
    normalizedPlanSlug,
  );
  if (!canonicalPlanSlug) return null;

  return `/${locale}/${section}/${productSlug}/${canonicalPlanSlug}`;
}

export function getPricingLanguageAlternates(
  activeLocale: PricingLocale,
  category: string,
  slug?: string,
  planSlug?: string,
): Record<string, string> | undefined {
  if (!isSeoIndexableLocale(activeLocale)) {
    return undefined;
  }

  const localizedPaths = Object.fromEntries(
    seoIndexableLocales.map((locale) => [
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
