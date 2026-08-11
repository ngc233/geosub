-- GeoSub backfill migration. Split from sql/043_app_store_collection_schedule_policy.sql; see migration-layout.json.

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
