-- Close the App Store data-quality loop at product level. Anomaly refreshes
-- are debounced, capped at three successful rounds and then retained only as
-- isolated evidence when no trustworthy price can be confirmed.

CREATE TABLE IF NOT EXISTS data_quality_repair_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_kind TEXT NOT NULL,
  anomaly_jobs_queued INTEGER NOT NULL DEFAULT 0,
  stale_jobs_queued INTEGER NOT NULL DEFAULT 0,
  coverage_jobs_queued INTEGER NOT NULL DEFAULT 0,
  anomaly_observations_closed INTEGER NOT NULL DEFAULT 0,
  published_outliers_quarantined INTEGER NOT NULL DEFAULT 0,
  stale_prices_quarantined INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS data_quality_repair_cycles_created_idx
  ON data_quality_repair_cycles (created_at DESC);

WITH ranked AS (
  SELECT
    job.id,
    ROW_NUMBER() OVER (
      PARTITION BY job.product_id
      ORDER BY job.priority DESC, job.created_at DESC, job.id DESC
    ) AS row_number
  FROM collector_jobs job
  WHERE job.product_id IS NOT NULL
    AND job.schedule = 'anomaly_watch'
    AND job.status <> 'archived'
)
UPDATE collector_jobs job
SET
  status = 'archived',
  last_error = 'Archived duplicate anomaly-watch job during repair lifecycle upgrade.',
  updated_at = NOW()
FROM ranked
WHERE job.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS collector_jobs_anomaly_watch_product_idx
  ON collector_jobs (product_id, schedule)
  WHERE schedule = 'anomaly_watch'
    AND status <> 'archived';

