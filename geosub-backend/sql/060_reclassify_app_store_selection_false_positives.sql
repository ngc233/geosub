-- Reclassify pending App Store observations that were blocked by collector
-- rules superseded by the tolerance and tier-selection policy in v2.

WITH manus_reclassified AS (
  UPDATE price_observations observation
  SET
    anomaly_flag = FALSE,
    anomaly_reason = NULL,
    raw_payload = ((observation.raw_payload - 'anomaly_reason') - 'review_note') ||
      jsonb_build_object(
        'rule_reclassification',
        jsonb_build_object(
          'rule', 'app_store_lowest_expected_tier_v2',
          'reclassified_at', NOW()
        )
      ),
    updated_at = NOW()
  FROM products product, plans plan
  WHERE observation.product_id = product.id
    AND observation.plan_id = plan.id
    AND product.slug = 'manus'
    AND plan.slug = 'pro'
    AND observation.billing_platform = 'ios'::billing_platform
    AND observation.status = 'pending'::observation_status
    AND observation.anomaly_flag = TRUE
    AND observation.anomaly_reason = 'Multiple App Store prices matched this plan without a clear consensus. This may indicate monthly/yearly or tier parsing ambiguity.'
    AND COALESCE(NULLIF(observation.raw_payload #>> '{raw_snapshot,priceSelection,expectedFitPenalty}', '')::numeric, 1) = 0
  RETURNING observation.id
)
UPDATE price_observations observation
SET
  anomaly_flag = FALSE,
  anomaly_reason = NULL,
  raw_payload = ((observation.raw_payload - 'anomaly_reason') - 'review_note') ||
    jsonb_build_object(
      'rule_reclassification',
      jsonb_build_object(
        'rule', 'app_store_expected_range_tolerance_v2',
        'reclassified_at', NOW()
      )
    ),
  updated_at = NOW()
FROM products product, plans plan
WHERE observation.product_id = product.id
  AND observation.plan_id = plan.id
  AND product.slug = 'netflix'
  AND plan.slug IN ('basic', 'standard')
  AND observation.billing_platform = 'ios'::billing_platform
  AND observation.status = 'pending'::observation_status
  AND observation.anomaly_flag = TRUE
  AND observation.anomaly_reason = format(
    'Converted App Store price is above the expected range for %s. This may indicate a currency, billing-cycle, or decimal parsing error.',
    plan.slug
  )
  AND observation.converted_usd <= CASE plan.slug
    WHEN 'basic' THEN 18.0 * 1.03
    WHEN 'standard' THEN 28.0 * 1.03
  END;
