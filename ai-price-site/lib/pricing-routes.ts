export type PricingLocale = "zh" | "en";

export function getPricingSection(category: string) {
  return category === "streaming" ? "streaming-pricing" : "ai-pricing";
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

export function stripGeoSubTitleSuffix(title: string) {
  return title.replace(/\s*(?:-|\||·)\s*GeoSub\s*$/i, "").trim();
}