CREATE OR REPLACE FUNCTION queue_app_store_anomaly_rechecks(
  p_recent_days INTEGER DEFAULT 7,
  p_max_countries INTEGER DEFAULT 12
)
RETURNS TABLE (
  product_slug TEXT,
  country_codes TEXT[],
  queued_job_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH anomaly_evidence AS (
    SELECT DISTINCT
      observation.product_id,
      UPPER(country.code) AS country_code,
      CONCAT_WS(
        ':',
        COALESCE(observation.plan_id::TEXT, 'unknown-plan'),
        UPPER(country.code),
        COALESCE(
          NULLIF(observation.raw_payload ->> 'auto_review_reason_code', ''),
          NULLIF(observation.anomaly_reason, ''),
          'app_store_observation_anomaly'
        )
      ) AS anomaly_key
    FROM price_observations observation
    JOIN countries country ON country.id = observation.country_id
    LEFT JOIN price_sources source ON source.id = observation.source_id
    WHERE observation.status = 'pending'
      AND observation.billing_platform = 'ios'
      AND observation.observed_at >= NOW() - MAKE_INTERVAL(
        days => GREATEST(1, p_recent_days)
      )
      AND (
        observation.source_level = 'A'
        OR source.type = 'app_store'
      )
      AND (
        COALESCE(observation.anomaly_flag, FALSE)
        OR LOWER(COALESCE(observation.anomaly_reason, '')) LIKE '%hard%'
        OR COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
          'app_store_observation_anomaly',
          'app_store_price_changed',
          'app_store_global_price_outlier',
          'app_store_plan_order_conflict',
          'app_store_currency_mismatch',
          'app_store_local_dollar_parsed_as_usd',
          'app_store_price_suspiciously_low',
          'app_store_hard_anomaly_guard',
          'hard_price_guard'
        )
      )
  ),
  anomaly_groups AS (
    SELECT
      evidence.product_id,
      (
        ARRAY_AGG(DISTINCT evidence.country_code ORDER BY evidence.country_code)
      )[1:GREATEST(1, LEAST(p_max_countries, 39))] AS anomaly_country_codes,
      MD5(
        STRING_AGG(
          evidence.anomaly_key,
          ','
          ORDER BY evidence.anomaly_key
        )
      ) AS anomaly_reference
    FROM anomaly_evidence evidence
    GROUP BY evidence.product_id
  ),
  source_jobs AS (
    SELECT DISTINCT ON (job.product_id)
      job.product_id,
      job.source_id,
      job.job_config
    FROM collector_jobs job
    JOIN anomaly_groups groups ON groups.product_id = job.product_id
    WHERE job.job_config ->> 'collector_kind' = 'app_store'
      AND COALESCE(job.job_config ->> 'app_store_id', '') <> ''
      AND job.schedule <> 'anomaly_watch'
      AND job.status <> 'archived'
    ORDER BY job.product_id, job.priority DESC, job.created_at DESC
  ),
  updated AS (
    UPDATE collector_jobs job
    SET
      status = 'active',
      next_run_at = NOW(),
      priority = 98,
      last_error = NULL,
      job_config = job.job_config
        || jsonb_build_object(
          'schedule_strategy', 'anomaly_watch',
          'country_codes', TO_JSONB(groups.anomaly_country_codes),
          'accuracy_policy', 'anomaly_recheck',
          'queued_reason', 'recent_price_evidence_anomaly',
          'queued_at', NOW()::TEXT,
          'anomaly_reference', groups.anomaly_reference,
          'anomaly_retry_count', CASE
            WHEN COALESCE(job.job_config ->> 'anomaly_reference', '')
              = groups.anomaly_reference
              THEN COALESCE((job.job_config ->> 'anomaly_retry_count')::INTEGER, 0) + 1
            ELSE 1
          END,
          'anomaly_success_count', CASE
            WHEN COALESCE(job.job_config ->> 'anomaly_reference', '')
              = groups.anomaly_reference
              THEN COALESCE((job.job_config ->> 'anomaly_success_count')::INTEGER, 0)
            ELSE 0
          END
        ),
      updated_at = NOW()
    FROM anomaly_groups groups
    WHERE job.product_id = groups.product_id
      AND job.schedule = 'anomaly_watch'
      AND job.status IN ('paused', 'failed')
      AND (
        COALESCE(job.job_config ->> 'anomaly_reference', '')
          <> groups.anomaly_reference
        OR (
          job.status = 'failed'
          AND job.updated_at <= NOW() - INTERVAL '1 hour'
        )
        OR (
          job.status = 'paused'
          AND COALESCE((job.job_config ->> 'anomaly_success_count')::INTEGER, 0) < 3
          AND job.updated_at <= NOW() - INTERVAL '12 hours'
        )
      )
    RETURNING job.id, job.product_id, job.job_config
  ),
  inserted AS (
    INSERT INTO collector_jobs (
      id,
      source_id,
      product_id,
      job_type,
      schedule,
      status,
      next_run_at,
      success_count,
      error_count,
      last_error,
      job_config,
      priority,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      source_jobs.source_id,
      source_jobs.product_id,
      'ai_pricing',
      'anomaly_watch',
      'active',
      NOW(),
      0,
      0,
      NULL,
      source_jobs.job_config
        || jsonb_build_object(
          'schedule_strategy', 'anomaly_watch',
          'country_codes', TO_JSONB(groups.anomaly_country_codes),
          'accuracy_policy', 'anomaly_recheck',
          'queued_reason', 'recent_price_evidence_anomaly',
          'queued_at', NOW()::TEXT,
          'anomaly_reference', groups.anomaly_reference,
          'anomaly_retry_count', 1,
          'anomaly_success_count', 0
        ),
      98,
      NOW(),
      NOW()
    FROM anomaly_groups groups
    JOIN source_jobs ON source_jobs.product_id = groups.product_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM collector_jobs existing
      WHERE existing.product_id = groups.product_id
        AND existing.schedule = 'anomaly_watch'
        AND existing.status <> 'archived'
    )
    ON CONFLICT (product_id, schedule)
      WHERE schedule = 'anomaly_watch' AND status <> 'archived'
      DO NOTHING
    RETURNING id, product_id, job_config
  ),
  queued AS (
    SELECT id, product_id, job_config FROM updated
    UNION ALL
    SELECT id, product_id, job_config FROM inserted
  )
  SELECT
    product.slug,
    ARRAY(
      SELECT jsonb_array_elements_text(queued.job_config -> 'country_codes')
    ),
    queued.id
  FROM queued
  JOIN products product ON product.id = queued.product_id
  ORDER BY product.slug;
END;
$$;

