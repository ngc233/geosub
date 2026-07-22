import type { Metadata } from "next";
import type { ProductCategory } from "./public-pricing-model";
import { getPublicPricingCopy } from "./public-pricing-copy";
import { getPricingListPath } from "./pricing-routes";
import type { SiteLocale } from "./site-locale";

export function getPricingListMetadata(
  locale: SiteLocale,
  category: ProductCategory,
): Metadata {
  const copy = getPublicPricingCopy(locale).listing.pages[category];
  const canonicalPath = getPricingListPath(locale, category);
  const zhPath = getPricingListPath("zh", category);
  const enPath = getPricingListPath("en", category);

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "zh-CN": zhPath,
        en: enPath,
        "x-default": enPath,
      },
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
