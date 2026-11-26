import "server-only";

import { Prisma } from "@prisma/client";
import {
  officialWebEligibleJobSql,
  webPricingScopeJoinSql,
} from "./admin-product-scope";
import { adminPrisma } from "./prisma";
import {
  resolveSqlPagination,
  type PipelineProductRow,
  type PipelineProductsPageResult,
  type PipelineStageFilter,
  type PipelineStats,
} from "./admin-product-summary-model";

export * from "./admin-product-summary-model";

type StageSummaryRow = {
  total_all: unknown;
  exception_count: unknown;
  pending_count: unknown;
  not_started_count: unknown;
  published_count: unknown;
};

type PipelineStatsRow = {
  product_count: unknown;
  ready_count: unknown;
  setup_count: unknown;
  pending_count: unknown;
  failed_count: unknown;
  due_count: unknown;
  stale_count: unknown;
  running_count: unknown;
  published_price_count: unknown;
};

function toCount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value === "object" && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber()) || 0;
  }
  return 0;
}

const officialWebJobFilter = officialWebEligibleJobSql("product", "job");
const webPilotScope = webPricingScopeJoinSql({
  statsAlias: "job_stats",
  officialWebCountColumn: "official_web_job_count",
  appStoreCountColumn: "app_store_job_count",
  scopeAlias: "pricing_scope",
});

