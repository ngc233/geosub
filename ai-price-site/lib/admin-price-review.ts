import "server-only";

import { prisma } from "./prisma";

type ReviewRefreshOptions = {
  taxProfiles?: boolean;
};

export async function refreshPricingReviewDerivatives({
  taxProfiles = false,
}: ReviewRefreshOptions = {}) {
  await prisma.$queryRaw`
    SELECT refresh_plan_affordability_metrics() AS refreshed_rows
  `;

  if (taxProfiles) {
    await prisma.$queryRaw`
      SELECT refresh_inferred_app_store_tax_profiles() AS inserted_rows
    `;
  }
}

export async function approvePriceObservation(
  observationId: string,
  options: ReviewRefreshOptions = {},
) {
  await prisma.$queryRaw`
    SELECT approve_price_observation(CAST(${observationId} AS uuid)) AS region_price_id
  `;

  await refreshPricingReviewDerivatives(options);
}

export async function ignorePriceObservation(observationId: string, note: string) {
  await prisma.$queryRaw`
    SELECT ignore_price_observation(CAST(${observationId} AS uuid), ${note}) AS result
  `;
}

export async function rejectPriceObservation(observationId: string, note: string) {
  await prisma.$queryRaw`
    SELECT reject_price_observation(CAST(${observationId} AS uuid), ${note}) AS result
  `;
}

export async function runAppStoreStabilityAutoReview() {
  await prisma.$queryRaw`
    SELECT *
    FROM run_app_store_stability_auto_review(FALSE, 3, 80, 14)
  `;

  await refreshPricingReviewDerivatives({ taxProfiles: true });
}
