import "server-only";

import { prisma } from "./prisma";

type ReviewRefreshOptions = {
  taxProfiles?: boolean;
};

type ApproveReviewOptions = ReviewRefreshOptions & {
  actorId: string;
  note?: string;
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
  options: ApproveReviewOptions,
) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ region_price_id: string | null }>>`
      SELECT approve_price_observation(CAST(${observationId} AS uuid))::text AS region_price_id
    `;
    const promotedRegionPriceId = rows[0]?.region_price_id ?? null;

    await tx.auditLog.create({
      data: {
        actorId: options.actorId,
        action: "approve_price_observation",
        targetType: "price_observation",
        targetId: observationId,
        newValue: {
          status: "approved",
          promotedRegionPriceId,
          taxProfiles: Boolean(options.taxProfiles),
        },
        note:
          options.note ??
          "Approved price observation into formal region prices from admin UI.",
      },
    });
  });

  await refreshPricingReviewDerivatives({ taxProfiles: options.taxProfiles });
}

export async function ignorePriceObservation(
  observationId: string,
  note: string,
  actorId: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT ignore_price_observation(CAST(${observationId} AS uuid), ${note})::text AS result
    `;

    await tx.auditLog.create({
      data: {
        actorId,
        action: "ignore_price_observation",
        targetType: "price_observation",
        targetId: observationId,
        newValue: {
          status: "ignored",
        },
        note,
      },
    });
  });
}

export async function rejectPriceObservation(
  observationId: string,
  note: string,
  actorId: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT reject_price_observation(CAST(${observationId} AS uuid), ${note})::text AS result
    `;

    await tx.auditLog.create({
      data: {
        actorId,
        action: "reject_price_observation",
        targetType: "price_observation",
        targetId: observationId,
        newValue: {
          status: "rejected",
        },
        note,
      },
    });
  });
}

export async function runAppStoreStabilityAutoReview(actorId: string) {
  const revalidatedRows = await prisma.$queryRaw<
    Array<{ revalidated_prices: unknown }>
  >`
    SELECT refresh_matching_app_store_prices() AS revalidated_prices
  `;

  const autoReviewRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT *
    FROM run_app_store_stability_auto_review(FALSE, 3, 80, 14)
  `;

  const quarantinedRows = await prisma.$queryRaw<
    Array<{ quarantined_rows: unknown }>
  >`
    SELECT quarantine_published_app_store_price_outliers() AS quarantined_rows
  `;

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "run_app_store_auto_review",
      targetType: "price_observation",
      newValue: {
        revalidatedPrices: Number(revalidatedRows[0]?.revalidated_prices ?? 0),
        autoReviewResultCount: autoReviewRows.length,
        quarantinedRows: Number(quarantinedRows[0]?.quarantined_rows ?? 0),
      },
      note: "Triggered App Store stability auto-review from admin UI.",
    },
  });

  await refreshPricingReviewDerivatives({ taxProfiles: true });
}
