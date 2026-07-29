import type { Metadata } from "next";
import type { ProductCategory } from "./public-pricing-model";
import { getPricingListCopy } from "./pricing-list-copy";
import {
  getPricingLanguageAlternates,
  getPricingListPath,
} from "./pricing-routes";
import type { SiteLocale } from "./site-locale";
import { getLocaleRobotsPolicy } from "./seo-indexing-policy";

export function getPricingListMetadata(
  locale: SiteLocale,
  category: ProductCategory,
): Metadata {
  const copy = getPricingListCopy(locale).pages[category];
  const canonicalPath = getPricingListPath(locale, category);

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    robots: getLocaleRobotsPolicy(locale),
    alternates: {
      canonical: canonicalPath,
      languages: getPricingLanguageAlternates(locale, category),
    },
    openGraph: {
      type: "website",
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: canonicalPath,
    },
    twitter: {
      card: "summary",
      title: copy.metaTitle,
      description: copy.metaDescription,
    },
  };
}
