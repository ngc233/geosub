import { Prisma } from "@prisma/client";
import { DEFAULT_APP_STORE_COUNTRY_CODES } from "../../../../lib/app-store-country-policy";
import { prisma } from "../../../../lib/prisma";
import type {
  AvailabilitySummaryRow,
  MissingCountryRow,
  PendingReasonRow,
  PlanCoverageRow,
  ProductSummaryRow,
} from "./model";
export async function getProductSummary(slug: string) {
  const rows = await prisma.$queryRaw<ProductSummaryRow[]>`
    SELECT
      product.id::text,
      product.slug,
      product.name,
      product.category::text AS category,
      product.status::text AS status,
      product.provider,
      product.official_url,
      COALESCE(plan_state.plan_count, 0)::int AS plan_count,
      COALESCE(job_state.app_store_job_count, 0)::int AS app_store_job_count,
      COALESCE(job_state.due_job_count, 0)::int AS due_job_count,
      COALESCE(running_state.running_run_count, 0)::int AS running_run_count,
      latest_run.latest_run_status,
      latest_run.latest_run_started_at,
      latest_run.latest_run_finished_at,
      latest_run.latest_run_error,
      latest_run.latest_run_age_seconds,
      COALESCE(price_state.published_price_count, 0)::int AS published_price_count,
      COALESCE(price_state.published_country_count, 0)::int AS published_country_count,
      COALESCE(price_state.stale_published_count, 0)::int AS stale_published_count,
      price_state.latest_price_checked_at,
      COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_state.pending_anomaly_count, 0)::int AS pending_anomaly_count,
      COALESCE(observation_state.hard_anomaly_count, 0)::int AS hard_anomaly_count,
      observation_state.latest_observed_at
    FROM products product
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS plan_count
      FROM plans plan
      WHERE plan.product_id = product.id
        AND plan.status <> 'archived'::publish_status
    ) plan_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE job.status <> 'archived'
            AND COALESCE(
              job.job_config ->> 'collector_kind',
              source.type::text,
              'unknown'
            ) = 'app_store'
        )::int AS app_store_job_count,
        COUNT(*) FILTER (
          WHERE job.status = 'active'
            AND COALESCE(
              job.job_config ->> 'collector_kind',
              source.type::text,
              'unknown'
            ) = 'app_store'
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
        )::int AS due_job_count
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id = product.id
    ) job_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE run.status = 'running'
            AND run.started_at > NOW() - INTERVAL '20 minutes'
        )::int AS running_run_count
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) = product.id
        AND COALESCE(
          job.job_config ->> 'collector_kind',
          run.collector_kind,
          source.type::text,
          'unknown'
        ) = 'app_store'
    ) running_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        run.status AS latest_run_status,
        run.started_at AS latest_run_started_at,
        run.finished_at AS latest_run_finished_at,
        run.error_message AS latest_run_error,
        CASE
          WHEN run.started_at IS NULL THEN NULL
          ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(run.finished_at, NOW()) - run.started_at)))::int
        END AS latest_run_age_seconds
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) = product.id
        AND COALESCE(
          job.job_config ->> 'collector_kind',
          run.collector_kind,
          source.type::text,
          'unknown'
        ) = 'app_store'
      ORDER BY run.started_at DESC
      LIMIT 1
    ) latest_run ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        )::int AS published_price_count,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        )::int AS published_country_count,
        COUNT(*) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
            AND (
              price.last_checked_at IS NULL
              OR price.last_checked_at < NOW() - INTERVAL '14 days'
            )
        )::int AS stale_published_count,
        MAX(price.last_checked_at) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        ) AS latest_price_checked_at
      FROM region_prices price
      WHERE price.product_id = product.id
    ) price_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
        )::int AS pending_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
            AND COALESCE(observation.anomaly_flag, FALSE)
        )::int AS pending_anomaly_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
            AND (
              COALESCE(observation.anomaly_flag, FALSE)
              OR COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
                'app_store_observation_anomaly',
                'app_store_price_suspiciously_low',
                'app_store_global_price_outlier',
                'app_store_currency_mismatch',
                'app_store_local_dollar_parsed_as_usd',
                'app_store_plan_order_conflict',
                'suspicious_low_converted_usd',
                'suspicious_plan_order'
              )
            )
        )::int AS hard_anomaly_count,
        MAX(observation.observed_at) FILTER (
          WHERE observation.billing_platform = 'ios'::billing_platform
        ) AS latest_observed_at
      FROM price_observations observation
      WHERE observation.product_id = product.id
    ) observation_state ON TRUE
    WHERE product.slug = ${slug}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getPlanCoverageRows(productId: string) {
  return prisma.$queryRaw<PlanCoverageRow[]>`
    WITH target_country AS (
      SELECT country.id, country.code
      FROM countries country
      WHERE country.code IN (${Prisma.join(DEFAULT_APP_STORE_COUNTRY_CODES)})
        AND country.code NOT IN ('CN', 'HK')
        AND NOT EXISTS (
          SELECT 1
          FROM app_store_availability_latest_view availability
          WHERE availability.product_id = ${productId}::uuid
            AND availability.country_id = country.id
            AND availability.billing_platform = 'ios'::billing_platform
            AND availability.status IN ('not_available', 'available_no_iap')
        )
    )
    SELECT
      plan.id::text AS plan_id,
      plan.slug AS plan_slug,
      plan.name AS plan_name,
      plan.billing_cycle::text AS billing_cycle,
      plan.status::text AS status,
      COALESCE(price_state.published_price_count, 0)::int AS published_price_count,
      COALESCE(price_state.published_country_count, 0)::int AS published_country_count,
      (
        SELECT COUNT(*)::int
        FROM target_country country
        WHERE NOT EXISTS (
          SELECT 1
          FROM app_store_plan_availability_checks plan_availability
          WHERE plan_availability.plan_id = plan.id
            AND plan_availability.country_id = country.id
            AND plan_availability.billing_platform = 'ios'::billing_platform
            AND plan_availability.status = 'confirmed_absent'
        )
      )::int AS common_country_count,
      COALESCE(price_state.common_published_country_count, 0)::int AS common_published_country_count,
      COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_state.pending_anomaly_count, 0)::int AS pending_anomaly_count,
      price_state.min_price_usd,
      price_state.max_price_usd,
      price_state.latest_price_checked_at,
      observation_state.latest_observed_at
    FROM plans plan
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        )::int AS published_price_count,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        )::int AS published_country_count,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
            AND price.country_id IN (SELECT id FROM target_country)
        )::int AS common_published_country_count,
        MIN(price.price_usd) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        ) AS min_price_usd,
        MAX(price.price_usd) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        ) AS max_price_usd,
        MAX(price.last_checked_at) FILTER (
          WHERE price.status = 'published'::publish_status
            AND price.billing_platform = 'ios'::billing_platform
        ) AS latest_price_checked_at
      FROM region_prices price
      WHERE price.plan_id = plan.id
    ) price_state ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
        )::int AS pending_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
            AND observation.billing_platform = 'ios'::billing_platform
            AND COALESCE(observation.anomaly_flag, FALSE)
        )::int AS pending_anomaly_count,
        MAX(observation.observed_at) FILTER (
          WHERE observation.billing_platform = 'ios'::billing_platform
        ) AS latest_observed_at
      FROM price_observations observation
      WHERE observation.plan_id = plan.id
    ) observation_state ON TRUE
    WHERE plan.product_id = ${productId}::uuid
      AND plan.status <> 'archived'::publish_status
    ORDER BY plan.sort_order ASC, plan.created_at ASC
  `;
}

export async function getMissingCountryRows(productId: string, limit = 80) {
  return prisma.$queryRaw<MissingCountryRow[]>`
    WITH target_country AS (
      SELECT
        country.id,
        country.code,
        country.name_zh,
        country.name_en,
        country.currency,
        country.sort_order
      FROM countries country
      WHERE country.code IN (${Prisma.join(DEFAULT_APP_STORE_COUNTRY_CODES)})
        AND country.code NOT IN ('CN', 'HK')
        AND NOT EXISTS (
          SELECT 1
          FROM app_store_availability_latest_view availability
          WHERE availability.product_id = ${productId}::uuid
            AND availability.country_id = country.id
            AND availability.billing_platform = 'ios'::billing_platform
            AND availability.status IN ('not_available', 'available_no_iap')
        )
    ),
    plan_scope AS (
      SELECT id, slug, name, sort_order
      FROM plans
      WHERE product_id = ${productId}::uuid
        AND status <> 'archived'::publish_status
    )
    SELECT
      plan.slug AS plan_slug,
      plan.name AS plan_name,
      country.code AS country_code,
      COALESCE(country.name_zh, country.name_en, country.code) AS country_name,
      country.currency,
      COALESCE(pending.pending_observation_count, 0)::int AS pending_observation_count,
      availability.status AS latest_availability_status,
      availability.reason AS latest_availability_reason,
      plan_availability.status AS plan_availability_status,
      COALESCE(plan_availability.consecutive_missing_count, 0)::int
        AS consecutive_missing_count
    FROM plan_scope plan
    CROSS JOIN target_country country
    LEFT JOIN region_prices price
      ON price.plan_id = plan.id
      AND price.country_id = country.id
      AND price.status = 'published'::publish_status
      AND price.billing_platform = 'ios'::billing_platform
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS pending_observation_count
      FROM price_observations observation
      WHERE observation.plan_id = plan.id
        AND observation.country_id = country.id
        AND observation.status = 'pending'::observation_status
        AND observation.billing_platform = 'ios'::billing_platform
    ) pending ON TRUE
    LEFT JOIN app_store_availability_latest_view availability
      ON availability.product_id = ${productId}::uuid
      AND availability.country_id = country.id
      AND availability.billing_platform = 'ios'::billing_platform
    LEFT JOIN app_store_plan_availability_checks plan_availability
      ON plan_availability.plan_id = plan.id
      AND plan_availability.country_id = country.id
      AND plan_availability.billing_platform = 'ios'::billing_platform
    WHERE price.id IS NULL
      AND COALESCE(plan_availability.status, '') <> 'confirmed_absent'
    ORDER BY plan.sort_order ASC, country.sort_order ASC
    LIMIT ${limit}
  `;
}

export async function getPendingReasonRows(productId: string) {
  return prisma.$queryRaw<PendingReasonRow[]>`
    SELECT
      NULLIF(
        COALESCE(
          observation.raw_payload ->> 'auto_review_reason_code',
          observation.anomaly_reason,
          'unknown'
        ),
        ''
      ) AS reason_code,
      COUNT(*)::int AS observation_count,
      COUNT(DISTINCT observation.plan_id)::int AS plan_count,
      COUNT(DISTINCT observation.country_id)::int AS country_count,
      MIN(observation.converted_usd) AS min_price_usd,
      MAX(observation.converted_usd) AS max_price_usd,
      MAX(observation.observed_at) AS latest_observed_at
    FROM price_observations observation
    WHERE observation.product_id = ${productId}::uuid
      AND observation.status = 'pending'::observation_status
      AND observation.billing_platform = 'ios'::billing_platform
    GROUP BY reason_code
    ORDER BY COUNT(*) DESC, reason_code ASC
    LIMIT 12
  `;
}

export async function getAvailabilitySummaryRows(productId: string) {
  return prisma.$queryRaw<AvailabilitySummaryRow[]>`
    SELECT
      availability.status,
      COUNT(*)::int AS country_count,
      MAX(availability.checked_at) AS latest_checked_at
    FROM app_store_availability_latest_view availability
    WHERE availability.product_id = ${productId}::uuid
      AND availability.billing_platform = 'ios'::billing_platform
    GROUP BY availability.status
    ORDER BY COUNT(*) DESC, availability.status ASC
  `;
}
