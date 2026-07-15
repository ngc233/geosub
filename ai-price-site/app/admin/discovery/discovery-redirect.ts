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
    return "/admin/discovery?promotionError=1";
  }

  const safeJobCount = Math.max(0, Math.round(Number(appStoreJobCount || 0)));
  const displayName = String(productName || slug).trim() || slug;
  const params = new URLSearchParams({
    q: slug,
    discoveryPromoted: "1",
    discoveryProduct: displayName,
    discoveryJobs: String(safeJobCount),
  });

  return `/admin/review?${params.toString()}`;
}
