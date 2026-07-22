-- Track successful plan-level presence checks so expected regional plan
-- differences stop retrying after three confirmations and automatically
-- recover if a plan later appears.

CREATE TABLE IF NOT EXISTS app_store_plan_availability_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  billing_platform billing_platform NOT NULL DEFAULT 'ios',
  status TEXT NOT NULL CHECK (status IN (
    'available',
    'pending_absence',
    'confirmed_absent'
  )),
  consecutive_missing_count INTEGER NOT NULL DEFAULT 0 CHECK (
    consecutive_missing_count >= 0
  ),
  reason TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, country_id, billing_platform)
);

CREATE INDEX IF NOT EXISTS idx_app_store_plan_availability_product_status
  ON app_store_plan_availability_checks(product_id, status);

CREATE INDEX IF NOT EXISTS idx_app_store_plan_availability_checked_at
  ON app_store_plan_availability_checks(checked_at DESC);

DROP TRIGGER IF EXISTS trg_app_store_plan_availability_updated_at
  ON app_store_plan_availability_checks;
CREATE TRIGGER trg_app_store_plan_availability_updated_at
BEFORE UPDATE ON app_store_plan_availability_checks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION default_app_store_country_codes()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO',
    'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'CH', 'PL', 'TR',
    'JP', 'KR', 'TW', 'SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'IN', 'PK',
    'AU', 'NZ', 'AE', 'SA', 'IL', 'ZA', 'EG', 'NG', 'KE'
  ]::TEXT[];
$$;

CREATE UNIQUE INDEX IF NOT EXISTS collector_jobs_coverage_refresh_product_idx
  ON collector_jobs (product_id, schedule)
  WHERE schedule = 'coverage_refresh'
    AND status <> 'archived';

