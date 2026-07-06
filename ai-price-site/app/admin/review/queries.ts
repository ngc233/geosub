import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type {
  AutoReviewReasonRow,
  AutoReviewRunRow,
  CollectorStatusRow,
  EvidenceHealthRow,
  EvidenceSummaryRow,
  HistoryRow,
  PendingDiagnosisRow,
  PendingProductGroup,
  PendingProductSummaryRow,
  PendingRow,
  ProductCollectorFreshnessRow,
  ReviewStatusCountRow,
  SelectedProductCollectorRow,
} from "./types";

export type ReviewPageQueryInput = {
  productQuery: string;
  discoveryProduct: string;
  discoveryJobs: number;
  pendingPage: number;
  historyPage: number;
};

export async function getReviewPageData({
  productQuery,
  discoveryProduct,
  discoveryJobs,
  pendingPage,
  historyPage,
}: ReviewPageQueryInput) {
  const productQueryLike = `%${productQuery}%`;
  const pendingPageSize = 25;
  const pendingOffset = (pendingPage - 1) * pendingPageSize;
  const historyPageSize = 25;
  const historyOffset = (historyPage - 1) * historyPageSize;

  const pendingCountPromise = prisma.$queryRaw<
    Array<{ product_count: number; observation_count: number }>
  >`
    SELECT
      COUNT(DISTINCT pending.product_slug)::int AS product_count,
      COUNT(*)::int AS observation_count
    FROM pending_price_observations_view pending
    JOIN price_observations observation ON observation.id = pending.id
    LEFT JOIN region_prices published
      ON published.product_id = observation.product_id
      AND published.plan_id = observation.plan_id
      AND published.country_id = observation.country_id
      AND published.billing_platform = observation.billing_platform
      AND published.price_type = observation.price_type
      AND published.status = 'published'::publish_status
    WHERE pending.platform = 'ios'
      AND (
        ${productQuery} = ''
        OR pending.product_slug ILIKE ${productQueryLike}
        OR pending.product_name ILIKE ${productQueryLike}
      )
      AND NOT (
        published.id IS NOT NULL
        AND (
          published.last_checked_at >= observation.observed_at
          OR (
            published.currency IS NOT DISTINCT FROM observation.currency
            AND published.local_price IS NOT DISTINCT FROM observation.raw_price
            AND (
              published.price_usd IS NULL
              OR observation.converted_usd IS NULL
              OR published.price_usd = 0
              OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
            )
          )
        )
      )
      AND (
        COALESCE(observation.anomaly_flag, FALSE)
        OR published.id IS NULL
        OR pending.review_note IS NOT NULL
          AND pending.review_note NOT ILIKE 'Only % App Store observations are available%'
        OR published.currency IS DISTINCT FROM observation.currency
        OR published.local_price IS DISTINCT FROM observation.raw_price
        OR (
          published.price_usd IS NOT NULL
          AND observation.converted_usd IS NOT NULL
          AND published.price_usd > 0
          AND ABS((observation.converted_usd - published.price_usd) / published.price_usd) > 0.02
        )
      )
  `;

  const pendingProductSummaryPromise = prisma.$queryRaw<PendingProductSummaryRow[]>`
    WITH scoped_pending AS (
      SELECT
        pending.*,
        COALESCE(
          observation.raw_payload ->> 'auto_review_reason_code',
          CASE
            WHEN pending.review_note ILIKE 'Converted App Store price is above%' THEN 'app_store_observation_anomaly'
            WHEN pending.review_note ILIKE 'Only % App Store observations are available%' THEN 'waiting_for_more_app_store_samples'
            WHEN pending.review_note IS NULL THEN 'not_reviewed_yet'
            ELSE 'other'
          END
        ) AS review_reason_code
      FROM pending_price_observations_view pending
      JOIN price_observations observation ON observation.id = pending.id
      LEFT JOIN region_prices published
        ON published.product_id = observation.product_id
        AND published.plan_id = observation.plan_id
        AND published.country_id = observation.country_id
        AND published.billing_platform = observation.billing_platform
        AND published.price_type = observation.price_type
        AND published.status = 'published'::publish_status
      WHERE pending.platform = 'ios'
        AND (
          ${productQuery} = ''
          OR pending.product_slug ILIKE ${productQueryLike}
          OR pending.product_name ILIKE ${productQueryLike}
        )
        AND NOT (
          published.id IS NOT NULL
          AND (
            published.last_checked_at >= observation.observed_at
            OR (
              published.currency IS NOT DISTINCT FROM observation.currency
              AND published.local_price IS NOT DISTINCT FROM observation.raw_price
              AND (
                published.price_usd IS NULL
                OR observation.converted_usd IS NULL
                OR published.price_usd = 0
                OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
              )
            )
          )
        )
        AND (
          COALESCE(observation.anomaly_flag, FALSE)
          OR published.id IS NULL
          OR pending.review_note IS NOT NULL
            AND pending.review_note NOT ILIKE 'Only % App Store observations are available%'
          OR published.currency IS DISTINCT FROM observation.currency
          OR published.local_price IS DISTINCT FROM observation.raw_price
          OR (
            published.price_usd IS NOT NULL
            AND observation.converted_usd IS NOT NULL
            AND published.price_usd > 0
            AND ABS((observation.converted_usd - published.price_usd) / published.price_usd) > 0.02
          )
        )
    ),
    product_page AS (
      SELECT
        product_slug,
        MAX(product_name) AS product_name,
        COUNT(*)::int AS pending_count,
        COUNT(DISTINCT plan_slug)::int AS plan_count,
        COUNT(DISTINCT country_code)::int AS country_count,
        COUNT(*) FILTER (WHERE review_reason_code = 'app_store_observation_anomaly')::int AS blocked_count,
        COUNT(*) FILTER (WHERE review_reason_code = 'waiting_for_more_app_store_samples')::int AS waiting_count,
        COUNT(*) FILTER (WHERE review_reason_code = 'app_store_price_changed')::int AS changed_count,
        COUNT(*) FILTER (WHERE review_reason_code = 'low_confidence')::int AS low_confidence_count,
        MAX(observed_at) AS latest_observed_at
      FROM scoped_pending
      GROUP BY product_slug
      ORDER BY latest_observed_at DESC, pending_count DESC, product_slug
      LIMIT ${pendingPageSize}
      OFFSET ${pendingOffset}
    )
    SELECT
      page.product_slug,
      page.product_name,
      page.pending_count,
      page.plan_count,
      page.country_count,
      page.blocked_count,
      page.waiting_count,
      page.changed_count,
      page.low_confidence_count,
      page.latest_observed_at,
      COUNT(history.id) FILTER (WHERE history.review_status = 'approved')::int AS approved_count,
      COUNT(history.id) FILTER (WHERE history.review_status = 'rejected')::int AS rejected_count,
      COUNT(history.id) FILTER (WHERE history.review_status = 'ignored')::int AS ignored_count
    FROM product_page page
    LEFT JOIN price_observations_review_history_view history
      ON history.product_slug = page.product_slug
    GROUP BY
      page.product_slug,
      page.product_name,
      page.pending_count,
      page.plan_count,
      page.country_count,
      page.blocked_count,
      page.waiting_count,
      page.changed_count,
      page.low_confidence_count,
      page.latest_observed_at
    ORDER BY page.latest_observed_at DESC, page.pending_count DESC, page.product_slug
  `;

  const [pendingCountRows, pendingProductSummaryRows] = await Promise.all([
    pendingCountPromise,
    pendingProductSummaryPromise,
  ]);
  const pendingProductTotal = Number(pendingCountRows[0]?.product_count ?? 0);
  const pendingTotal = Number(pendingCountRows[0]?.observation_count ?? 0);
  const pendingTotalPages = Math.max(1, Math.ceil(pendingProductTotal / pendingPageSize));

  const pendingProductSlugs = pendingProductSummaryRows.map((row) => row.product_slug);
  const pendingRowsPromise = pendingProductSlugs.length
    ? prisma.$queryRaw<PendingRow[]>`
    SELECT
      pending.id,
      pending.product_slug,
      pending.product_name,
      pending.plan_slug,
      pending.plan_name,
      pending.country_code,
      pending.country_name_zh,
      pending.country_name_en,
      pending.platform,
      pending.source_type,
      pending.observed_local_price,
      pending.observed_currency,
      pending.observed_price_text,
      pending.observed_price_usd,
      pending.confidence_score,
      pending.review_status,
      pending.review_note,
      COALESCE(
        observation.raw_payload ->> 'auto_review_reason_code',
        CASE
          WHEN pending.review_note ILIKE 'Converted App Store price is above%' THEN 'app_store_observation_anomaly'
          WHEN pending.review_note ILIKE 'Only % App Store observations are available%' THEN 'waiting_for_more_app_store_samples'
          WHEN pending.review_note IS NULL THEN 'not_reviewed_yet'
          ELSE 'other'
        END
      ) AS review_reason_code,
      pending.source_url,
      pending.observed_at,
      evidence.evidence_tier,
      evidence.evidence_status,
      evidence.evidence_score,
      evidence.has_modal_consensus,
      evidence.modal_selected_count,
      evidence.modal_runner_up_count,
      evidence.modal_variant_count,
      evidence.fx_rate_date_text,
      evidence.fx_rate_age_days,
      evidence.published_comparison,
      evidence.published_local_price,
      evidence.published_currency,
      evidence.published_price_usd,
      evidence.published_last_checked_at,
      evidence.evidence_note
    FROM pending_price_observations_view pending
    JOIN price_observations observation ON observation.id = pending.id
    LEFT JOIN price_observation_evidence_view evidence ON evidence.id = pending.id
    LEFT JOIN region_prices published
      ON published.product_id = observation.product_id
      AND published.plan_id = observation.plan_id
      AND published.country_id = observation.country_id
      AND published.billing_platform = observation.billing_platform
      AND published.price_type = observation.price_type
      AND published.status = 'published'::publish_status
    WHERE pending.platform = 'ios'
      AND pending.product_slug IN (${Prisma.join(pendingProductSlugs)})
      AND NOT (
        published.id IS NOT NULL
        AND (
          published.last_checked_at >= observation.observed_at
          OR (
            published.currency IS NOT DISTINCT FROM observation.currency
            AND published.local_price IS NOT DISTINCT FROM observation.raw_price
            AND (
              published.price_usd IS NULL
              OR observation.converted_usd IS NULL
              OR published.price_usd = 0
              OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
            )
          )
        )
      )
      AND (
        COALESCE(observation.anomaly_flag, FALSE)
        OR published.id IS NULL
        OR pending.review_note IS NOT NULL
          AND pending.review_note NOT ILIKE 'Only % App Store observations are available%'
        OR published.currency IS DISTINCT FROM observation.currency
        OR published.local_price IS DISTINCT FROM observation.raw_price
        OR (
          published.price_usd IS NOT NULL
          AND observation.converted_usd IS NOT NULL
          AND published.price_usd > 0
          AND ABS((observation.converted_usd - published.price_usd) / published.price_usd) > 0.02
        )
      )
    ORDER BY pending.product_slug, pending.plan_slug, pending.observed_at DESC
  `
    : Promise.resolve([] as PendingRow[]);
  const productFreshnessPromise =
    pendingProductSlugs.length > 0
      ? prisma.$queryRaw<ProductCollectorFreshnessRow[]>`
          SELECT
            product.slug AS product_slug,
            MAX(run.started_at) FILTER (WHERE run.status = 'succeeded') AS latest_success_at,
            COALESCE(BOOL_OR(
              run.status = 'succeeded'
              AND run.started_at > NOW() - INTERVAL '12 hours'
            ), FALSE) AS has_fresh_success
          FROM products product
          JOIN collector_jobs job ON job.product_id = product.id
          JOIN price_sources source ON source.id = job.source_id
          LEFT JOIN collector_job_runs run ON run.job_id = job.id
          WHERE product.slug IN (${Prisma.join(pendingProductSlugs)})
            AND source.type = 'app_store'::price_source_type
            AND job.job_type = 'ai_pricing'
            AND job.status <> 'archived'
          GROUP BY product.slug
        `
      : Promise.resolve([] as ProductCollectorFreshnessRow[]);

  const selectedProductCollectorPromise = productQuery
    ? prisma.$queryRaw<SelectedProductCollectorRow[]>`
        SELECT
          product.slug AS product_slug,
          product.name AS product_name,
          COUNT(DISTINCT job.id) FILTER (
            WHERE source.type = 'app_store'::price_source_type
              AND job.job_type = 'ai_pricing'
              AND job.status <> 'archived'
          )::int AS app_store_job_count,
          latest_run.started_at AS latest_run_at,
          latest_run.status AS latest_run_status,
          latest_success.started_at AS latest_success_at,
          COUNT(DISTINCT observation.id) FILTER (
            WHERE observation.status = 'pending'::observation_status
              AND observation.billing_platform = 'ios'::billing_platform
          )::int AS pending_observation_count,
          COUNT(DISTINCT published.id) FILTER (
            WHERE published.status = 'published'::publish_status
              AND published.billing_platform = 'ios'::billing_platform
          )::int AS published_price_count
        FROM products product
        LEFT JOIN collector_jobs job
          ON job.product_id = product.id
          AND job.status <> 'archived'
        LEFT JOIN price_sources source ON source.id = job.source_id
        LEFT JOIN LATERAL (
          SELECT run.status, run.started_at
          FROM collector_jobs scoped_job
          JOIN price_sources scoped_source ON scoped_source.id = scoped_job.source_id
          JOIN collector_job_runs run ON run.job_id = scoped_job.id
          WHERE scoped_job.product_id = product.id
            AND scoped_source.type = 'app_store'::price_source_type
          ORDER BY run.started_at DESC
          LIMIT 1
        ) latest_run ON TRUE
        LEFT JOIN LATERAL (
          SELECT run.started_at
          FROM collector_jobs scoped_job
          JOIN price_sources scoped_source ON scoped_source.id = scoped_job.source_id
          JOIN collector_job_runs run ON run.job_id = scoped_job.id
          WHERE scoped_job.product_id = product.id
            AND scoped_source.type = 'app_store'::price_source_type
            AND run.status = 'succeeded'
          ORDER BY run.started_at DESC
          LIMIT 1
        ) latest_success ON TRUE
        LEFT JOIN price_observations observation ON observation.product_id = product.id
        LEFT JOIN region_prices published ON published.product_id = product.id
        WHERE product.slug ILIKE ${productQueryLike}
          OR product.name ILIKE ${productQueryLike}
        GROUP BY product.id, latest_run.started_at, latest_run.status, latest_success.started_at
        ORDER BY
          CASE WHEN product.slug = ${productQuery} THEN 0 ELSE 1 END,
          product.sort_order,
          product.name
        LIMIT 1
      `
    : Promise.resolve([] as SelectedProductCollectorRow[]);

  const pendingDiagnosisPromise = prisma.$queryRaw<PendingDiagnosisRow[]>`
    SELECT
      pending.product_slug,
      pending.product_name,
      pending.plan_slug,
      pending.plan_name,
      COALESCE(
        observation.raw_payload ->> 'auto_review_reason_code',
        CASE
          WHEN pending.review_note ILIKE 'Converted App Store price is above%' THEN 'app_store_observation_anomaly'
          WHEN pending.review_note ILIKE 'Only % App Store observations are available%' THEN 'waiting_for_more_app_store_samples'
          WHEN pending.review_note IS NULL THEN 'not_reviewed_yet'
          ELSE 'other'
        END
      ) AS reason_code,
      COUNT(*)::int AS row_count,
      COUNT(DISTINCT pending.country_code)::int AS country_count,
      MIN(pending.observed_price_usd) AS min_usd,
      MAX(pending.observed_price_usd) AS max_usd
    FROM pending_price_observations_view pending
    JOIN price_observations observation ON observation.id = pending.id
    LEFT JOIN region_prices published
      ON published.product_id = observation.product_id
      AND published.plan_id = observation.plan_id
      AND published.country_id = observation.country_id
      AND published.billing_platform = observation.billing_platform
      AND published.price_type = observation.price_type
      AND published.status = 'published'::publish_status
    WHERE pending.platform = 'ios'
      AND NOT (
        published.id IS NOT NULL
        AND (
          published.last_checked_at >= observation.observed_at
          OR (
            published.currency IS NOT DISTINCT FROM observation.currency
            AND published.local_price IS NOT DISTINCT FROM observation.raw_price
            AND (
              published.price_usd IS NULL
              OR observation.converted_usd IS NULL
              OR published.price_usd = 0
              OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
            )
          )
        )
      )
      AND (
        COALESCE(observation.anomaly_flag, FALSE)
        OR published.id IS NULL
        OR pending.review_note IS NOT NULL
          AND pending.review_note NOT ILIKE 'Only % App Store observations are available%'
        OR published.currency IS DISTINCT FROM observation.currency
        OR published.local_price IS DISTINCT FROM observation.raw_price
        OR (
          published.price_usd IS NOT NULL
          AND observation.converted_usd IS NOT NULL
          AND published.price_usd > 0
          AND ABS((observation.converted_usd - published.price_usd) / published.price_usd) > 0.02
        )
      )
    GROUP BY
      pending.product_slug,
      pending.product_name,
      pending.plan_slug,
      pending.plan_name,
      reason_code
    ORDER BY row_count DESC
    LIMIT 8
  `;

  const evidenceSummaryPromise = prisma.$queryRaw<EvidenceSummaryRow[]>`
    SELECT
      evidence_status,
      evidence_tier,
      COUNT(*)::int AS observation_count,
      COUNT(DISTINCT country_code)::int AS country_count,
      ROUND(AVG(evidence_score), 1) AS average_score,
      MAX(observed_at) AS latest_observed_at
    FROM price_observation_evidence_view
    WHERE observed_at >= NOW() - INTERVAL '14 days'
    GROUP BY evidence_status, evidence_tier
    ORDER BY observation_count DESC, average_score DESC NULLS LAST
    LIMIT 8
  `;

  const evidenceHealthPromise = prisma.$queryRaw<EvidenceHealthRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE has_modal_consensus)::int AS modal_consensus_count,
      COUNT(*) FILTER (WHERE evidence_status = 'blocked_anomaly')::int AS blocked_anomaly_count,
      COUNT(*) FILTER (WHERE evidence_status = 'old_sample')::int AS old_sample_count,
      COUNT(*) FILTER (WHERE fx_rate_age_days IS NOT NULL AND fx_rate_age_days > 2)::int AS stale_fx_count
    FROM price_observation_evidence_view
    WHERE observed_at >= NOW() - INTERVAL '14 days'
  `;

  const historyCountPromise = prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM price_observations_review_history_view
  `;

  const historyRowsPromise = prisma.$queryRaw<HistoryRow[]>`
    SELECT
      id,
      product_slug,
      product_name,
      plan_slug,
      plan_name,
      country_code,
      country_name_zh,
      country_name_en,
      platform,
      source_type,
      observed_local_price,
      observed_currency,
      observed_price_text,
      observed_price_usd,
      confidence_score,
      review_status,
      source_url,
      observed_at,
      region_price_status,
      promoted_platform,
      promoted_data_quality,
      updated_at
    FROM price_observations_review_history_view
    ORDER BY updated_at DESC
    LIMIT ${historyPageSize}
    OFFSET ${historyOffset}
  `;

  const reviewStatusCountPromise = prisma.$queryRaw<ReviewStatusCountRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE review_status = 'approved')::int AS approved_count,
      COUNT(*) FILTER (WHERE review_status = 'ignored')::int AS ignored_count,
      COUNT(*) FILTER (WHERE review_status = 'rejected')::int AS rejected_count
    FROM price_observations_review_history_view
  `;

  const collectorStatusPromise = prisma.$queryRaw<CollectorStatusRow[]>`
    SELECT
      job.status,
      job.next_run_at,
      job.last_run_at,
      job.success_count,
      job.error_count,
      latest.status AS latest_run_status,
      latest.started_at AS latest_run_started_at,
      latest.output_excerpt AS latest_run_output,
      latest.error_message AS latest_run_error
    FROM collector_jobs job
    JOIN price_sources source ON source.id = job.source_id
    LEFT JOIN LATERAL (
      SELECT status, started_at, output_excerpt, error_message
      FROM collector_job_runs
      WHERE job_id = job.id
      ORDER BY started_at DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE source.type = 'app_store'::price_source_type
      AND job.status <> 'archived'
    ORDER BY job.updated_at DESC
    LIMIT 1
  `;

  const latestAutoReviewPromise = prisma.$queryRaw<AutoReviewRunRow[]>`
    SELECT
      id::text,
      status,
      dry_run,
      started_at,
      completed_at,
      checked_groups,
      auto_approved_count,
      manual_review_count,
      error_message
    FROM price_auto_review_runs
    ORDER BY started_at DESC
    LIMIT 1
  `;

  const autoReviewReasonPromise = prisma.$queryRaw<AutoReviewReasonRow[]>`
    WITH latest AS (
      SELECT id
      FROM price_auto_review_runs
      ORDER BY started_at DESC
      LIMIT 1
    )
    SELECT
      review_decision.decision,
      review_decision.reason_code,
      MAX(review_decision.reason) AS reason,
      COUNT(*)::int AS group_count,
      COALESCE(SUM(CARDINALITY(review_decision.observation_ids)), 0)::int AS observation_count
    FROM price_auto_review_decisions review_decision
    JOIN latest ON latest.id = review_decision.run_id
    GROUP BY review_decision.decision, review_decision.reason_code
    ORDER BY
      CASE WHEN review_decision.decision = 'auto_approve' THEN 0 ELSE 1 END,
      observation_count DESC,
      group_count DESC
    LIMIT 6
  `;

  const [
    pendingRows,
    productFreshnessRows,
    selectedProductCollectorRows,
    pendingDiagnosisRows,
    evidenceSummaryRows,
    evidenceHealthRows,
    historyCountRows,
    historyRows,
    reviewStatusCountRows,
    collectorStatusRows,
    latestAutoReviewRows,
    autoReviewReasonRows,
  ] = await Promise.all([
    pendingRowsPromise,
    productFreshnessPromise,
    selectedProductCollectorPromise,
    pendingDiagnosisPromise,
    evidenceSummaryPromise,
    evidenceHealthPromise,
    historyCountPromise,
    historyRowsPromise,
    reviewStatusCountPromise,
    collectorStatusPromise,
    latestAutoReviewPromise,
    autoReviewReasonPromise,
  ]);

  const historyTotal = Number(historyCountRows[0]?.count ?? 0);
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / historyPageSize));
  const approvedCount = Number(reviewStatusCountRows[0]?.approved_count ?? 0);
  const ignoredCount = Number(reviewStatusCountRows[0]?.ignored_count ?? 0);
  const rejectedCount = Number(reviewStatusCountRows[0]?.rejected_count ?? 0);
  const collectorStatus = collectorStatusRows[0] ?? null;
  const latestAutoReview = latestAutoReviewRows[0] ?? null;
  const selectedProductCollector = selectedProductCollectorRows[0] ?? null;
  const selectedProductName =
    discoveryProduct ||
    selectedProductCollector?.product_name ||
    selectedProductCollector?.product_slug ||
    productQuery;
  const selectedProductSlug = selectedProductCollector?.product_slug || productQuery;
  const selectedAppStoreJobCount =
    discoveryJobs > 0
      ? discoveryJobs
      : Number(selectedProductCollector?.app_store_job_count ?? 0);
  const productFreshnessBySlug = new Map(
    productFreshnessRows.map((row) => [row.product_slug, row]),
  );
  const evidenceHealth = evidenceHealthRows[0] ?? {
    modal_consensus_count: 0,
    blocked_anomaly_count: 0,
    old_sample_count: 0,
    stale_fx_count: 0,
  };
  const topPendingReason = pendingDiagnosisRows[0] ?? null;
  const diagnosisProductCount = new Set(pendingDiagnosisRows.map((row) => row.product_slug)).size;
  const diagnosisPlanCount = new Set(
    pendingDiagnosisRows.map((row) => `${row.product_slug}:${row.plan_slug}`),
  ).size;
  const productSummaryBySlug = new Map(
    pendingProductSummaryRows.map((row) => [row.product_slug, row]),
  );

  const pendingProductGroups = pendingProductSummaryRows.map<PendingProductGroup>((summary) => {
    const freshness = productFreshnessBySlug.get(summary.product_slug);
    return {
      productSlug: summary.product_slug,
      productName: summary.product_name,
      rows: [],
      plans: [],
      latestSuccessAt: freshness?.latest_success_at ?? null,
      hasFreshSuccess: freshness?.has_fresh_success ?? false,
      pendingCount: summary.pending_count,
      planCount: summary.plan_count,
      countryCount: summary.country_count,
      blockedCount: summary.blocked_count,
      waitingCount: summary.waiting_count,
      changedCount: summary.changed_count,
      lowConfidenceCount: summary.low_confidence_count,
      approvedCount: summary.approved_count,
      rejectedCount: summary.rejected_count,
      ignoredCount: summary.ignored_count,
    };
  });

  for (const row of pendingRows) {
    let productGroup = pendingProductGroups.find((group) => group.productSlug === row.product_slug);

    if (!productGroup) {
      const freshness = productFreshnessBySlug.get(row.product_slug);
      const summary = productSummaryBySlug.get(row.product_slug);
      productGroup = {
        productSlug: row.product_slug,
        productName: row.product_name,
        rows: [],
        plans: [],
        latestSuccessAt: freshness?.latest_success_at ?? null,
        hasFreshSuccess: freshness?.has_fresh_success ?? false,
        pendingCount: summary?.pending_count ?? 0,
        planCount: summary?.plan_count ?? 0,
        countryCount: summary?.country_count ?? 0,
        blockedCount: summary?.blocked_count ?? 0,
        waitingCount: summary?.waiting_count ?? 0,
        changedCount: summary?.changed_count ?? 0,
        lowConfidenceCount: summary?.low_confidence_count ?? 0,
        approvedCount: summary?.approved_count ?? 0,
        rejectedCount: summary?.rejected_count ?? 0,
        ignoredCount: summary?.ignored_count ?? 0,
      };
      pendingProductGroups.push(productGroup);
    }

    productGroup.rows.push(row);

    let planGroup = productGroup.plans.find((group) => group.planSlug === row.plan_slug);

    if (!planGroup) {
      planGroup = {
        planSlug: row.plan_slug,
        planName: row.plan_name,
        rows: [],
      };
      productGroup.plans.push(planGroup);
    }

    planGroup.rows.push(row);
  }

  return {
    pendingPageSize,
    historyPageSize,
    pendingProductTotal,
    pendingTotal,
    pendingTotalPages,
    historyTotal,
    historyTotalPages,
    approvedCount,
    ignoredCount,
    rejectedCount,
    collectorStatus,
    latestAutoReview,
    selectedProductCollector,
    selectedProductName,
    selectedProductSlug,
    selectedAppStoreJobCount,
    evidenceHealth,
    topPendingReason,
    diagnosisProductCount,
    diagnosisPlanCount,
    pendingDiagnosisRows,
    evidenceSummaryRows,
    historyRows,
    autoReviewReasonRows,
    pendingProductGroups,
  };
}