function buildFilteredProductOperationalCte({
  q,
  category,
  product,
}: {
  q: string;
  category: string;
  product: string;
}): Prisma.Sql {
  const productFilter = product
    ? Prisma.sql`AND product.slug = ${product}`
    : Prisma.empty;
  const searchFilter =
    q && !product
      ? Prisma.sql`AND (product.slug ILIKE ${`%${q}%`} OR product.name ILIKE ${`%${q}%`})`
      : Prisma.empty;
  const categoryFilter =
    category && category !== "all"
      ? Prisma.sql`AND product.category = ${category}::product_category`
      : Prisma.empty;

  return Prisma.sql`
    WITH product_operational_base AS (
      SELECT
        product.id::text AS product_id,
        product.slug AS product_slug,
        product.name AS product_name,
        product.category::text AS product_category,
        product.status::text AS product_status,
        product.provider,
        COALESCE(plan_stats.plan_count, 0)::int AS plan_count,
        COALESCE(job_stats.total_job_count, 0)::int AS total_job_count,
        COALESCE(job_stats.app_store_job_count, 0)::int AS app_store_job_count,
        COALESCE(job_stats.official_web_job_count, 0)::int AS official_web_job_count,
        COALESCE(job_stats.active_job_count, 0)::int AS active_job_count,
        COALESCE(job_stats.due_job_count, 0)::int AS due_job_count,
        COALESCE(job_stats.source_count, 0)::int AS source_count,
        job_stats.next_run_at,
        latest_run.status AS latest_run_status,
        latest_run.started_at AS latest_run_started_at,
        latest_run.error_message AS latest_run_error,
        latest_run.raw_payload ->> 'failure_phase' AS failure_phase,
        latest_run.raw_payload ->> 'failure_stage' AS failure_stage,
        latest_run.raw_payload ->> 'collector_status' AS collector_status,
        latest_run.raw_payload ->> 'auto_review_status' AS auto_review_status,
        latest_success.latest_success_at,
        COALESCE(latest_success.has_fresh_success, FALSE) AS has_fresh_success,
        COALESCE(observation_stats.pending_observation_count, 0)::int AS pending_observation_count,
        COALESCE(observation_stats.blocked_observation_count, 0)::int AS blocked_observation_count,
        COALESCE(observation_stats.waiting_observation_count, 0)::int AS waiting_observation_count,
        COALESCE(observation_stats.changed_observation_count, 0)::int AS changed_observation_count,
        COALESCE(observation_stats.low_confidence_observation_count, 0)::int AS low_confidence_observation_count,
        COALESCE(published_stats.published_price_count, 0)::int AS published_price_count,
        COALESCE(published_stats.published_region_count, 0)::int AS published_region_count,
        COALESCE(published_stats.published_stale_price_count, 0)::int AS published_stale_price_count,
        published_stats.latest_price_checked_at,
        COALESCE(candidate_stats.discovery_candidate_count, 0)::int AS discovery_candidate_count
      FROM products product
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS plan_count
        FROM plans plan
        WHERE plan.product_id = product.id
      ) plan_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total_job_count,
          COUNT(*) FILTER (
            WHERE COALESCE(
              job.job_config ->> 'collector_kind',
              source.type::text,
              'unknown'
            ) = 'app_store'
          )::int AS app_store_job_count,
          COUNT(*) FILTER (WHERE ${officialWebJobFilter})::int AS official_web_job_count,
          COUNT(*) FILTER (WHERE job.status = 'active')::int AS active_job_count,
          COUNT(*) FILTER (WHERE job.status = 'active' AND (job.next_run_at IS NULL OR job.next_run_at <= NOW()))::int AS due_job_count,
          COUNT(DISTINCT job.source_id)::int AS source_count,
          MIN(job.next_run_at) FILTER (WHERE job.status = 'active') AS next_run_at
        FROM collector_jobs job
        LEFT JOIN price_sources source ON source.id = job.source_id
        WHERE job.product_id = product.id
          AND job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND job.status <> 'archived'
      ) job_stats ON TRUE
      ${webPilotScope}
      LEFT JOIN LATERAL (
        SELECT run.status, run.started_at, run.error_message, run.raw_payload
        FROM collector_jobs scoped_job
        JOIN collector_job_runs run ON run.job_id = scoped_job.id
        WHERE scoped_job.product_id = product.id
          AND scoped_job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND COALESCE(scoped_job.job_config ->> 'collector_kind', run.collector_kind, 'unknown') = CASE WHEN pricing_scope.billing_platform='web' THEN 'pricing_page' ELSE 'app_store' END
        ORDER BY run.started_at DESC
        LIMIT 1
      ) latest_run ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          MAX(run.started_at) FILTER (WHERE run.status = 'succeeded') AS latest_success_at,
          COALESCE(BOOL_OR(
            run.status = 'succeeded'
            AND run.started_at > NOW() - INTERVAL '12 hours'
          ), FALSE) AS has_fresh_success
        FROM collector_jobs scoped_job
        JOIN collector_job_runs run ON run.job_id = scoped_job.id
        WHERE scoped_job.product_id = product.id
          AND scoped_job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND COALESCE(scoped_job.job_config ->> 'collector_kind', run.collector_kind, 'unknown') = CASE WHEN pricing_scope.billing_platform='web' THEN 'pricing_page' ELSE 'app_store' END
      ) latest_success ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS pending_observation_count,
          COUNT(*) FILTER (WHERE COALESCE(observation.anomaly_flag, FALSE))::int AS blocked_observation_count,
          COUNT(*) FILTER (WHERE observation.raw_payload ->> 'auto_review_reason_code' = 'waiting_for_more_app_store_samples')::int AS waiting_observation_count,
          COUNT(*) FILTER (WHERE observation.raw_payload ->> 'auto_review_reason_code' = 'app_store_price_changed')::int AS changed_observation_count,
          COUNT(*) FILTER (WHERE observation.raw_payload ->> 'auto_review_reason_code' = 'low_confidence')::int AS low_confidence_observation_count
        FROM price_observations observation
        WHERE observation.product_id = product.id
          AND observation.status = 'pending'::observation_status
          AND observation.billing_platform::text = pricing_scope.billing_platform
      ) observation_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS published_price_count,
          COUNT(DISTINCT price.country_id)::int AS published_region_count,
          COUNT(*) FILTER (
            WHERE price.last_checked_at IS NULL
              OR price.last_checked_at < NOW() - INTERVAL '14 days'
          )::int AS published_stale_price_count,
          MAX(price.last_checked_at) AS latest_price_checked_at
        FROM region_prices price
        WHERE price.product_id = product.id
          AND price.status = 'published'::publish_status
          AND price.billing_platform::text = pricing_scope.billing_platform
          AND price.price_usd IS NOT NULL
      ) published_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS discovery_candidate_count
        FROM product_discovery_candidates candidate
        WHERE candidate.promoted_product_id = product.id
          OR candidate.matched_product_id = product.id
      ) candidate_stats ON TRUE
      WHERE product.status <> 'archived'::publish_status
        ${productFilter}
        ${searchFilter}
        ${categoryFilter}
    ),
    scored_products AS (
      SELECT
        base.*,
        CASE
          WHEN LOWER(COALESCE(base.latest_run_status, '')) = 'failed'
            OR base.blocked_observation_count > 0
            THEN 'exception'
          WHEN (base.app_store_job_count + base.official_web_job_count) <= 0
            OR (base.plan_count <= 0 AND base.published_price_count <= 0)
            THEN 'not_started'
          WHEN base.published_price_count <= 0
            OR base.published_stale_price_count > 0
            OR base.pending_observation_count > 0
            OR LOWER(COALESCE(base.latest_run_status, '')) = 'running'
            OR UPPER(base.product_status) <> 'PUBLISHED'
            THEN 'pending'
          ELSE 'published'
        END AS operational_status,
        (
          (CASE WHEN base.plan_count > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN (base.app_store_job_count + base.official_web_job_count) > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN base.latest_success_at IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN base.published_price_count > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN base.blocked_observation_count = 0 AND base.published_stale_price_count = 0 THEN 1 ELSE 0 END)
        )::int AS readiness_completed
      FROM product_operational_base base
    )
  `;
}

