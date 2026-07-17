-- Published App Store prices have a finite freshness window. Queue a focused
-- product/country refresh first, then hide only prices that still cannot be
-- confirmed after three successful refresh rounds.

CREATE INDEX IF NOT EXISTS idx_region_prices_published_ios_last_checked
  ON region_prices (product_id, last_checked_at)
  WHERE status = 'published'
    AND billing_platform = 'ios'
    AND price_usd IS NOT NULL;

CREATE OR REPLACE FUNCTION queue_stale_app_store_price_rechecks(
  p_stale_days INTEGER DEFAULT 14,
  p_max_countries INTEGER DEFAULT 20,
  p_retry_cooldown_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  product_slug TEXT,
  country_codes TEXT[],
  retry_count INTEGER,
  queued_job_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stale_groups AS (
    SELECT
      price.product_id,
      (
        ARRAY_AGG(DISTINCT UPPER(country.code) ORDER BY UPPER(country.code))
      )[1:GREATEST(1, p_max_countries)] AS stale_country_codes,
      EXTRACT(
        EPOCH FROM MIN(COALESCE(price.last_checked_at, price.created_at))
      )::BIGINT AS stale_reference_epoch
    FROM region_prices price
    JOIN countries country ON country.id = price.country_id
    WHERE price.status = 'published'
      AND price.billing_platform = 'ios'
      AND price.price_usd IS NOT NULL
      AND (
        price.last_checked_at IS NULL
        OR price.last_checked_at < NOW() - MAKE_INTERVAL(days => GREATEST(1, p_stale_days))
      )
    GROUP BY price.product_id
  ),
  source_jobs AS (
    SELECT DISTINCT ON (job.product_id)
      job.product_id,
      job.source_id,
      job.job_config
    FROM collector_jobs job
    JOIN stale_groups groups ON groups.product_id = job.product_id
    WHERE job.job_config ->> 'collector_kind' = 'app_store'
      AND COALESCE(job.job_config ->> 'app_store_id', '') <> ''
      AND job.schedule <> 'stale_refresh'
      AND job.status <> 'archived'
    ORDER BY job.product_id, job.priority DESC, job.created_at DESC
  ),
  updated AS (
    UPDATE collector_jobs job
    SET
      status = 'active',
      next_run_at = NOW(),
      priority = 99,
      job_config = job.job_config
        || jsonb_build_object(
          'schedule_strategy', 'stale_refresh',
          'country_codes', TO_JSONB(groups.stale_country_codes),
          'accuracy_policy', 'published_price_freshness',
          'queued_reason', 'stale_published_prices',
          'queued_at', NOW()::TEXT,
          'stale_days', GREATEST(1, p_stale_days),
          'stale_reference_epoch', groups.stale_reference_epoch,
          'stale_retry_count', CASE
            WHEN COALESCE((job.job_config ->> 'stale_reference_epoch')::BIGINT, -1)
              = groups.stale_reference_epoch
              THEN COALESCE((job.job_config ->> 'stale_retry_count')::INTEGER, 0) + 1
            ELSE 1
          END,
          'stale_success_count', CASE
            WHEN COALESCE((job.job_config ->> 'stale_reference_epoch')::BIGINT, -1)
              = groups.stale_reference_epoch
              THEN COALESCE((job.job_config ->> 'stale_success_count')::INTEGER, 0)
            ELSE 0
          END
        ),
      updated_at = NOW()
    FROM stale_groups groups
    WHERE job.product_id = groups.product_id
      AND job.schedule = 'stale_refresh'
      AND job.status IN ('paused', 'failed')
      AND (
        COALESCE((job.job_config ->> 'stale_reference_epoch')::BIGINT, -1)
          <> groups.stale_reference_epoch
        OR job.updated_at <= NOW() - MAKE_INTERVAL(hours => GREATEST(1, p_retry_cooldown_hours))
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
      'stale_refresh',
      'active',
      NOW(),
      0,
      0,
      NULL,
      source_jobs.job_config
        || jsonb_build_object(
          'schedule_strategy', 'stale_refresh',
          'country_codes', TO_JSONB(groups.stale_country_codes),
          'accuracy_policy', 'published_price_freshness',
          'queued_reason', 'stale_published_prices',
          'queued_at', NOW()::TEXT,
          'stale_days', GREATEST(1, p_stale_days),
          'stale_reference_epoch', groups.stale_reference_epoch,
          'stale_retry_count', 1,
          'stale_success_count', 0
        ),
      99,
      NOW(),
      NOW()
    FROM stale_groups groups
    JOIN source_jobs ON source_jobs.product_id = groups.product_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM collector_jobs existing
      WHERE existing.product_id = groups.product_id
        AND existing.schedule = 'stale_refresh'
        AND existing.status <> 'archived'
    )
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
    COALESCE((queued.job_config ->> 'stale_retry_count')::INTEGER, 1),
    queued.id
  FROM queued
  JOIN products product ON product.id = queued.product_id
  ORDER BY product.slug;
END;
$$;

CREATE OR REPLACE FUNCTION quarantine_unconfirmed_stale_app_store_prices(
  p_stale_days INTEGER DEFAULT 14,
  p_min_successful_rechecks INTEGER DEFAULT 3
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_quarantined INTEGER := 0;
BEGIN
  WITH latest_stale_jobs AS (
    SELECT DISTINCT ON (job.product_id)
      job.product_id,
      ARRAY(
        SELECT UPPER(jsonb_array_elements_text(job.job_config -> 'country_codes'))
      ) AS country_codes,
      COALESCE((job.job_config ->> 'stale_success_count')::INTEGER, 0) AS successful_rechecks
    FROM collector_jobs job
    WHERE job.schedule = 'stale_refresh'
      AND job.status <> 'archived'
    ORDER BY job.product_id, job.updated_at DESC
  ),
  candidates AS (
    SELECT
      price.id,
      CASE
        WHEN availability.status = 'not_available'
          THEN 'The App Store reports that this product is no longer available in the region.'
        WHEN availability.status = 'available_no_iap'
          THEN 'The App Store reports that the product no longer exposes subscription items in the region.'
        ELSE FORMAT(
          'The published price remained unconfirmed after %s successful focused App Store refresh rounds.',
          stale_job.successful_rechecks
        )
      END AS quarantine_reason
    FROM region_prices price
    JOIN latest_stale_jobs stale_job ON stale_job.product_id = price.product_id
    JOIN countries country ON country.id = price.country_id
    LEFT JOIN app_store_availability_checks availability
      ON availability.product_id = price.product_id
     AND availability.country_id = price.country_id
     AND availability.billing_platform = price.billing_platform
    WHERE price.status = 'published'
      AND price.billing_platform = 'ios'
      AND price.price_usd IS NOT NULL
      AND UPPER(country.code) = ANY(stale_job.country_codes)
      AND (
        price.last_checked_at IS NULL
        OR price.last_checked_at < NOW() - MAKE_INTERVAL(days => GREATEST(1, p_stale_days))
      )
      AND (
        (
          availability.status IN ('not_available', 'available_no_iap')
          AND availability.checked_at > COALESCE(price.last_checked_at, price.created_at)
        )
        OR stale_job.successful_rechecks >= GREATEST(1, p_min_successful_rechecks)
      )
  )
  UPDATE region_prices price
  SET
    status = 'review',
    data_quality = 'pending_review',
    availability_note = CONCAT_WS(
      ' ',
      NULLIF(price.availability_note, ''),
      'Automatically hidden pending a fresh App Store confirmation.'
    ),
    source_summary = CONCAT_WS(
      ' ',
      NULLIF(price.source_summary, ''),
      candidates.quarantine_reason
    ),
    updated_at = NOW()
  FROM candidates
  WHERE price.id = candidates.id;

  GET DIAGNOSTICS v_quarantined = ROW_COUNT;
  RETURN v_quarantined;
END;
$$;

SELECT *
FROM queue_stale_app_store_price_rechecks(14, 20, 24);
