/** Phase-one read-only assessment. This is not a mutation or a replacement for current policy. */
export type BoundaryCheck = "met" | "blocked" | "unknown";
export type CatalogStatus = "draft" | "review" | "published" | "archived";
export type PublicationBoundaryInput = {
  productStatus?: CatalogStatus;
  qualifiedPrice?: BoundaryCheck;
  contentReady?: BoundaryCheck;
  templateReady?: BoundaryCheck;
  indexPolicy?: BoundaryCheck;
  navigationPolicy?: BoundaryCheck;
  sitemapPolicy?: BoundaryCheck;
  realPromotionEnabled?: boolean | null;
};
type Decision = { status: BoundaryCheck; blockers: string[]; missing: string[] };

function check(value: unknown): BoundaryCheck {
  return value === "met" || value === "blocked" ? value : "unknown";
}
function combine(entries: [string, BoundaryCheck][]): Decision {
  const blockers = entries.filter(([, value]) => value === "blocked").map(([key]) => key);
  const missing = entries.filter(([, value]) => value === "unknown").map(([key]) => key);
  return { status: blockers.length ? "blocked" : missing.length ? "unknown" : "met", blockers, missing };
}

export function assessPublicationBoundaries(input: PublicationBoundaryInput) {
  const price = check(input.qualifiedPrice);
  const content = check(input.contentReady);
  const template = check(input.templateReady);
  const productStatus = ["draft", "review", "published", "archived"].includes(input.productStatus ?? "")
    ? input.productStatus : undefined;
  const recordedPublic = productStatus === "published" ? "met" : productStatus ? "blocked" : "unknown";
  const publicInputs: [string, BoundaryCheck][] = [["product_not_published", recordedPublic], ["qualified_price", price], ["content_ready", content], ["template_ready", template]];
  return {
    mode: "observe_only" as const,
    // A ready assessment never changes the stored status or applies any SEO decision.
    recordedProductStatus: productStatus ?? "unknown",
    qualifiedPrice: price,
    readyForPublicationReview: combine([["qualified_price", price], ["content_ready", content], ["template_ready", template]]),
    publicEligibility: combine(publicInputs),
    indexEligibility: combine([...publicInputs, ["index_policy", check(input.indexPolicy)]]),
    navigationEligibility: combine([...publicInputs, ["navigation_policy", check(input.navigationPolicy)]]),
    sitemapEligibility: combine([...publicInputs, ["index_policy", check(input.indexPolicy)], ["sitemap_policy", check(input.sitemapPolicy)]]),
    promotionGuard: input.realPromotionEnabled === false ? "met" as const : input.realPromotionEnabled === true ? "blocked" as const : "unknown" as const,
    runtimePolicyChanged: false as const,
  };
}
