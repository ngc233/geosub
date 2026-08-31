const publicPricingSections = ["ai-pricing", "streaming-pricing"] as const;
const publicPricingLocales = ["zh", "en"] as const;

export function getCollectionRevalidationPaths(
  productSlug?: string | null,
  planSlugs: readonly string[] = [],
) {
  const paths = [
    "/sitemap.xml",
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

    for (const planSlug of planSlugs) {
      const normalizedPlanSlug = String(planSlug).trim();
      if (!normalizedPlanSlug) continue;

      paths.push(
        ...publicPricingSections.flatMap((section) =>
          publicPricingLocales.map(
            (locale) =>
              `/${locale}/${section}/${slug}/${normalizedPlanSlug}`,
          ),
        ),
      );
    }
  }

  return [...new Set(paths)];
}