export async function queryPipelineProductsPage({
  q,
  category,
  product,
  stage,
  rawPage,
  pageSize = 10,
}: {
  q: string;
  category: string;
  product: string;
  stage: PipelineStageFilter;
  rawPage?: string | string[] | number;
  pageSize?: number;
}): Promise<PipelineProductsPageResult> {
  const operationalCte = buildFilteredProductOperationalCte({
    q,
    category,
    product,
  });

  const [summaryRows, closestRows] = await Promise.all([
    adminPrisma.$queryRaw<StageSummaryRow[]>`
      ${operationalCte}
      SELECT
        COUNT(*)::int AS total_all,
        COUNT(*) FILTER (WHERE operational_status = 'exception')::int AS exception_count,
        COUNT(*) FILTER (WHERE operational_status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE operational_status = 'not_started')::int AS not_started_count,
        COUNT(*) FILTER (WHERE operational_status = 'published')::int AS published_count
      FROM scored_products
    `,
    adminPrisma.$queryRaw<PipelineProductRow[]>`
      ${operationalCte}
      SELECT *
      FROM scored_products
      WHERE operational_status <> 'published'
      ORDER BY readiness_completed DESC, product_name ASC
      LIMIT 1
    `,
  ]);

  const summary = summaryRows[0];
  const stageCounts = {
    exception: toCount(summary?.exception_count),
    pending: toCount(summary?.pending_count),
    not_started: toCount(summary?.not_started_count),
    published: toCount(summary?.published_count),
  };
  const totalAll = toCount(summary?.total_all);
  const matchingStageTotal =
    stage === "all" ? totalAll : stageCounts[stage];

  const pagination = resolveSqlPagination({
    rawPage,
    total: matchingStageTotal,
    pageSize,
  });

  const stageFilter =
    stage === "all"
      ? Prisma.empty
      : Prisma.sql`WHERE operational_status = ${stage}`;

  const items =
    matchingStageTotal > 0
      ? await adminPrisma.$queryRaw<PipelineProductRow[]>`
          ${operationalCte}
          SELECT *
          FROM scored_products
          ${stageFilter}
          ORDER BY
            CASE operational_status
              WHEN 'exception' THEN 0
              WHEN 'pending' THEN 1
              WHEN 'not_started' THEN 2
              ELSE 3
            END ASC,
            readiness_completed DESC,
            product_name ASC
          LIMIT ${pagination.pageSize}
          OFFSET ${pagination.offset}
        `
      : [];

  return {
    items,
    totalAll,
    stageCounts,
    closestToPublish: closestRows[0] ?? null,
    pagination,
  };
}

