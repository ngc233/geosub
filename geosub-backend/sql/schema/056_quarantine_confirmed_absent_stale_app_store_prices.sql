-- Let plan-level App Store absence evidence quarantine an already-stale
-- published price without waiting for the product-level stale retry budget.

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
          AND availability.checked_at > COALESCE(price.last_checked_at, price.created_at)
          THEN 'The App Store reports that this product is no longer available in the region.'
        WHEN availability.status = 'available_no_iap'
          AND availability.checked_at > COALESCE(price.last_checked_at, price.created_at)
          THEN 'The App Store reports that the product no longer exposes subscription items in the region.'
        WHEN plan_availability.status = 'confirmed_absent'
          AND plan_availability.checked_at > COALESCE(price.last_checked_at, price.created_at)
          THEN 'The App Store confirmed that this plan is no longer offered in the region.'
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
    LEFT JOIN app_store_plan_availability_checks plan_availability
      ON plan_availability.product_id = price.product_id
     AND plan_availability.plan_id = price.plan_id
     AND plan_availability.country_id = price.country_id
     AND plan_availability.billing_platform = price.billing_platform
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
        OR (
          plan_availability.status = 'confirmed_absent'
          AND plan_availability.checked_at > COALESCE(price.last_checked_at, price.created_at)
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
