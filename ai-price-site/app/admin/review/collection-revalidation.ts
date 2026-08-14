const publicPricingSections = ["ai-pricing", "streaming-pricing"] as const;
const publicPricingLocales = ["zh", "en"] as const;

export function getCollectionRevalidationPaths(productSlug?: string | null) {
  const paths = [
    "/admin/review",
    "/admin/pipeline",
    "/admin/collector-jobs",
    "/admin/affordability",
    ...publicPricingSections.flatMap((section) =>
      publicPricingLocales.map((locale) => `/${locale}/${section}`),
    ),
  ];
  const slug = String(productSlug ?? "").trim();

  if (slug) {
    paths.push(
      ...publicPricingSections.flatMap((section) =>
        publicPricingLocales.map((locale) => `/${locale}/${section}/${slug}`),
      ),
    );
  }

  return [...new Set(paths)];
}
