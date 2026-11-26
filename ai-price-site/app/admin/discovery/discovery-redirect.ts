export type DiscoveryReviewRedirectInput = {
  productSlug: string | null | undefined;
  productName?: string | null;
  appStoreJobCount?: number | null;
};

export function buildDiscoveryReviewRedirectPath({
  productSlug,
  productName,
  appStoreJobCount,
}: DiscoveryReviewRedirectInput) {
  const slug = String(productSlug || "").trim();

  if (!slug) {
    return "/admin/pipeline?tab=discovery&promotionError=1";
  }

  const safeJobCount = Math.max(0, Math.round(Number(appStoreJobCount || 0)));
  const displayName = String(productName || slug).trim() || slug;
  const params = new URLSearchParams({
    product: slug,
    discoveryPromoted: "1",
    discoveryProduct: displayName,
    discoveryJobs: String(safeJobCount),
  });

  return `/admin/pipeline?${params.toString()}`;
}
