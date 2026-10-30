import assert from "node:assert/strict";
import test from "node:test";
import { assessPublicationBoundaries, type PublicationBoundaryInput } from "./publication-boundaries.ts";

const ready: PublicationBoundaryInput = { productStatus: "published", qualifiedPrice: "met", contentReady: "met", templateReady: "met", indexPolicy: "met", navigationPolicy: "met", sitemapPolicy: "met", realPromotionEnabled: false };
test("qualified prices and complete content do not publish a draft product or promote its URLs", () => {
  const input = { ...ready, productStatus: "draft" as const };
  const result = assessPublicationBoundaries(input);
  assert.equal(result.readyForPublicationReview.status, "met");
  assert.equal(result.recordedProductStatus, "draft");
  for (const decision of [result.publicEligibility, result.indexEligibility, result.navigationEligibility, result.sitemapEligibility]) assert.equal(decision.status, "blocked");
  assert.equal(input.productStatus, "draft");
  assert.equal(result.runtimePolicyChanged, false);
});
test("publication, indexing, navigation and sitemap require independent decisions", () => {
  const result = assessPublicationBoundaries({ ...ready, indexPolicy: "blocked", navigationPolicy: "unknown" });
  assert.equal(result.publicEligibility.status, "met");
  assert.equal(result.indexEligibility.status, "blocked");
  assert.equal(result.sitemapEligibility.status, "blocked");
  assert.equal(result.navigationEligibility.status, "unknown");
  const navigationOnly = assessPublicationBoundaries({ ...ready, navigationPolicy: "blocked", sitemapPolicy: "unknown" });
  assert.equal(navigationOnly.indexEligibility.status, "met");
  assert.equal(navigationOnly.navigationEligibility.status, "blocked");
  assert.equal(navigationOnly.sitemapEligibility.status, "unknown");
});
test("missing or malformed evidence cannot become an eligible or disabled state", () => {
  const missing = assessPublicationBoundaries({});
  assert.equal(missing.publicEligibility.status, "unknown");
  assert.equal(missing.promotionGuard, "unknown");
  const malformed = assessPublicationBoundaries({ ...ready, qualifiedPrice: true as unknown as "met", realPromotionEnabled: "false" as unknown as false });
  assert.equal(malformed.publicEligibility.status, "unknown");
  assert.equal(malformed.promotionGuard, "unknown");
  assert.equal(assessPublicationBoundaries({ ...ready, realPromotionEnabled: true }).promotionGuard, "blocked");
});
test("archived records stay blocked and unqualified prices never enter publication conclusions", () => {
  assert.equal(assessPublicationBoundaries({ ...ready, productStatus: "archived" }).publicEligibility.status, "blocked");
  const result = assessPublicationBoundaries({ ...ready, qualifiedPrice: "blocked" });
  assert.deepEqual(result.publicEligibility.blockers, ["qualified_price"]);
  assert.equal(result.indexEligibility.status, "blocked");
});
