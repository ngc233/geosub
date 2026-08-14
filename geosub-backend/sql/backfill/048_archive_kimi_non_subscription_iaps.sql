-- Keep Kimi gift/tip purchases as historical evidence, but remove them from
-- the published subscription catalog. The maintained collector specification
-- now accepts only Moderato, Allegretto, Allegro and Vivace.

BEGIN;

WITH non_subscription_plans AS (
  SELECT plan.id
  FROM plans AS plan
  JOIN products AS product ON product.id = plan.product_id
  WHERE product.slug = 'kimi'
    AND plan.slug IN (
      'send-a-flower',
      'give-some-snacks',
      'get-charged',
      'grab-a-coffee-with',
      'treat-to-a-meal',
      'land-on-the-moon-with'
    )
)
UPDATE price_observations AS observation
SET status = 'ignored',
    anomaly_flag = TRUE,
    anomaly_reason = CASE
      WHEN COALESCE(observation.anomaly_reason, '') LIKE '%kimi_non_subscription_iap%'
        THEN observation.anomaly_reason
      WHEN COALESCE(observation.anomaly_reason, '') = ''
        THEN 'kimi_non_subscription_iap'
      ELSE observation.anomaly_reason || '; kimi_non_subscription_iap'
    END,
    updated_at = NOW()
FROM non_subscription_plans
WHERE observation.plan_id = non_subscription_plans.id;

WITH non_subscription_plans AS (
  SELECT plan.id
  FROM plans AS plan
  JOIN products AS product ON product.id = plan.product_id
  WHERE product.slug = 'kimi'
    AND plan.slug IN (
      'send-a-flower',
      'give-some-snacks',
      'get-charged',
      'grab-a-coffee-with',
      'treat-to-a-meal',
      'land-on-the-moon-with'
    )
)
UPDATE region_prices AS price
SET status = 'archived',
    data_quality = 'stale',
    availability_note = 'Archived: App Store gift or tip purchase, not a recurring Kimi membership.',
    updated_at = NOW()
FROM non_subscription_plans
WHERE price.plan_id = non_subscription_plans.id;

UPDATE plans AS plan
SET status = 'archived',
    description = 'Archived App Store gift or tip purchase; not a recurring Kimi membership.',
    updated_at = NOW()
FROM products AS product
WHERE product.id = plan.product_id
  AND product.slug = 'kimi'
  AND plan.slug IN (
    'send-a-flower',
    'give-some-snacks',
    'get-charged',
    'grab-a-coffee-with',
    'treat-to-a-meal',
    'land-on-the-moon-with'
  );

COMMIT;