CREATE OR REPLACE FUNCTION close_exhausted_app_store_anomalies(
  p_min_successful_rechecks INTEGER DEFAULT 3
)
RETURNS TABLE (
  product_slug TEXT,
  closed_observation_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH exhausted_jobs AS (
    SELECT DISTINCT ON (job.product_id)
      job.product_id,
      job.updated_at,
      job.job_config
    FROM collector_jobs job
    WHERE job.schedule = 'anomaly_watch'
      AND job.status = 'paused'
      AND COALESCE((job.job_config ->> 'anomaly_success_count')::INTEGER, 0)
        >= GREATEST(1, p_min_successful_rechecks)
    ORDER BY job.product_id, job.updated_at DESC
  ),
  closed AS (
    UPDATE price_observations observation
    SET
      status = 'ignored',
      raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb)
        || jsonb_build_object(
          'previous_auto_review_reason_code',
            observation.raw_payload ->> 'auto_review_reason_code',
          'auto_review_action', 'ignored',
          'auto_review_reason_code', 'automated_anomaly_rechecks_exhausted',
          'auto_review_reason',
            'Three focused App Store rechecks did not produce trustworthy replacement evidence. The sample remains isolated and cannot affect published prices.',
          'auto_closed_at', NOW()::TEXT
        ),
      updated_at = NOW()
    FROM exhausted_jobs exhausted, countries country
    WHERE observation.product_id = exhausted.product_id
      AND country.id = observation.country_id
      AND observation.status = 'pending'
      AND observation.billing_platform = 'ios'
      AND observation.observed_at <= exhausted.updated_at
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          COALESCE(exhausted.job_config -> 'country_codes', '[]'::jsonb)
        ) AS country_code(code)
        WHERE UPPER(country_code.code) = UPPER(country.code)
      )
      AND (
        COALESCE(observation.anomaly_flag, FALSE)
        OR LOWER(COALESCE(observation.anomaly_reason, '')) LIKE '%hard%'
        OR COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
          'app_store_observation_anomaly',
          'app_store_price_changed',
          'app_store_global_price_outlier',
          'app_store_plan_order_conflict',
          'app_store_currency_mismatch',
          'app_store_local_dollar_parsed_as_usd',
          'app_store_price_suspiciously_low',
          'app_store_hard_anomaly_guard',
          'hard_price_guard'
        )
      )
    RETURNING observation.product_id
  )
  SELECT
    product.slug,
    COUNT(*)::INTEGER
  FROM closed
  JOIN products product ON product.id = closed.product_id
  GROUP BY product.slug
  ORDER BY product.slug;
END;
$$;

CREATE OR REPLACE FUNCTION run_data_quality_repair_cycle(
  p_trigger_kind TEXT DEFAULT 'scheduled'
)
RETURNS TABLE (
  cycle_id UUID,
  anomaly_jobs_queued INTEGER,
  stale_jobs_queued INTEGER,
  coverage_jobs_queued INTEGER,
  anomaly_observations_closed INTEGER,
  published_outliers_quarantined INTEGER,
  stale_prices_quarantined INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_cycle_id UUID;
  v_anomaly_jobs INTEGER := 0;
  v_stale_jobs INTEGER := 0;
  v_coverage_jobs INTEGER := 0;
  v_closed_anomalies INTEGER := 0;
  v_published_outliers INTEGER := 0;
  v_stale_prices INTEGER := 0;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_anomaly_jobs
  FROM queue_app_store_anomaly_rechecks(7, 12);

  SELECT COUNT(*)::INTEGER
  INTO v_stale_jobs
  FROM queue_stale_app_store_price_rechecks(14, 20, 24);

  SELECT COUNT(*)::INTEGER
  INTO v_coverage_jobs
  FROM queue_app_store_coverage_gap_rechecks(39, 24, 3);

  SELECT COALESCE(SUM(closed_observation_count), 0)::INTEGER
  INTO v_closed_anomalies
  FROM close_exhausted_app_store_anomalies(3);

  SELECT quarantine_published_app_store_price_outliers()
  INTO v_published_outliers;

  SELECT quarantine_unconfirmed_stale_app_store_prices(14, 3)
  INTO v_stale_prices;

  IF
    v_anomaly_jobs + v_stale_jobs + v_coverage_jobs + v_closed_anomalies
      + COALESCE(v_published_outliers, 0) + COALESCE(v_stale_prices, 0) > 0
    OR NOT EXISTS (
      SELECT 1
      FROM data_quality_repair_cycles cycle
      WHERE cycle.created_at > NOW() - INTERVAL '12 hours'
    )
  THEN
    INSERT INTO data_quality_repair_cycles (
      trigger_kind,
      anomaly_jobs_queued,
      stale_jobs_queued,
      coverage_jobs_queued,
      anomaly_observations_closed,
      published_outliers_quarantined,
      stale_prices_quarantined,
      metadata
    )
    VALUES (
      COALESCE(NULLIF(TRIM(p_trigger_kind), ''), 'scheduled'),
      v_anomaly_jobs,
      v_stale_jobs,
      v_coverage_jobs,
      v_closed_anomalies,
      COALESCE(v_published_outliers, 0),
      COALESCE(v_stale_prices, 0),
      jsonb_build_object(
        'policy', 'app_store_product_level_v1',
        'anomaly_cooldown_hours', 12,
        'max_successful_rechecks', 3,
        'stale_days', 14,
        'coverage_country_count', 39
      )
    )
    RETURNING id INTO v_cycle_id;
  ELSE
    SELECT cycle.id
    INTO v_cycle_id
    FROM data_quality_repair_cycles cycle
    ORDER BY cycle.created_at DESC
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT
    v_cycle_id,
    v_anomaly_jobs,
    v_stale_jobs,
    v_coverage_jobs,
    v_closed_anomalies,
    COALESCE(v_published_outliers, 0),
    COALESCE(v_stale_prices, 0);
END;
$$;

SELECT *
FROM run_data_quality_repair_cycle('migration');
