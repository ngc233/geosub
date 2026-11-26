import "server-only";

import { Prisma } from "@prisma/client";
import { adminPrisma as prisma } from "./prisma";
import {
  officialWebEligibleJobSql,
  webPricingScopeJoinSql,
} from "./admin-product-scope";
import type { AdminOperationalStatus } from "./admin-operational-status";
import type { AdminSortDirection } from "./admin-list-params";

export type CanonicalProductStatusRow = {
  product_id: string;
  product_slug: string;
  product_name: string;
  product_category: string;
  product_status: string;
  provider: string | null;
  sort_order: number | null;
  created_at: Date | string;
  billing_platform: "ios" | "web";
  operational_status: AdminOperationalStatus;
  plan_count: unknown;
  price_count: unknown;
  country_count: unknown;
  min_price_usd: unknown;
  max_price_usd: unknown;
  verified_price_count: unknown;
  stale_price_count: unknown;
  pending_price_count: unknown;
  missing_source_count: unknown;
  total_job_count: unknown;
  app_store_job_count: unknown;
  official_web_job_count: unknown;
  active_job_count: unknown;
  due_job_count: unknown;
  source_count: unknown;
  next_run_at: Date | string | null;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_error: string | null;
  failure_phase: string | null;
  failure_stage: string | null;
  collector_status: string | null;
  auto_review_status: string | null;
  latest_success_at: Date | string | null;
  has_fresh_success: boolean | null;
  pending_observation_count: unknown;
  blocked_observation_count: unknown;
  waiting_observation_count: unknown;
  changed_observation_count: unknown;
  low_confidence_observation_count: unknown;
  published_price_count: unknown;
  published_region_count: unknown;
  published_stale_price_count: unknown;
  latest_price_checked_at: Date | string | null;
  last_checked_at: Date | string | null;
  discovery_candidate_count: unknown;
};

export type CanonicalOperationalCounts = Record<AdminOperationalStatus, number>;

export type CanonicalCatalogSummaryRow = {
  category: string;
  operational_status: AdminOperationalStatus;
  product_count: unknown;
  plan_count: unknown;
  price_count: unknown;
};

export type CanonicalCatalogSort =
  | "default"
  | "name"
  | "plans"
  | "countries"
  | "prices"
  | "checked";

export type CanonicalSqlPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  offset: number;
};

function toSafeInt(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeSqlPagination(
  rawPage: string | string[] | number | undefined,
  total: number,
  pageSize: number,
): CanonicalSqlPagination {
  const safeSize = Math.max(1, Math.min(100, Math.trunc(pageSize)));
  const safeTotal = Math.max(0, Math.trunc(total));
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeSize));
  const raw = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? "1"), 10);
  const requested = Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
  const page = Math.min(requested, totalPages);

  return {
    page,
    pageSize: safeSize,
    total: safeTotal,
    totalPages,
    offset: (page - 1) * safeSize,
  };
}

/**
 * Canonical SQL expression for operational status aligned with
 * lib/admin-operational-status.ts (`assessProductOperationalStatus`).
 * Shared across /admin/products and /admin/pipeline so status counts and
 * SQL-level filtering/pagination always match the exact same rules.
 */
