-- Cleanup for App Store plan-matching artifacts discovered after adding
-- product-specific plan specs and longest-alias matching.

WITH manus AS (
  SELECT id
  FROM products
  WHERE slug = 'manus'
),
unused_wrong_plans AS (
  SELECT plan.id
  FROM plans plan
  JOIN manus ON manus.id = plan.product_id
  WHERE plan.slug IN ('chatgpt-go', 'chatgpt-pro-5x', 'chatgpt-pro-20x')
    AND NOT EXISTS (SELECT 1 FROM region_prices region_price WHERE region_price.plan_id = plan.id)
    AND NOT EXISTS (SELECT 1 FROM price_observations observation WHERE observation.plan_id = plan.id)
)
UPDATE plans plan
SET
  status = 'archived',
  updated_at = NOW()
FROM unused_wrong_plans wrong_plan
WHERE plan.id = wrong_plan.id;

WITH suspicious_grok_lite AS (
  SELECT region_price.id
  FROM region_prices region_price
  JOIN products product ON product.id = region_price.product_id
  JOIN plans plan ON plan.id = region_price.plan_id
  WHERE product.slug = 'grok'
    AND plan.slug = 'super-lite'
    AND region_price.billing_platform = 'ios'
    AND region_price.status = 'published'
    AND region_price.price_usd > 45
)
UPDATE region_prices region_price
SET
  status = 'review',
  data_quality = 'pending_review',
  source_summary = CONCAT_WS(
    ' ',
    NULLIF(region_price.source_summary, ''),
    'Hidden from public view because SuperGrok Lite was likely matched to an annual App Store price before longest-alias plan matching was added.'
  ),
  updated_at = NOW()
FROM suspicious_grok_lite suspicious
WHERE region_price.id = suspicious.id;

UPDATE price_observations observation
SET
  status = 'ignored',
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'ignored_at', NOW()::TEXT,
    'ignore_reason', 'Likely annual SuperGrok Lite App Store price selected before product-specific plan specs and longest-alias matching.',
    'auto_review_rule', 'app_store_plan_spec_repair',
    'auto_review_decision', 'ignored',
    'auto_review_reason_code', 'app_store_likely_annual_price'
  ),
  updated_at = NOW()
FROM products product
JOIN plans plan ON plan.product_id = product.id
WHERE observation.product_id = product.id
  AND observation.plan_id = plan.id
  AND product.slug = 'grok'
  AND plan.slug = 'super-lite'
  AND observation.billing_platform = 'ios'
  AND observation.status IN ('pending', 'approved')
  AND observation.converted_usd > 45;