export async function queryPipelineStats(): Promise<PipelineStats> {
  const rows = await adminPrisma.$queryRaw<PipelineStatsRow[]>`
    WITH product_status AS (
      SELECT
        product.id,
        COALESCE(job_stats.app_store_job_count, 0)+COALESCE(job_stats.official_web_job_count,0) AS supported_job_count,
        COALESCE(job_stats.due_job_count, 0) AS due_job_count,
        latest_run.status AS latest_run_status,
        latest_success.latest_success_at,
        COALESCE(observation_stats.pending_observation_count, 0) AS pending_observation_count,
        COALESCE(published_stats.published_price_count, 0) AS published_price_count,
        COALESCE(published_stats.published_stale_price_count, 0) AS published_stale_price_count,
        published_stats.latest_price_checked_at
      FROM products product
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (
            WHERE COALESCE(
              job.job_config ->> 'collector_kind',
              source.type::text,
              'unknown'
            ) = 'app_store'
          )::int AS app_store_job_count,
          COUNT(*) FILTER (WHERE ${officialWebJobFilter})::int AS official_web_job_count,
          COUNT(*) FILTER (WHERE job.status = 'active' AND (job.next_run_at IS NULL OR job.next_run_at <= NOW()))::int AS due_job_count
        FROM collector_jobs job
        LEFT JOIN price_sources source ON source.id = job.source_id
        WHERE job.product_id = product.id
          AND job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND job.status <> 'archived'
      ) job_stats ON TRUE
      ${webPilotScope}
      LEFT JOIN LATERAL (
        SELECT run.status
        FROM collector_jobs scoped_job
        JOIN collector_job_runs run ON run.job_id = scoped_job.id
        WHERE scoped_job.product_id = product.id
          AND scoped_job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND COALESCE(scoped_job.job_config ->> 'collector_kind', run.collector_kind, 'unknown') = CASE WHEN pricing_scope.billing_platform='web' THEN 'pricing_page' ELSE 'app_store' END
        ORDER BY run.started_at DESC
        LIMIT 1
      ) latest_run ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(run.started_at) FILTER (WHERE run.status = 'succeeded') AS latest_success_at
        FROM collector_jobs scoped_job
        JOIN collector_job_runs run ON run.job_id = scoped_job.id
        WHERE scoped_job.product_id = product.id
          AND scoped_job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND COALESCE(scoped_job.job_config ->> 'collector_kind', run.collector_kind, 'unknown') = CASE WHEN pricing_scope.billing_platform='web' THEN 'pricing_page' ELSE 'app_store' END
      ) latest_success ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS pending_observation_count
        FROM price_observations observation
        WHERE observation.product_id = product.id
          AND observation.status = 'pending'::observation_status
          AND observation.billing_platform::text = pricing_scope.billing_platform
      ) observation_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS published_price_count,
          COUNT(*) FILTER (
            WHERE price.last_checked_at IS NULL
              OR price.last_checked_at < NOW() - INTERVAL '14 days'
          )::int AS published_stale_price_count,
          MAX(price.last_checked_at) AS latest_price_checked_at
        FROM region_prices price
        WHERE price.product_id = product.id
          AND price.status = 'published'::publish_status
          AND price.billing_platform::text = pricing_scope.billing_platform
          AND price.price_usd IS NOT NULL
      ) published_stats ON TRUE
      WHERE product.status <> 'archived'::publish_status
    )
    SELECT
      COUNT(*)::int AS product_count,
      COUNT(*) FILTER (
        WHERE pending_observation_count = 0
          AND published_price_count > 0
          AND published_stale_price_count = 0
          AND latest_price_checked_at IS NOT NULL
      )::int AS ready_count,
      COUNT(*) FILTER (WHERE supported_job_count <= 0)::int AS setup_count,
      COUNT(*) FILTER (WHERE pending_observation_count > 0)::int AS pending_count,
      COUNT(*) FILTER (WHERE latest_run_status = 'failed')::int AS failed_count,
      COUNT(*) FILTER (WHERE due_job_count > 0)::int AS due_count,
      COUNT(*) FILTER (WHERE latest_run_status = 'running')::int AS running_count,
      COUNT(*) FILTER (
        WHERE published_price_count > 0
          AND (
            published_stale_price_count > 0
            OR latest_price_checked_at IS NULL
          )
      )::int AS stale_count,
      COALESCE(SUM(published_price_count), 0)::int AS published_price_count
    FROM product_status
  `;

  const row = rows[0];
  return {
    productCount: toCount(row?.product_count),
    readyCount: toCount(row?.ready_count),
    setupCount: toCount(row?.setup_count),
    pendingCount: toCount(row?.pending_count),
    failedCount: toCount(row?.failed_count),
    dueCount: toCount(row?.due_count),
    staleCount: toCount(row?.stale_count),
    runningCount: toCount(row?.running_count),
    publishedPriceCount: toCount(row?.published_price_count),
  };
}