function buildCanonicalProductStatusCte({
  product,
  q,
  category,
}: {
  product?: string;
  q?: string;
  category?: string;
}) {
  const officialWebJobFilter = officialWebEligibleJobSql("product", "job");
  const webPilotScope = webPricingScopeJoinSql({
    statsAlias: "job_stats",
    officialWebCountColumn: "official_web_job_count",
    appStoreCountColumn: "app_store_job_count",
    scopeAlias: "pricing_scope",
  });

  const normalizedProduct = String(product || "").trim().toLowerCase();
  const normalizedQ = String(q || "").trim();
  const normalizedCategory = String(category || "").trim().toLowerCase();

  const productFilter = normalizedProduct
    ? Prisma.sql`AND product.slug = ${normalizedProduct}`
    : Prisma.empty;
  const searchFilter =
    normalizedQ && !normalizedProduct
      ? Prisma.sql`AND (product.slug ILIKE ${`%${normalizedQ}%`} OR product.name ILIKE ${`%${normalizedQ}%`} OR COALESCE(product.provider, '') ILIKE ${`%${normalizedQ}%`})`
      : Prisma.empty;
  const categoryFilter =
    normalizedCategory && normalizedCategory !== "all"
      ? Prisma.sql`AND product.category = ${normalizedCategory}::product_category`
      : Prisma.empty;

  return Prisma.sql`
    WITH base_products AS (
      SELECT
        product.id::text AS product_id,
        product.slug AS product_slug,
        product.name AS product_name,
        product.category::text AS product_category,
        product.status::text AS product_status,
        product.provider,
        product.sort_order,
        product.created_at,
        pricing_scope.billing_platform AS billing_platform,
        COALESCE(plan_stats.plan_count, 0)::int AS plan_count,
        COALESCE(price_stats.price_count, 0)::int AS price_count,
        COALESCE(price_stats.country_count, 0)::int AS country_count,
        price_stats.min_price_usd,
        price_stats.max_price_usd,
        COALESCE(price_stats.verified_price_count, 0)::int AS verified_price_count,
        COALESCE(price_stats.stale_price_count, 0)::int AS stale_price_count,
        COALESCE(price_stats.pending_price_count, 0)::int AS pending_price_count,
        COALESCE(price_stats.missing_source_count, 0)::int AS missing_source_count,
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
        price_stats.last_checked_at,
        COALESCE(candidate_stats.discovery_candidate_count, 0)::int AS discovery_candidate_count
      FROM products product
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS plan_count
        FROM plans plan
        WHERE plan.product_id = product.id
          AND plan.status <> 'archived'::publish_status
      ) plan_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS price_count,
          COUNT(DISTINCT price.country_id)::int AS country_count,
          MIN(price.price_usd) AS min_price_usd,
          MAX(price.price_usd) AS max_price_usd,
          COUNT(*) FILTER (WHERE price.data_quality = 'verified'::data_quality)::int AS verified_price_count,
          COUNT(*) FILTER (WHERE price.data_quality = 'stale'::data_quality)::int AS stale_price_count,
          COUNT(*) FILTER (WHERE price.data_quality = 'pending_review'::data_quality)::int AS pending_price_count,
          COUNT(*) FILTER (WHERE price.primary_source_id IS NULL)::int AS missing_source_count,
          MAX(COALESCE(price.last_checked_at, price.updated_at)) AS last_checked_at
        FROM region_prices price
        WHERE price.product_id = product.id
          AND price.status <> 'archived'::publish_status
      ) price_stats ON TRUE
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
    classified_products AS (
      SELECT
        bp.*,
        CASE
          WHEN bp.latest_run_status = 'failed' OR bp.blocked_observation_count > 0 THEN 'exception'
          WHEN (bp.app_store_job_count + bp.official_web_job_count) <= 0 AND bp.published_price_count <= 0 AND bp.price_count <= 0 THEN 'not_started'
          WHEN bp.published_price_count > 0
            AND bp.pending_observation_count = 0
            AND bp.published_stale_price_count = 0
            AND LOWER(bp.product_status) = 'published' THEN 'published'
          ELSE 'pending'
        END AS operational_status
      FROM base_products bp
    )
  `;
}

export function resolveCatalogOrderSql(
  sort: CanonicalCatalogSort,
  direction: AdminSortDirection,
): Prisma.Sql {
  const dir = direction === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  switch (sort) {
    case "plans":
      return Prisma.sql`ORDER BY plan_count ${dir}, product_name ASC`;
    case "countries":
      return Prisma.sql`ORDER BY country_count ${dir}, product_name ASC`;
    case "prices":
      return Prisma.sql`ORDER BY price_count ${dir}, product_name ASC`;
    case "checked":
      return Prisma.sql`ORDER BY last_checked_at ${dir} NULLS LAST, product_name ASC`;
    case "name":
      return Prisma.sql`ORDER BY product_name ${dir}, product_slug ASC`;
    default:
      return Prisma.sql`ORDER BY sort_order ASC NULLS LAST, created_at ASC, product_name ASC`;
  }
}

