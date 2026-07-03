-- Gemini Advanced was the old Google One AI Premium naming.
-- Current App Store data is organized as Google AI Plus / Pro / Ultra, so keep
-- the historical web rows but attach them to Google AI Pro.

WITH gemini_product AS (
  SELECT id
  FROM products
  WHERE slug = 'gemini'
  LIMIT 1
),
plan_ids AS (
  SELECT
    product.id AS product_id,
    advanced.id AS advanced_plan_id,
    pro.id AS pro_plan_id
  FROM gemini_product product
  JOIN plans advanced ON advanced.product_id = product.id AND advanced.slug = 'advanced'
  JOIN plans pro ON pro.product_id = product.id AND pro.slug = 'pro'
),
moved_region_prices AS (
  UPDATE region_prices price
  SET
    plan_id = plan_ids.pro_plan_id,
    source_summary = CASE
      WHEN price.source_summary IS NULL OR price.source_summary = ''
        THEN 'Merged from legacy Gemini Advanced web source.'
      ELSE price.source_summary || ' Merged from legacy Gemini Advanced web source.'
    END,
    updated_at = NOW()
  FROM plan_ids
  WHERE price.plan_id = plan_ids.advanced_plan_id
    AND NOT EXISTS (
      SELECT 1
      FROM region_prices existing
      WHERE existing.plan_id = plan_ids.pro_plan_id
        AND existing.country_id = price.country_id
        AND existing.billing_platform = price.billing_platform
        AND existing.price_type = price.price_type
    )
  RETURNING price.id
),
moved_observations AS (
  UPDATE price_observations observation
  SET
    plan_id = plan_ids.pro_plan_id,
    raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb)
      || jsonb_build_object('legacy_plan_slug', 'advanced', 'normalized_plan_slug', 'pro'),
    updated_at = NOW()
  FROM plan_ids
  WHERE observation.plan_id = plan_ids.advanced_plan_id
  RETURNING observation.id
)
UPDATE plans plan
SET
  status = 'archived',
  description = COALESCE(plan.description, '') || ' Archived: merged into Google AI Pro.',
  updated_at = NOW()
FROM plan_ids
WHERE plan.id = plan_ids.advanced_plan_id;
