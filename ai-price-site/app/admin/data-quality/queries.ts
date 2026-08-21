import { Prisma } from "@prisma/client";
import { DEFAULT_APP_STORE_COUNTRY_CODES } from "../../../lib/app-store-country-policy";
import { prisma } from "../../../lib/prisma";
import type { ProductQualityRow, RepairCycleRow } from "./model";
export async function getProductQualityRows() {
  return prisma.$queryRaw<ProductQualityRow[]>`
    WITH target_country AS (
      SELECT id, code
      FROM countries
      WHERE code IN (${Prisma.join(DEFAULT_APP_STORE_COUNTRY_CODES)})
        AND code NOT IN ('CN', 'HK')
    ),
    product_base AS (
      SELECT
        product.id,
        product.slug,
        product.name,
        product.category::text AS category,
        product.status::text AS status
      FROM products product
      WHERE product.status::text <> 'archived'
    ),
    active_plan AS (
      SELECT plan.id, plan.product_id
      FROM plans plan
      WHERE plan.status::text <> 'archived'
    ),
    published_pair AS (
      SELECT DISTINCT price.plan_id, price.country_id
      FROM region_prices price
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
    ),
    plan_state AS (
      SELECT
        plan.product_id,
        COUNT(*)::int AS plan_count
      FROM active_plan plan
      GROUP BY plan.product_id
    ),
    coverage_state AS (
      SELECT
        plan.product_id,
        (SELECT COUNT(*)::int FROM target_country)::int AS target_country_count,
        COUNT(*)::int AS target_pair_count,
        COUNT(*) FILTER (WHERE price.plan_id IS NOT NULL)::int AS covered_pair_count,
        COUNT(*) FILTER (
          WHERE availability.status IN ('not_available', 'available_no_iap')
            OR plan_availability.status = 'confirmed_absent'
        )::int AS unavailable_pair_count,
        COUNT(DISTINCT country.id) FILTER (
          WHERE availability.status IN ('not_available', 'available_no_iap')
        )::int AS confirmed_unavailable_country_count,
        COUNT(*) FILTER (
          WHERE price.plan_id IS NULL
            AND COALESCE(availability.status, '') NOT IN ('not_available', 'available_no_iap')
            AND COALESCE(plan_availability.status, '') <> 'confirmed_absent'
        )::int AS missing_pair_count,
        COUNT(DISTINCT country.id) FILTER (
          WHERE price.plan_id IS NULL
            AND COALESCE(availability.status, '') NOT IN ('not_available', 'available_no_iap')
            AND COALESCE(plan_availability.status, '') <> 'confirmed_absent'
        )::int AS missing_country_count,
        STRING_AGG(DISTINCT country.code, ', ' ORDER BY country.code) FILTER (
          WHERE price.plan_id IS NULL
            AND COALESCE(availability.status, '') NOT IN ('not_available', 'available_no_iap')
            AND COALESCE(plan_availability.status, '') <> 'confirmed_absent'
        ) AS missing_country_codes
      FROM active_plan plan
      CROSS JOIN target_country country
      LEFT JOIN published_pair price
        ON price.plan_id = plan.id
        AND price.country_id = country.id
      LEFT JOIN app_store_availability_latest_view availability
        ON availability.product_id = plan.product_id
        AND availability.country_id = country.id
        AND availability.billing_platform::text = 'ios'
      LEFT JOIN app_store_plan_availability_checks plan_availability
        ON plan_availability.plan_id = plan.id
        AND plan_availability.country_id = country.id
        AND plan_availability.billing_platform::text = 'ios'
      GROUP BY plan.product_id
    ),
    price_state AS (
      SELECT
        price.product_id,
        COUNT(*) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        )::int AS published_price_count,
        COUNT(DISTINCT price.country_id) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        )::int AS published_country_count,
        COUNT(*) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        )::int AS app_store_price_count,
        COUNT(*) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
            AND (
              price.last_checked_at IS NULL
              OR price.last_checked_at < NOW() - INTERVAL '14 days'
            )
        )::int AS stale_published_count,
        MAX(price.last_checked_at) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        ) AS latest_price_checked_at
      FROM region_prices price
      GROUP BY price.product_id
    ),
    published_plan_stats AS MATERIALIZED (
      SELECT
        price.product_id,
        price.plan_id,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY price.price_usd)::numeric AS median_usd,
        COUNT(*)::int AS region_count
      FROM region_prices price
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
        AND price.price_usd IS NOT NULL
        AND price.price_usd >= 1
      GROUP BY price.product_id, price.plan_id
    ),
    outlier_state AS (
      SELECT
        price.product_id,
        COUNT(*) FILTER (
          WHERE price.price_usd < 1
            OR (
              stats.region_count >= 8
              AND (
                price.price_usd < stats.median_usd * 0.2
                OR price.price_usd > stats.median_usd * 3.5
              )
            )
        )::int AS published_outlier_count
      FROM region_prices price
      LEFT JOIN published_plan_stats stats
        ON stats.product_id = price.product_id
       AND stats.plan_id = price.plan_id
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
        AND price.price_usd IS NOT NULL
      GROUP BY price.product_id
    ),
    duplicate_plan_state AS (
      SELECT duplicate.product_id, COUNT(*)::int AS duplicate_plan_group_count
      FROM (
        SELECT
          plan.product_id,
          lower(trim(plan.name)) AS normalized_name
        FROM plans plan
        WHERE plan.status::text = 'published'
        GROUP BY plan.product_id, lower(trim(plan.name))
        HAVING COUNT(*) > 1
      ) duplicate
      GROUP BY duplicate.product_id
    ),
    tax_state AS (
      SELECT
        price.product_id,
        COUNT(DISTINCT price.country_id) FILTER (WHERE tax.id IS NULL)::int AS missing_tax_profile_count
      FROM region_prices price
      LEFT JOIN country_tax_profiles tax
        ON tax.country_id = price.country_id
       AND tax.status = 'active'
      WHERE price.status::text = 'published'
        AND price.billing_platform::text = 'ios'
      GROUP BY price.product_id
    ),
    observation_state AS (
      SELECT
        observation.product_id,
        COUNT(*) FILTER (WHERE observation.status::text = 'pending')::int AS pending_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
        )::int AS pending_app_store_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
            AND observation.anomaly_flag
        )::int AS pending_anomaly_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
            AND COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
              'waiting_for_more_app_store_samples',
              'app_store_price_changed',
              'app_store_samples_too_old',
              'low_confidence'
            )
        )::int AS pending_stability_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
            AND (
              observation.anomaly_flag
              OR lower(COALESCE(observation.anomaly_reason, '')) LIKE '%hard%'
              OR COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
                'app_store_global_price_outlier',
                'app_store_hard_anomaly_guard',
                'hard_price_guard'
              )
            )
        )::int AS hard_anomaly_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'ignored'
            AND observation.billing_platform::text = 'ios'
            AND observation.updated_at > NOW() - INTERVAL '30 days'
        )::int AS ignored_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'ignored'
            AND observation.billing_platform::text = 'ios'
            AND observation.updated_at > NOW() - INTERVAL '30 days'
            AND COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '')
              = 'automated_anomaly_rechecks_exhausted'
        )::int AS auto_closed_observation_count,
        MAX(observation.observed_at) AS latest_observed_at
      FROM price_observations observation
      GROUP BY observation.product_id
    ),
    observation_reason AS (
      SELECT DISTINCT
        observation.product_id,
        CASE
          WHEN observation.status::text = 'pending' THEN 'pending'
          ELSE 'ignored'
        END AS reason_kind,
        NULLIF(COALESCE(
          observation.raw_payload ->> 'auto_review_reason_code',
          observation.anomaly_reason
        ), '') AS reason_code
      FROM price_observations observation
      WHERE observation.status::text = 'pending'
        OR (
          observation.status::text = 'ignored'
          AND observation.billing_platform::text = 'ios'
          AND observation.updated_at > NOW() - INTERVAL '30 days'
        )
    ),
    observation_reason_state AS (
      SELECT
        reason.product_id,
        string_agg(reason.reason_code, ',') FILTER (
          WHERE reason.reason_kind = 'ignored'
        ) AS ignored_reason_codes,
        string_agg(reason.reason_code, ', ') FILTER (
          WHERE reason.reason_kind = 'pending'
        ) AS review_reason_codes
      FROM observation_reason reason
      WHERE reason.reason_code IS NOT NULL
      GROUP BY reason.product_id
    ),
    job_state AS (
      SELECT
        job.product_id,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status <> 'archived'
        )::int AS active_app_store_job_count,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
            AND job.updated_at > NOW() - INTERVAL '15 minutes'
        )::int AS queued_job_count
        ,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
            AND job.updated_at <= NOW() - INTERVAL '15 minutes'
        )::int AS stale_queue_count,
        MAX(job.updated_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
        ) AS latest_queued_at,
        MAX(job.status) FILTER (
          WHERE job.schedule = 'stale_refresh'
            AND job.status <> 'archived'
        ) AS stale_refresh_status,
        MAX(COALESCE((job.job_config ->> 'stale_retry_count')::int, 0)) FILTER (
          WHERE job.schedule = 'stale_refresh'
            AND job.status <> 'archived'
        )::int AS stale_refresh_retry_count,
        MAX(COALESCE((job.job_config ->> 'stale_success_count')::int, 0)) FILTER (
          WHERE job.schedule = 'stale_refresh'
            AND job.status <> 'archived'
        )::int AS stale_refresh_success_count,
        MAX(job.status) FILTER (
          WHERE job.schedule = 'coverage_refresh'
            AND job.status <> 'archived'
        ) AS coverage_refresh_status,
        MAX(COALESCE((job.job_config ->> 'coverage_retry_count')::int, 0)) FILTER (
          WHERE job.schedule = 'coverage_refresh'
            AND job.status <> 'archived'
        )::int AS coverage_refresh_retry_count,
        MAX(COALESCE((job.job_config ->> 'coverage_success_count')::int, 0)) FILTER (
          WHERE job.schedule = 'coverage_refresh'
            AND job.status <> 'archived'
        )::int AS coverage_refresh_success_count,
        MAX(COALESCE((job.job_config ->> 'coverage_missing_pair_count')::int, 0)) FILTER (
          WHERE job.schedule = 'coverage_refresh'
            AND job.status <> 'archived'
        )::int AS coverage_refresh_missing_pair_count,
        MAX(job.status) FILTER (
          WHERE job.schedule = 'anomaly_watch'
            AND job.status <> 'archived'
        ) AS anomaly_refresh_status,
        MAX(COALESCE((job.job_config ->> 'anomaly_retry_count')::int, 0)) FILTER (
          WHERE job.schedule = 'anomaly_watch'
            AND job.status <> 'archived'
        )::int AS anomaly_refresh_retry_count,
        MAX(COALESCE((job.job_config ->> 'anomaly_success_count')::int, 0)) FILTER (
          WHERE job.schedule = 'anomaly_watch'
            AND job.status <> 'archived'
        )::int AS anomaly_refresh_success_count,
        MIN(job.next_run_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.next_run_at > NOW()
        ) AS next_scheduled_run_at,
        MIN(job.next_run_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.schedule = 'stale_refresh'
            AND job.next_run_at > NOW()
        ) AS stale_refresh_next_run_at,
        MIN(job.next_run_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.schedule = 'coverage_refresh'
        ) AS coverage_refresh_next_run_at
        ,
        MIN(job.next_run_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.schedule = 'anomaly_watch'
        ) AS anomaly_refresh_next_run_at
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id IS NOT NULL
      GROUP BY job.product_id
    ),
    running_state AS (
      SELECT
        COALESCE(run.product_id, job.product_id) AS product_id,
        COUNT(*) FILTER (
          WHERE run.status = 'running'
            AND run.started_at > NOW() - INTERVAL '20 minutes'
        )::int AS running_run_count
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) IS NOT NULL
        AND source.type::text = 'app_store'
      GROUP BY COALESCE(run.product_id, job.product_id)
    ),
    latest_run AS (
      SELECT DISTINCT ON (COALESCE(run.product_id, job.product_id))
        COALESCE(run.product_id, job.product_id) AS product_id,
        run.status AS latest_run_status,
        run.started_at AS latest_run_started_at,
        run.finished_at AS latest_run_finished_at,
        run.error_message AS latest_run_error,
        run.raw_payload ->> 'state' AS latest_runner_state,
        CASE
          WHEN run.started_at IS NULL THEN NULL
          ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(run.finished_at, NOW()) - run.started_at)))::int
        END AS latest_run_age_seconds
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) IS NOT NULL
        AND source.type::text = 'app_store'
      ORDER BY COALESCE(run.product_id, job.product_id), run.started_at DESC
    )
    SELECT
      product.id::text,
      product.slug,
      product.name,
      product.category,
      product.status,
      COALESCE(plan_state.plan_count, 0)::int AS plan_count,
      COALESCE(coverage_state.target_country_count, 0)::int AS target_country_count,
      COALESCE(coverage_state.target_pair_count, 0)::int AS target_pair_count,
      COALESCE(coverage_state.covered_pair_count, 0)::int AS covered_pair_count,
      COALESCE(coverage_state.unavailable_pair_count, 0)::int AS unavailable_pair_count,
      COALESCE(coverage_state.confirmed_unavailable_country_count, 0)::int AS confirmed_unavailable_country_count,
      COALESCE(coverage_state.missing_pair_count, 0)::int AS missing_pair_count,
      COALESCE(coverage_state.missing_country_count, 0)::int AS missing_country_count,
      coverage_state.missing_country_codes,
      COALESCE(job_state.active_app_store_job_count, 0)::int AS active_app_store_job_count,
      COALESCE(job_state.queued_job_count, 0)::int AS queued_job_count,
      COALESCE(job_state.stale_queue_count, 0)::int AS stale_queue_count,
      job_state.latest_queued_at,
      job_state.stale_refresh_status,
      COALESCE(job_state.stale_refresh_retry_count, 0)::int AS stale_refresh_retry_count,
      COALESCE(job_state.stale_refresh_success_count, 0)::int AS stale_refresh_success_count,
      job_state.coverage_refresh_status,
      COALESCE(job_state.coverage_refresh_retry_count, 0)::int AS coverage_refresh_retry_count,
      COALESCE(job_state.coverage_refresh_success_count, 0)::int AS coverage_refresh_success_count,
      COALESCE(job_state.coverage_refresh_missing_pair_count, 0)::int AS coverage_refresh_missing_pair_count,
      job_state.anomaly_refresh_status,
      COALESCE(job_state.anomaly_refresh_retry_count, 0)::int AS anomaly_refresh_retry_count,
      COALESCE(job_state.anomaly_refresh_success_count, 0)::int AS anomaly_refresh_success_count,
      job_state.next_scheduled_run_at,
      job_state.stale_refresh_next_run_at,
      job_state.coverage_refresh_next_run_at,
      job_state.anomaly_refresh_next_run_at,
      COALESCE(running_state.running_run_count, 0)::int AS running_run_count,
      latest_run.latest_run_status,
      latest_run.latest_run_started_at,
      latest_run.latest_run_finished_at,
      latest_run.latest_run_error,
      latest_run.latest_runner_state,
      latest_run.latest_run_age_seconds,
      COALESCE(price_state.published_price_count, 0)::int AS published_price_count,
      COALESCE(price_state.published_country_count, 0)::int AS published_country_count,
      COALESCE(price_state.app_store_price_count, 0)::int AS app_store_price_count,
      COALESCE(price_state.stale_published_count, 0)::int AS stale_published_count,
      COALESCE(outlier_state.published_outlier_count, 0)::int AS published_outlier_count,
      COALESCE(duplicate_plan_state.duplicate_plan_group_count, 0)::int AS duplicate_plan_group_count,
      COALESCE(tax_state.missing_tax_profile_count, 0)::int AS missing_tax_profile_count,
      price_state.latest_price_checked_at,
      COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_state.pending_app_store_count, 0)::int AS pending_app_store_count,
      COALESCE(observation_state.pending_anomaly_count, 0)::int AS pending_anomaly_count,
      COALESCE(observation_state.pending_stability_count, 0)::int AS pending_stability_count,
      COALESCE(observation_state.hard_anomaly_count, 0)::int AS hard_anomaly_count,
      COALESCE(observation_state.ignored_observation_count, 0)::int AS ignored_observation_count,
      COALESCE(observation_state.auto_closed_observation_count, 0)::int AS auto_closed_observation_count,
      observation_reason_state.ignored_reason_codes,
      observation_state.latest_observed_at,
      observation_reason_state.review_reason_codes
    FROM product_base product
    LEFT JOIN plan_state ON plan_state.product_id = product.id
    LEFT JOIN coverage_state ON coverage_state.product_id = product.id
    LEFT JOIN price_state ON price_state.product_id = product.id
    LEFT JOIN outlier_state ON outlier_state.product_id = product.id
    LEFT JOIN duplicate_plan_state ON duplicate_plan_state.product_id = product.id
    LEFT JOIN tax_state ON tax_state.product_id = product.id
    LEFT JOIN observation_state ON observation_state.product_id = product.id
    LEFT JOIN observation_reason_state ON observation_reason_state.product_id = product.id
    LEFT JOIN job_state ON job_state.product_id = product.id
    LEFT JOIN running_state ON running_state.product_id = product.id
    LEFT JOIN latest_run ON latest_run.product_id = product.id
    ORDER BY
      CASE
        WHEN COALESCE(running_state.running_run_count, 0) > 0 THEN 1
        WHEN COALESCE(job_state.active_app_store_job_count, 0) <= 0 THEN 2
        WHEN latest_run.latest_run_status = 'failed' THEN 3
        WHEN COALESCE(observation_state.hard_anomaly_count, 0) > 0 THEN 4
        WHEN COALESCE(price_state.published_price_count, 0) <= 0 THEN 5
        WHEN COALESCE(job_state.queued_job_count, 0) > 0 THEN 6
        WHEN COALESCE(job_state.stale_queue_count, 0) > 0 THEN 7
        WHEN COALESCE(observation_state.pending_anomaly_count, 0) > 0 THEN 8
        WHEN COALESCE(observation_state.pending_observation_count, 0) >= 80 THEN 9
        WHEN COALESCE(price_state.stale_published_count, 0) > 0 THEN 10
        ELSE 11
      END,
      COALESCE(observation_state.pending_observation_count, 0) DESC,
      product.name ASC
  `;
}

export async function getLatestRepairCycle() {
  const rows = await prisma.$queryRaw<RepairCycleRow[]>`
    SELECT
      cycle.id::text,
      cycle.trigger_kind,
      cycle.anomaly_jobs_queued,
      cycle.stale_jobs_queued,
      cycle.coverage_jobs_queued,
      cycle.anomaly_observations_closed,
      cycle.published_outliers_quarantined,
      cycle.stale_prices_quarantined,
      cycle.created_at
    FROM data_quality_repair_cycles cycle
    ORDER BY cycle.created_at DESC
    LIMIT 1
  `;

  return rows[0] || null;
}