export async function queryCanonicalProductsPage({
  product,
  q,
  category,
  state,
  sort = "default",
  direction = "asc",
  page,
  pageSize = 25,
}: {
  product?: string;
  q?: string;
  category?: string;
  state?: "all" | AdminOperationalStatus;
  sort?: CanonicalCatalogSort;
  direction?: AdminSortDirection;
  page?: string | string[] | number;
  pageSize?: number;
}) {
  const cteAllCategories = buildCanonicalProductStatusCte({ product, q });
  const normalizedCategory = String(category || "all").trim().toLowerCase();
  const normalizedState =
    state && state !== "all" ? state : null;

  const [summaryRows, archivedRows] = await Promise.all([
    prisma.$queryRaw<CanonicalCatalogSummaryRow[]>`
      ${cteAllCategories}
      SELECT
        product_category AS category,
        operational_status,
        COUNT(*)::int AS product_count,
        COALESCE(SUM(plan_count), 0)::int AS plan_count,
        COALESCE(SUM(price_count), 0)::int AS price_count
      FROM classified_products
      GROUP BY product_category, operational_status
    `,
    prisma.$queryRaw<Array<{ archived_count: unknown }>>`
      SELECT COUNT(*)::int AS archived_count
      FROM products
      WHERE status = 'archived'::publish_status
    `,
  ]);

  const operationalCounts: CanonicalOperationalCounts = {
    not_started: 0,
    pending: 0,
    exception: 0,
    published: 0,
  };
  let totalPlans = 0;
  let totalPrices = 0;
  let matchedCount = 0;

  for (const row of summaryRows) {
    const count = toSafeInt(row.product_count);
    const inCategory =
      normalizedCategory === "all" || row.category.toLowerCase() === normalizedCategory;
    if (inCategory) {
      operationalCounts[row.operational_status] =
        (operationalCounts[row.operational_status] ?? 0) + count;
      totalPlans += toSafeInt(row.plan_count);
      totalPrices += toSafeInt(row.price_count);
      if (!normalizedState || row.operational_status === normalizedState) {
        matchedCount += count;
      }
    }
  }

  const pagination = normalizeSqlPagination(page, matchedCount, pageSize);
  const cteScoped = buildCanonicalProductStatusCte({
    product,
    q,
    category: normalizedCategory,
  });
  const stateFilter = normalizedState
    ? Prisma.sql`WHERE operational_status = ${normalizedState}`
    : Prisma.empty;
  const orderSql = resolveCatalogOrderSql(sort, direction);

  const rows =
    matchedCount > 0
      ? await prisma.$queryRaw<CanonicalProductStatusRow[]>`
          ${cteScoped}
          SELECT *
          FROM classified_products
          ${stateFilter}
          ${orderSql}
          LIMIT ${pagination.pageSize}
          OFFSET ${pagination.offset}
        `
      : [];

  return {
    rows,
    pagination,
    summaryRows,
    operationalCounts,
    archivedCount: toSafeInt(archivedRows[0]?.archived_count),
    totalPlans,
    totalPrices,
  };
}

export async function queryCanonicalPipelinePage({
  product,
  q,
  category,
  stage,
  page,
  pageSize = 10,
}: {
  product?: string;
  q?: string;
  category?: string;
  stage?: "all" | AdminOperationalStatus;
  page?: string | string[] | number;
  pageSize?: number;
}) {
  const cte = buildCanonicalProductStatusCte({ product, q, category });
  const normalizedStage = stage && stage !== "all" ? stage : null;

  const [stageCountRows, closestRows] = await Promise.all([
    prisma.$queryRaw<Array<{ operational_status: AdminOperationalStatus; count: unknown }>>`
      ${cte}
      SELECT operational_status, COUNT(*)::int AS count
      FROM classified_products
      GROUP BY operational_status
    `,
    prisma.$queryRaw<CanonicalProductStatusRow[]>`
      ${cte}
      SELECT *
      FROM classified_products
      WHERE operational_status <> 'published'
      ORDER BY
        (CASE WHEN plan_count > 0 THEN 1 ELSE 0 END
          + CASE WHEN (app_store_job_count + official_web_job_count) > 0 THEN 1 ELSE 0 END
          + CASE WHEN latest_success_at IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN published_price_count > 0 THEN 1 ELSE 0 END
          + CASE WHEN blocked_observation_count = 0 AND published_stale_price_count = 0 THEN 1 ELSE 0 END) DESC,
        product_name ASC
      LIMIT 1
    `,
  ]);

  const stageCounts: CanonicalOperationalCounts = {
    not_started: 0,
    pending: 0,
    exception: 0,
    published: 0,
  };
  let allCount = 0;
  for (const row of stageCountRows) {
    const count = toSafeInt(row.count);
    stageCounts[row.operational_status] = count;
    allCount += count;
  }

  const matchedCount = normalizedStage ? stageCounts[normalizedStage] : allCount;
  const pagination = normalizeSqlPagination(page, matchedCount, pageSize);
  const stageFilter = normalizedStage
    ? Prisma.sql`WHERE operational_status = ${normalizedStage}`
    : Prisma.empty;

  const rows =
    matchedCount > 0
      ? await prisma.$queryRaw<CanonicalProductStatusRow[]>`
          ${cte}
          SELECT *
          FROM classified_products
          ${stageFilter}
          ORDER BY
            CASE operational_status
              WHEN 'exception' THEN 0
              WHEN 'pending' THEN 1
              WHEN 'not_started' THEN 2
              ELSE 3
            END ASC,
            (CASE WHEN plan_count > 0 THEN 1 ELSE 0 END
              + CASE WHEN (app_store_job_count + official_web_job_count) > 0 THEN 1 ELSE 0 END
              + CASE WHEN latest_success_at IS NOT NULL THEN 1 ELSE 0 END
              + CASE WHEN published_price_count > 0 THEN 1 ELSE 0 END
              + CASE WHEN blocked_observation_count = 0 AND published_stale_price_count = 0 THEN 1 ELSE 0 END) DESC,
            product_name ASC
          LIMIT ${pagination.pageSize}
          OFFSET ${pagination.offset}
        `
      : [];

  return {
    rows,
    allCount,
    stageCounts,
    closestToPublish: closestRows[0] ?? null,
    pagination,
  };
}
