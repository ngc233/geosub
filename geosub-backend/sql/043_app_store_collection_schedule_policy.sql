-- App Store collection schedule policy.
-- Accuracy comes from layered collection, not daily full sweeps:
-- daily light patrol, weekly full coverage, and short-interval anomaly rechecks.

UPDATE collector_jobs
SET
  status = 'archived',
  last_error = COALESCE(last_error, 'Archived: App Store job has no app_store_id in job_config.'),
  updated_at = NOW()
WHERE job_config ->> 'collector_kind' = 'app_store'
  AND COALESCE(job_config ->> 'app_store_id', '') = ''
  AND status <> 'archived';

WITH app_store_jobs AS (
  SELECT DISTINCT ON (job.product_id)
    job.id,
    job.product_id,
    job.source_id,
    job.job_config,
    job.next_run_at
  FROM collector_jobs job
  JOIN products product ON product.id = job.product_id
  WHERE job.job_config ->> 'collector_kind' = 'app_store'
    AND COALESCE(job.job_config ->> 'app_store_id', '') <> ''
    AND job.status <> 'archived'
  ORDER BY job.product_id, job.priority DESC, job.created_at DESC
)
UPDATE collector_jobs job
SET
  schedule = 'daily_light',
  priority = GREATEST(job.priority, 90),
  job_config = job.job_config
    || jsonb_build_object(
      'schedule_strategy', 'daily_light',
      'country_codes', jsonb_build_array(
        'US', 'JP', 'GB', 'DE', 'FR', 'IN', 'TR', 'BR', 'CA', 'SG',
        'AU', 'KR', 'MX', 'ID', 'PH', 'TH', 'MY', 'VN', 'ZA', 'AE'
      ),
      'accuracy_policy', 'daily_core_regions'
    ),
  updated_at = NOW()
FROM app_store_jobs selected
WHERE job.id = selected.id;

WITH app_store_jobs AS (
  SELECT DISTINCT ON (job.product_id)
    job.product_id,
    job.source_id,
    job.job_config
  FROM collector_jobs job
  WHERE job.job_config ->> 'collector_kind' = 'app_store'
    AND COALESCE(job.job_config ->> 'app_store_id', '') <> ''
    AND job.status <> 'archived'
  ORDER BY job.product_id, job.priority DESC, job.created_at DESC
)
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
  source_id,
  product_id,
  'ai_pricing',
  'weekly_full',
  'active',
  NOW() + INTERVAL '3 days',
  0,
  0,
  NULL,
  job_config
    || jsonb_build_object(
      'schedule_strategy', 'weekly_full',
      'country_codes', jsonb_build_array('DEFAULT'),
      'accuracy_policy', 'weekly_common_regions'
    ),
  55,
  NOW(),
  NOW()
FROM app_store_jobs seed
WHERE NOT EXISTS (
  SELECT 1
  FROM collector_jobs existing
  WHERE existing.product_id = seed.product_id
    AND existing.job_config ->> 'collector_kind' = 'app_store'
    AND existing.schedule = 'weekly_full'
    AND existing.status <> 'archived'
);

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
  WITH anomaly_groups AS (
    SELECT
      evidence.product_id,
      ARRAY_AGG(DISTINCT evidence.country_code ORDER BY evidence.country_code)
        FILTER (WHERE evidence.country_code IS NOT NULL) AS anomaly_country_codes
    FROM price_observation_evidence_view evidence
    WHERE evidence.billing_platform = 'ios'::billing_platform
      AND evidence.status = 'pending'::observation_status
      AND evidence.observed_at >= NOW() - MAKE_INTERVAL(days => p_recent_days)
      AND (
        evidence.evidence_status = 'blocked_anomaly'
        OR evidence.published_comparison = 'conflicts_with_published_price'
        OR evidence.auto_review_reason_code IN (
          'app_store_price_changed',
          'app_store_global_price_outlier',
          'app_store_plan_order_conflict',
          'app_store_currency_mismatch',
          'app_store_local_dollar_parsed_as_usd'
        )
      )
    GROUP BY evidence.product_id
  ),
  capped_groups AS (
    SELECT
      product_id,
      anomaly_country_codes[1:LEAST(CARDINALITY(anomaly_country_codes), p_max_countries)] AS anomaly_country_codes
    FROM anomaly_groups
    WHERE CARDINALITY(anomaly_country_codes) > 0
  ),
  source_jobs AS (
    SELECT DISTINCT ON (job.product_id)
      job.product_id,
      job.source_id,
      job.job_config
    FROM collector_jobs job
    JOIN capped_groups groups ON groups.product_id = job.product_id
    WHERE job.job_config ->> 'collector_kind' = 'app_store'
      AND COALESCE(job.job_config ->> 'app_store_id', '') <> ''
      AND job.status <> 'archived'
    ORDER BY job.product_id, job.priority DESC, job.created_at DESC
  ),
  updated AS (
    UPDATE collector_jobs job
    SET
      status = 'active',
      next_run_at = NOW(),
      priority = 98,
      job_config = job.job_config
        || jsonb_build_object(
          'schedule_strategy', 'anomaly_watch',
          'country_codes', TO_JSONB(groups.anomaly_country_codes),
          'accuracy_policy', 'anomaly_recheck',
          'queued_reason', 'recent_price_evidence_anomaly',
          'queued_at', NOW()::TEXT
        ),
      updated_at = NOW()
    FROM capped_groups groups
    WHERE job.product_id = groups.product_id
      AND job.job_config ->> 'collector_kind' = 'app_store'
      AND job.schedule = 'anomaly_watch'
      AND job.status <> 'archived'
    RETURNING job.id, job.product_id, groups.anomaly_country_codes
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
          'queued_at', NOW()::TEXT
        ),
      98,
      NOW(),
      NOW()
    FROM capped_groups groups
    JOIN source_jobs ON source_jobs.product_id = groups.product_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM updated
      WHERE updated.product_id = groups.product_id
    )
    RETURNING id, product_id, (job_config -> 'country_codes') AS country_codes_json
  ),
  queued AS (
    SELECT id, product_id, anomaly_country_codes FROM updated
    UNION ALL
    SELECT
      inserted.id,
      inserted.product_id,
      ARRAY(
        SELECT jsonb_array_elements_text(inserted.country_codes_json)
      ) AS anomaly_country_codes
    FROM inserted
  )
  SELECT
    product.slug,
    queued.anomaly_country_codes,
    queued.id
  FROM queued
  JOIN products product ON product.id = queued.product_id
  ORDER BY product.slug;
END;
$$;
