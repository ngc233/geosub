-- Relax Claude Max App Store anomaly guard for international price tiers.
-- Some storefronts legitimately sit above the US monthly price because of
-- Apple tiering, tax treatment, and currency rounding. Keep the lower-price
-- guard intact, but clear the old too-narrow upper-range flags.

UPDATE price_observations observation
SET
  anomaly_flag = FALSE,
  anomaly_reason = NULL,
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb)
    - 'review_note'
    - 'auto_review_reason'
    - 'auto_review_reason_code'
    - 'auto_review_decision',
  updated_at = NOW()
FROM products product
JOIN plans plan ON plan.product_id = product.id
WHERE observation.product_id = product.id
  AND observation.plan_id = plan.id
  AND observation.status = 'pending'::observation_status
  AND observation.billing_platform = 'ios'::billing_platform
  AND product.slug = 'claude'
  AND (
    (
      plan.slug = 'max-5x'
      AND observation.converted_usd BETWEEN 40 AND 190
      AND observation.anomaly_reason ILIKE 'Converted App Store price is above the expected range for max-5x%'
    )
    OR (
      plan.slug = 'max-20x'
      AND observation.converted_usd BETWEEN 80 AND 380
      AND observation.anomaly_reason ILIKE 'Converted App Store price is above the expected range for max-20x%'
    )
  );
