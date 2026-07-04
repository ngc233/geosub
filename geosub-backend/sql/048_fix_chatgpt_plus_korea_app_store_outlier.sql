-- Repair ChatGPT Plus South Korea after the collector selected an anomalous
-- duplicate App Store IAP price (KRW 99,000) as the monthly Plus price.
-- The latest clean App Store samples before the bad selection were KRW 29,000.

WITH target AS (
  SELECT
    product.id AS product_id,
    plan.id AS plan_id,
    country.id AS country_id
  FROM products product
  JOIN plans plan ON plan.product_id = product.id
  JOIN countries country ON country.code = 'KR'
  WHERE product.slug = 'chatgpt'
    AND plan.slug = 'plus'
  LIMIT 1
),
clean_observation AS (
  SELECT observation.*
  FROM price_observations observation
  JOIN target
    ON target.product_id = observation.product_id
   AND target.plan_id = observation.plan_id
   AND target.country_id = observation.country_id
  WHERE observation.billing_platform = 'ios'
    AND observation.currency = 'KRW'
    AND observation.raw_price = 29000
    AND COALESCE(observation.anomaly_flag, FALSE) = FALSE
    AND observation.converted_usd BETWEEN 8 AND 40
  ORDER BY observation.observed_at DESC, observation.created_at DESC
  LIMIT 1
)
UPDATE region_prices region_price
SET
  local_price = clean_observation.raw_price,
  currency = clean_observation.currency,
  price_usd = clean_observation.converted_usd,
  diff_vs_us_percent = CASE
    WHEN region_price.us_base_price IS NULL OR region_price.us_base_price = 0 THEN NULL
    ELSE ROUND(((clean_observation.converted_usd - region_price.us_base_price) / region_price.us_base_price) * 100, 2)
  END,
  primary_source_id = clean_observation.source_id,
  confidence_score = clean_observation.confidence_score,
  data_quality = 'verified',
  status = 'published',
  last_checked_at = clean_observation.observed_at,
  updated_at = NOW()
FROM target, clean_observation
WHERE region_price.product_id = target.product_id
  AND region_price.plan_id = target.plan_id
  AND region_price.country_id = target.country_id
  AND region_price.billing_platform = 'ios';

WITH target AS (
  SELECT
    product.id AS product_id,
    plan.id AS plan_id,
    country.id AS country_id
  FROM products product
  JOIN plans plan ON plan.product_id = product.id
  JOIN countries country ON country.code = 'KR'
  WHERE product.slug = 'chatgpt'
    AND plan.slug = 'plus'
  LIMIT 1
)
UPDATE price_observations observation
SET
  status = 'ignored',
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'ignored_at', NOW()::TEXT,
    'ignore_reason', 'Hard anomaly: duplicate App Store Plus price selected as monthly price.',
    'auto_review_rule', 'app_store_hard_anomaly_guard',
    'auto_review_decision', 'ignored',
    'auto_review_reason_code', 'app_store_observation_anomaly'
  ),
  updated_at = NOW()
FROM target
WHERE observation.product_id = target.product_id
  AND observation.plan_id = target.plan_id
  AND observation.country_id = target.country_id
  AND observation.billing_platform = 'ios'
  AND observation.currency = 'KRW'
  AND observation.raw_price = 99000
  AND COALESCE(observation.anomaly_flag, FALSE) = TRUE;