CREATE OR REPLACE FUNCTION queue_app_store_coverage_gap_rechecks(
  p_max_countries INTEGER DEFAULT 39,
  p_retry_cooldown_hours INTEGER DEFAULT 24,
  p_max_successful_rechecks INTEGER DEFAULT 3
)
RETURNS TABLE (
  product_slug TEXT,
  country_codes TEXT[],
  missing_pair_count INTEGER,
  retry_count INTEGER,
  successful_rechecks INTEGER,
  queued_job_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH target_countries AS (
    SELECT country.id, UPPER(country.code) AS code
    FROM countries country
    WHERE UPPER(country.code) = ANY(default_app_store_country_codes())
  ),
  active_plans AS (
    SELECT plan.id, plan.product_id
    FROM plans plan
    JOIN products product ON product.id = plan.product_id
    WHERE plan.status <> 'archived'
      AND product.status <> 'archived'
  ),
  published_pairs AS (
    SELECT DISTINCT price.plan_id, price.country_id
    FROM region_prices price
    WHERE price.status = 'published'
      AND price.billing_platform = 'ios'
      AND price.price_usd IS NOT NULL
  ),
  missing_pairs AS (
    SELECT
      plan.product_id,
      plan.id AS plan_id,
      country.id AS country_id,
      country.code AS country_code
    FROM active_plans plan
    CROSS JOIN target_countries country
    LEFT JOIN published_pairs price
      ON price.plan_id = plan.id
     AND price.country_id = country.id
    LEFT JOIN app_store_availability_checks availability
      ON availability.product_id = plan.product_id
     AND availability.country_id = country.id
     AND availability.billing_platform = 'ios'
    LEFT JOIN app_store_plan_availability_checks plan_availability
      ON plan_availability.plan_id = plan.id
     AND plan_availability.country_id = country.id
     AND plan_availability.billing_platform = 'ios'
    WHERE price.plan_id IS NULL
      AND COALESCE(availability.status, '') NOT IN (
        'not_available',
        'available_no_iap'
      )
      AND COALESCE(plan_availability.status, '') <> 'confirmed_absent'
  ),
  coverage_groups AS (
    SELECT
      missing.product_id,
      (
        ARRAY_AGG(DISTINCT missing.country_code ORDER BY missing.country_code)
      )[1:GREATEST(1, LEAST(p_max_countries, 39))] AS missing_country_codes,
      COUNT(*)::INTEGER AS missing_pairs,
      MD5(
        STRING_AGG(
          missing.plan_id::TEXT || ':' || missing.country_code,
          ','
          ORDER BY missing.plan_id::TEXT, missing.country_code
        )
      ) AS coverage_reference
    FROM missing_pairs missing
    GROUP BY missing.product_id
  ),
  source_jobs AS (
    SELECT DISTINCT ON (job.product_id)
      job.product_id,
      job.source_id,
      job.job_config
    FROM collector_jobs job
    JOIN coverage_groups groups ON groups.product_id = job.product_id
    WHERE job.job_config ->> 'collector_kind' = 'app_store'
      AND COALESCE(job.job_config ->> 'app_store_id', '') <> ''
      AND job.schedule <> 'coverage_refresh'
      AND job.status <> 'archived'
    ORDER BY job.product_id, job.priority DESC, job.created_at DESC
  ),
  updated AS (
    UPDATE collector_jobs job
    SET
      status = 'active',
      next_run_at = NOW(),
      priority = 97,
      last_error = NULL,
      job_config = job.job_config
        || jsonb_build_object(
          'schedule_strategy', 'coverage_refresh',
          'country_codes', TO_JSONB(groups.missing_country_codes),
          'accuracy_policy', 'plan_country_coverage',
          'queued_reason', 'missing_plan_country_prices',
          'queued_at', NOW()::TEXT,
          'coverage_reference', groups.coverage_reference,
          'coverage_missing_pair_count', groups.missing_pairs,
          'coverage_retry_count', CASE
            WHEN COALESCE(job.job_config ->> 'coverage_reference', '')
              = groups.coverage_reference
              THEN COALESCE((job.job_config ->> 'coverage_retry_count')::INTEGER, 0) + 1
            ELSE 1
          END,
          'coverage_success_count', CASE
            WHEN COALESCE(job.job_config ->> 'coverage_reference', '')
              = groups.coverage_reference
              THEN COALESCE((job.job_config ->> 'coverage_success_count')::INTEGER, 0)
            ELSE 0
          END
        ),
      updated_at = NOW()
    FROM coverage_groups groups
    WHERE job.product_id = groups.product_id
      AND job.schedule = 'coverage_refresh'
      AND job.status IN ('paused', 'failed')
      AND (
        COALESCE(job.job_config ->> 'coverage_reference', '')
          <> groups.coverage_reference
        OR (
          COALESCE((job.job_config ->> 'coverage_success_count')::INTEGER, 0)
            < GREATEST(1, p_max_successful_rechecks)
          AND job.updated_at <= NOW() - MAKE_INTERVAL(
            hours => GREATEST(1, p_retry_cooldown_hours)
          )
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
      'coverage_refresh',
      'active',
      NOW(),
      0,
      0,
      NULL,
      source_jobs.job_config
        || jsonb_build_object(
          'schedule_strategy', 'coverage_refresh',
          'country_codes', TO_JSONB(groups.missing_country_codes),
          'accuracy_policy', 'plan_country_coverage',
          'queued_reason', 'missing_plan_country_prices',
          'queued_at', NOW()::TEXT,
          'coverage_reference', groups.coverage_reference,
          'coverage_missing_pair_count', groups.missing_pairs,
          'coverage_retry_count', 1,
          'coverage_success_count', 0
        ),
      97,
      NOW(),
      NOW()
    FROM coverage_groups groups
    JOIN source_jobs ON source_jobs.product_id = groups.product_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM collector_jobs existing
      WHERE existing.product_id = groups.product_id
        AND existing.schedule = 'coverage_refresh'
        AND existing.status <> 'archived'
    )
    ON CONFLICT (product_id, schedule)
      WHERE schedule = 'coverage_refresh' AND status <> 'archived'
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
    COALESCE(
      (queued.job_config ->> 'coverage_missing_pair_count')::INTEGER,
      0
    ),
    COALESCE((queued.job_config ->> 'coverage_retry_count')::INTEGER, 1),
    COALESCE((queued.job_config ->> 'coverage_success_count')::INTEGER, 0),
    queued.id
  FROM queued
  JOIN products product ON product.id = queued.product_id
  ORDER BY product.slug;
END;
$$;

SELECT *
FROM queue_app_store_coverage_gap_rechecks(39, 24, 3);
