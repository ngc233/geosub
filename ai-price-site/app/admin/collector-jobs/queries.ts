import { measureAdminWorkload } from "../../../lib/admin-performance";
import { prisma } from "../../../lib/prisma";
import type { AvailabilityRow, JobRow, RunRow } from "./model";

export async function getCollectorJobsPageData() {  return measureAdminWorkload(
    "collector-jobs.page-data",
    () => Promise.all([
    prisma.$queryRaw<JobRow[]>`
      WITH job_scope AS (
        SELECT
          job.id,
          job.product_id,
          product.name AS product_name,
          product.slug AS product_slug,
          product.status::text AS product_status,
          source.name AS source_name,
          source.type::text AS source_type,
          job.job_type,
          job.schedule,
          job.status,
          job.next_run_at,
          job.last_run_at,
          job.success_count,
          job.error_count,
          job.last_error,
          job.priority,
          job.job_config,
          job.updated_at,
          job.created_at,
          candidate.name AS discovery_candidate_name
        FROM collector_jobs job
        JOIN products product ON product.id = job.product_id
        LEFT JOIN price_sources source ON source.id = job.source_id
        LEFT JOIN product_discovery_candidates candidate ON candidate.id = job.discovery_candidate_id
        WHERE job.status <> 'archived'
        ORDER BY
          CASE job.status
            WHEN 'failed' THEN 1
            WHEN 'active' THEN 2
            WHEN 'paused' THEN 3
            ELSE 4
          END,
          job.priority DESC,
          job.next_run_at NULLS FIRST,
          job.created_at DESC
        LIMIT 160
      ),
      published_price_state AS (
        SELECT
          price.product_id,
          COUNT(*) FILTER (
            WHERE price.status = 'published'::publish_status
          )::int AS published_price_count
        FROM region_prices price
        JOIN (SELECT DISTINCT product_id FROM job_scope WHERE product_id IS NOT NULL) scoped_product
          ON scoped_product.product_id = price.product_id
        GROUP BY price.product_id
      ),
      observation_state AS (
        SELECT
          observation.product_id,
          COUNT(*) FILTER (
            WHERE observation.status = 'pending'::observation_status
          )::int AS pending_observation_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'approved'::observation_status
          )::int AS approved_observation_count,
          COUNT(*) FILTER (
            WHERE observation.billing_platform = 'ios'::billing_platform
              AND observation.observed_at >= NOW() - INTERVAL '14 days'
          )::int AS recent_app_store_observation_count
        FROM price_observations observation
        JOIN (SELECT DISTINCT product_id FROM job_scope WHERE product_id IS NOT NULL) scoped_product
          ON scoped_product.product_id = observation.product_id
        GROUP BY observation.product_id
      )
      SELECT
        job.id::text,
        job.product_id::text,
        job.product_name,
        job.product_slug,
        job.product_status,
        job.source_name,
        job.source_type,
        job.job_type,
        job.schedule,
        job.status,
        job.next_run_at,
        job.last_run_at,
        job.success_count,
        job.error_count,
        job.last_error,
        job.priority,
        job.job_config ->> 'collector_kind' AS collector_kind,
        job.discovery_candidate_name,
        latest_runs.status AS latest_run_status,
        latest_runs.started_at AS latest_run_started_at,
        latest_runs.error_message AS latest_run_error,
        latest_runs.output_excerpt AS latest_run_output,
        latest_runs.raw_payload ->> 'diagnosis' AS latest_run_diagnosis,
        latest_runs.raw_payload ->> 'state' AS latest_runner_state,
        latest_runs.raw_payload ->> 'pid' AS latest_process_id,
        COALESCE(latest_runs.raw_payload ? 'review_outcome', FALSE) AS latest_has_review_outcome,
        COALESCE((latest_runs.raw_payload #>> '{review_outcome,observed_count}')::int, 0) AS latest_observed_count,
        COALESCE((latest_runs.raw_payload #>> '{review_outcome,approved_count}')::int, 0) AS latest_approved_count,
        COALESCE((latest_runs.raw_payload #>> '{review_outcome,pending_stability_count}')::int, 0) AS latest_pending_stability_count,
        COALESCE((latest_runs.raw_payload #>> '{review_outcome,isolated_count}')::int, 0) AS latest_isolated_count,
        COALESCE((latest_runs.raw_payload #>> '{review_outcome,published_price_count}')::int, 0) AS latest_published_price_count,
        COALESCE((latest_runs.raw_payload #>> '{review_outcome,storefront_count}')::int, 0) AS latest_storefront_count,
        CASE
          WHEN latest_runs.started_at IS NULL THEN NULL
          ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(latest_runs.finished_at, NOW()) - latest_runs.started_at)))::int
        END AS latest_run_age_seconds,
        COALESCE(published_price_state.published_price_count, 0)::int AS published_price_count,
        COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
        COALESCE(observation_state.approved_observation_count, 0)::int AS approved_observation_count,
        COALESCE(observation_state.recent_app_store_observation_count, 0)::int AS recent_app_store_observation_count,
        (
          job.status = 'active'
          AND (
            job.next_run_at IS NULL
            OR job.next_run_at <= NOW()
          )
        ) AS is_due,
        (
          job.status = 'active'
          AND job.priority >= 100
          AND (
            job.next_run_at IS NULL
            OR job.next_run_at <= NOW()
          )
          AND (
            latest_runs.started_at IS NULL
            OR job.updated_at > latest_runs.started_at
          )
        ) AS queue_pending
      FROM job_scope job
      LEFT JOIN LATERAL (
        SELECT
          run.status,
          run.started_at,
          run.finished_at,
          run.error_message,
          run.output_excerpt,
          run.raw_payload
        FROM collector_job_runs run
        WHERE run.job_id = job.id
        ORDER BY run.started_at DESC
        LIMIT 1
      ) latest_runs ON TRUE
      LEFT JOIN published_price_state ON published_price_state.product_id = job.product_id
      LEFT JOIN observation_state ON observation_state.product_id = job.product_id
      ORDER BY
        CASE job.status
          WHEN 'failed' THEN 1
          WHEN 'active' THEN 2
          WHEN 'paused' THEN 3
          ELSE 4
        END,
        job.priority DESC,
        job.next_run_at NULLS FIRST,
        job.created_at DESC
      LIMIT 160
    `,
    prisma.$queryRaw<RunRow[]>`
      SELECT
        run.id::text,
        run.job_id::text,
        product.slug AS product_slug,
        product.name AS product_name,
        source.name AS source_name,
        run.status,
        run.collector_kind,
        run.started_at,
        run.finished_at,
        run.duration_ms,
        run.error_message,
        run.output_excerpt,
        run.raw_payload ->> 'diagnosis' AS diagnosis
        ,
        run.raw_payload ->> 'pid' AS process_id,
        run.raw_payload ->> 'state' AS runner_state,
        GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(run.finished_at, NOW()) - run.started_at)))::int AS run_age_seconds,
        COALESCE(
          (run.raw_payload #>> '{review_outcome,observed_count}')::int,
          observation_outcome.observed_count,
          0
        )::int AS observed_count,
        COALESCE(
          (run.raw_payload #>> '{review_outcome,pending_stability_count}')::int,
          observation_outcome.pending_observation_count,
          0
        )::int AS pending_observation_count,
        COALESCE(
          (run.raw_payload #>> '{review_outcome,approved_count}')::int,
          observation_outcome.approved_observation_count,
          0
        )::int AS approved_observation_count,
        COALESCE(
          (run.raw_payload #>> '{review_outcome,rejected_count}')::int,
          observation_outcome.rejected_observation_count,
          0
        )::int AS rejected_observation_count,
        COALESCE(
          (run.raw_payload #>> '{review_outcome,ignored_count}')::int,
          observation_outcome.ignored_observation_count,
          0
        )::int AS ignored_observation_count,
        COALESCE(
          (run.raw_payload #>> '{review_outcome,anomaly_count}')::int,
          observation_outcome.anomaly_observation_count,
          0
        )::int AS anomaly_observation_count,
        COALESCE(
          (run.raw_payload #>> '{review_outcome,published_price_count}')::int,
          published_outcome.published_price_count,
          0
        )::int AS published_price_count
      FROM collector_job_runs run
      LEFT JOIN products product ON product.id = run.product_id
      LEFT JOIN price_sources source ON source.id = run.source_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(observation.id)::int AS observed_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'pending'::observation_status
          )::int AS pending_observation_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'approved'::observation_status
          )::int AS approved_observation_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'rejected'::observation_status
          )::int AS rejected_observation_count,
          COUNT(*) FILTER (
            WHERE observation.status = 'ignored'::observation_status
          )::int AS ignored_observation_count,
          COUNT(*) FILTER (
            WHERE COALESCE(observation.anomaly_flag, FALSE)
          )::int AS anomaly_observation_count
        FROM price_observations observation
        WHERE run.product_id IS NOT NULL
          AND observation.product_id = run.product_id
          AND (
            run.source_id IS NULL
            OR observation.source_id IS NULL
            OR observation.source_id = run.source_id
          )
          AND observation.observed_at >= run.started_at - INTERVAL '2 minutes'
          AND observation.observed_at <= LEAST(
            COALESCE(run.finished_at, NOW()) + INTERVAL '10 minutes',
            run.started_at + INTERVAL '2 hours'
          )
      ) observation_outcome ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(price.id)::int AS published_price_count
        FROM region_prices price
        WHERE run.product_id IS NOT NULL
          AND price.product_id = run.product_id
          AND (
            run.source_id IS NULL
            OR price.primary_source_id IS NULL
            OR price.primary_source_id = run.source_id
          )
          AND price.status = 'published'::publish_status
          AND price.last_checked_at >= run.started_at - INTERVAL '2 minutes'
          AND price.last_checked_at <= LEAST(
            COALESCE(run.finished_at, NOW()) + INTERVAL '10 minutes',
            run.started_at + INTERVAL '2 hours'
          )
      ) published_outcome ON TRUE
      ORDER BY run.started_at DESC
      LIMIT 50
    `,
    prisma.$queryRaw<AvailabilityRow[]>`
      SELECT
        availability.id::text,
        availability.product_name,
        availability.product_slug,
        availability.country_code,
        availability.country_name_zh,
        availability.status,
        availability.source_name,
        availability.item_count,
        availability.subscription_item_count,
        availability.ignored_item_count,
        availability.reason,
        availability.checked_at
      FROM app_store_availability_latest_view availability
      ORDER BY availability.checked_at DESC, availability.product_name, availability.country_code
      LIMIT 80
    `,
    ]),
  );

}
