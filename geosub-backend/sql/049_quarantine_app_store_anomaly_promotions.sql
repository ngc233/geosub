-- Generic repair for App Store prices that were published from anomalous
-- observations before the hard-anomaly auto-review guard was tightened.
--
-- If a recent clean observation exists, repair the published price from it.
-- If not, move the published price back to review so the public site does not
-- display a suspicious value.

WITH affected_region_prices AS (
  SELECT DISTINCT
    region_price.id,
    region_price.product_id,
    region_price.plan_id,
    region_price.country_id,
    region_price.billing_platform,
    region_price.price_type,
    region_price.us_base_price
  FROM region_prices region_price
  JOIN price_observations observation
    ON (
      observation.raw_payload ->> 'promoted_region_price_id' = region_price.id::text
      OR (
        observation.product_id = region_price.product_id
        AND observation.plan_id = region_price.plan_id
        AND observation.country_id = region_price.country_id
        AND observation.billing_platform = region_price.billing_platform
        AND observation.price_type = region_price.price_type
        AND observation.currency IS NOT DISTINCT FROM region_price.currency
        AND observation.raw_price IS NOT DISTINCT FROM region_price.local_price
        AND observation.converted_usd IS NOT NULL
        AND ABS(observation.converted_usd - region_price.price_usd) <= GREATEST(0.01, region_price.price_usd * 0.02)
      )
    )
  WHERE region_price.status = 'published'
    AND region_price.billing_platform = 'ios'
    AND COALESCE(observation.anomaly_flag, FALSE) = TRUE
),
clean_replacements AS (
  SELECT
    affected.id AS region_price_id,
    clean.id AS observation_id,
    clean.source_id,
    clean.raw_price,
    clean.currency,
    clean.converted_usd,
    clean.confidence_score,
    clean.observed_at
  FROM affected_region_prices affected
  JOIN LATERAL (
    SELECT observation.*
    FROM price_observations observation
    WHERE observation.product_id = affected.product_id
      AND observation.plan_id = affected.plan_id
      AND observation.country_id = affected.country_id
      AND observation.billing_platform = affected.billing_platform
      AND observation.price_type = affected.price_type
      AND observation.raw_price IS NOT NULL
      AND observation.currency IS NOT NULL
      AND observation.converted_usd IS NOT NULL
      AND observation.converted_usd >= 1
      AND COALESCE(observation.anomaly_flag, FALSE) = FALSE
      AND observation.observed_at >= NOW() - INTERVAL '30 days'
    ORDER BY observation.observed_at DESC, observation.created_at DESC
    LIMIT 1
  ) clean ON TRUE
)
UPDATE region_prices region_price
SET
  local_price = clean.raw_price,
  currency = clean.currency,
  price_usd = clean.converted_usd,
  diff_vs_us_percent = CASE
    WHEN region_price.us_base_price IS NULL OR region_price.us_base_price = 0 THEN NULL
    ELSE ROUND(((clean.converted_usd - region_price.us_base_price) / region_price.us_base_price) * 100, 2)
  END,
  primary_source_id = clean.source_id,
  confidence_score = clean.confidence_score,
  data_quality = 'verified',
  status = 'published',
  last_checked_at = clean.observed_at,
  updated_at = NOW()
FROM clean_replacements clean
WHERE region_price.id = clean.region_price_id;

WITH affected_region_prices AS (
  SELECT DISTINCT
    region_price.id,
    region_price.product_id,
    region_price.plan_id,
    region_price.country_id,
    region_price.billing_platform,
    region_price.price_type
  FROM region_prices region_price
  JOIN price_observations observation
    ON (
      observation.raw_payload ->> 'promoted_region_price_id' = region_price.id::text
      OR (
        observation.product_id = region_price.product_id
        AND observation.plan_id = region_price.plan_id
        AND observation.country_id = region_price.country_id
        AND observation.billing_platform = region_price.billing_platform
        AND observation.price_type = region_price.price_type
        AND observation.currency IS NOT DISTINCT FROM region_price.currency
        AND observation.raw_price IS NOT DISTINCT FROM region_price.local_price
        AND observation.converted_usd IS NOT NULL
        AND ABS(observation.converted_usd - region_price.price_usd) <= GREATEST(0.01, region_price.price_usd * 0.02)
      )
    )
  WHERE region_price.status = 'published'
    AND region_price.billing_platform = 'ios'
    AND COALESCE(observation.anomaly_flag, FALSE) = TRUE
),
clean_replacements AS (
  SELECT DISTINCT affected.id AS region_price_id
  FROM affected_region_prices affected
  JOIN price_observations clean
    ON clean.product_id = affected.product_id
   AND clean.plan_id = affected.plan_id
   AND clean.country_id = affected.country_id
   AND clean.billing_platform = affected.billing_platform
   AND clean.price_type = affected.price_type
  WHERE clean.raw_price IS NOT NULL
    AND clean.currency IS NOT NULL
    AND clean.converted_usd IS NOT NULL
    AND clean.converted_usd >= 1
    AND COALESCE(clean.anomaly_flag, FALSE) = FALSE
    AND clean.observed_at >= NOW() - INTERVAL '30 days'
)
UPDATE region_prices region_price
SET
  status = 'review',
  data_quality = 'pending_review',
  source_summary = CONCAT_WS(
    ' ',
    NULLIF(region_price.source_summary, ''),
    'Hidden from public view because the promoted App Store observation was anomalous and no recent clean replacement exists.'
  ),
  updated_at = NOW()
FROM affected_region_prices affected
LEFT JOIN clean_replacements clean
  ON clean.region_price_id = affected.id
WHERE region_price.id = affected.id
  AND clean.region_price_id IS NULL;

UPDATE price_observations observation
SET
  status = 'ignored',
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'ignored_at', NOW()::TEXT,
    'ignore_reason', 'Hard anomaly: observation is not eligible for publication.',
    'auto_review_rule', 'app_store_hard_anomaly_guard',
    'auto_review_decision', 'ignored',
    'auto_review_reason_code', 'app_store_observation_anomaly'
  ),
  updated_at = NOW()
WHERE observation.billing_platform = 'ios'
  AND COALESCE(observation.anomaly_flag, FALSE) = TRUE
  AND observation.status IN ('pending', 'approved');
