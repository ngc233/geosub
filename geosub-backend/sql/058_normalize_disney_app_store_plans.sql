-- Disney+ App Store pages expose localized names, annual duplicates and legacy
-- one-time purchases. Keep the public comparison on three canonical monthly
-- tiers and retain rejected records only as audit history.

WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
),
canonical_plans(slug, name, sort_order) AS (
  VALUES
    ('standard-with-ads', 'Disney+ Standard with Ads', 10),
    ('standard', 'Disney+ Standard', 20),
    ('premium', 'Disney+ Premium', 30)
)
INSERT INTO plans (product_id, slug, name, billing_cycle, status, sort_order)
SELECT disney.id, canonical.slug, canonical.name, 'monthly', 'published', canonical.sort_order
FROM disney
CROSS JOIN canonical_plans canonical
ON CONFLICT (product_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  billing_cycle = EXCLUDED.billing_cycle,
  status = 'published',
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Reattach rows only when the selected App Store item proves the canonical
-- tier. Exact price/currency matching keeps this independent from translated
-- source plan names.
WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
),
targets AS (
  SELECT plan.slug, plan.id
  FROM plans plan
  JOIN disney ON disney.id = plan.product_id
  WHERE plan.slug IN ('standard-with-ads', 'standard', 'premium')
),
classified AS (
  SELECT
    price.id AS region_price_id,
    price.plan_id AS source_plan_id,
    CASE
      WHEN (
        COALESCE(selected.item_name, '') ~* '(with ads|mit werbung|avec pub|con pubblic|con anuncios|basic.*month|monthly basic|広告|광고)'
        AND NOT (COALESCE(selected.item_name, '') ~* '(us|u[.]s[.])[[:space:]-]*only' AND country.code <> 'US')
      ) THEN (SELECT id FROM targets WHERE slug = 'standard-with-ads')
      WHEN (
        COALESCE(selected.item_name, '') ~* '(standard|est.ndar|padr.o|スタンダード|스탠다드|標準|标准)'
        AND COALESCE(selected.item_name, '') !~* '(with ads|mit werbung|avec pub|con pubblic|con anuncios|広告|광고)'
      ) THEN (SELECT id FROM targets WHERE slug = 'standard')
      WHEN COALESCE(selected.item_name, '') ~* '(premium|pr.mium|プレミアム|프리미엄|高級|高级)'
        THEN (SELECT id FROM targets WHERE slug = 'premium')
      ELSE NULL
    END AS target_plan_id
  FROM region_prices price
  JOIN disney ON disney.id = price.product_id
  JOIN countries country ON country.id = price.country_id
  LEFT JOIN LATERAL (
    SELECT observation.raw_payload ->> 'item_name' AS item_name
    FROM price_observations observation
    WHERE observation.product_id = price.product_id
      AND observation.plan_id = price.plan_id
      AND observation.country_id = price.country_id
      AND observation.currency IS NOT DISTINCT FROM price.currency
      AND observation.raw_price IS NOT DISTINCT FROM price.local_price
    ORDER BY observation.observed_at DESC, observation.created_at DESC
    LIMIT 1
  ) selected ON TRUE
)
UPDATE region_prices price
SET
  plan_id = classified.target_plan_id,
  source_summary = CONCAT_WS(
    ' ',
    NULLIF(price.source_summary, ''),
    'Normalized to a canonical Disney+ monthly tier from the selected App Store item.'
  ),
  updated_at = NOW()
FROM classified
WHERE price.id = classified.region_price_id
  AND classified.target_plan_id IS NOT NULL
  AND classified.target_plan_id <> classified.source_plan_id
  AND NOT EXISTS (
    SELECT 1
    FROM region_prices existing
    WHERE existing.plan_id = classified.target_plan_id
      AND existing.country_id = price.country_id
      AND existing.billing_platform = price.billing_platform
      AND existing.price_type = price.price_type
      AND existing.id <> price.id
  );

-- If a canonical destination already has a row, quarantine the duplicate
-- instead of overwriting a newer reviewed value.
WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
),
targets AS (
  SELECT plan.slug, plan.id
  FROM plans plan
  JOIN disney ON disney.id = plan.product_id
  WHERE plan.slug IN ('standard-with-ads', 'standard', 'premium')
),
classified AS (
  SELECT
    price.id AS region_price_id,
    price.plan_id AS source_plan_id,
    CASE
      WHEN (
        COALESCE(selected.item_name, '') ~* '(with ads|mit werbung|avec pub|con pubblic|con anuncios|basic.*month|monthly basic|広告|광고)'
        AND NOT (COALESCE(selected.item_name, '') ~* '(us|u[.]s[.])[[:space:]-]*only' AND country.code <> 'US')
      ) THEN (SELECT id FROM targets WHERE slug = 'standard-with-ads')
      WHEN (
        COALESCE(selected.item_name, '') ~* '(standard|est.ndar|padr.o|スタンダード|스탠다드|標準|标准)'
        AND COALESCE(selected.item_name, '') !~* '(with ads|mit werbung|avec pub|con pubblic|con anuncios|広告|광고)'
      ) THEN (SELECT id FROM targets WHERE slug = 'standard')
      WHEN COALESCE(selected.item_name, '') ~* '(premium|pr.mium|プレミアム|프리미엄|高級|高级)'
        THEN (SELECT id FROM targets WHERE slug = 'premium')
      ELSE NULL
    END AS target_plan_id
  FROM region_prices price
  JOIN disney ON disney.id = price.product_id
  JOIN countries country ON country.id = price.country_id
  LEFT JOIN LATERAL (
    SELECT observation.raw_payload ->> 'item_name' AS item_name
    FROM price_observations observation
    WHERE observation.product_id = price.product_id
      AND observation.plan_id = price.plan_id
      AND observation.country_id = price.country_id
      AND observation.currency IS NOT DISTINCT FROM price.currency
      AND observation.raw_price IS NOT DISTINCT FROM price.local_price
    ORDER BY observation.observed_at DESC, observation.created_at DESC
    LIMIT 1
  ) selected ON TRUE
)
UPDATE region_prices price
SET
  status = 'review',
  data_quality = 'pending_review',
  source_summary = CONCAT_WS(
    ' ',
    NULLIF(price.source_summary, ''),
    'Quarantined as a duplicate during Disney+ plan normalization.'
  ),
  updated_at = NOW()
FROM classified
WHERE price.id = classified.region_price_id
  AND classified.target_plan_id IS NOT NULL
  AND classified.target_plan_id <> classified.source_plan_id
  AND EXISTS (
    SELECT 1
    FROM region_prices existing
    WHERE existing.plan_id = classified.target_plan_id
      AND existing.country_id = price.country_id
      AND existing.billing_platform = price.billing_platform
      AND existing.price_type = price.price_type
      AND existing.id <> price.id
  );

-- Preserve valid observations under their canonical plan so subsequent
-- stability review can reuse the existing evidence.
WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
),
targets AS (
  SELECT plan.slug, plan.id
  FROM plans plan
  JOIN disney ON disney.id = plan.product_id
  WHERE plan.slug IN ('standard-with-ads', 'standard', 'premium')
),
classified AS (
  SELECT
    observation.id AS observation_id,
    CASE
      WHEN (
        COALESCE(observation.raw_payload ->> 'item_name', '') ~* '(with ads|mit werbung|avec pub|con pubblic|con anuncios|basic.*month|monthly basic|広告|광고)'
        AND NOT (
          COALESCE(observation.raw_payload ->> 'item_name', '') ~* '(us|u[.]s[.])[[:space:]-]*only'
          AND country.code <> 'US'
        )
      ) THEN (SELECT id FROM targets WHERE slug = 'standard-with-ads')
      WHEN (
        COALESCE(observation.raw_payload ->> 'item_name', '') ~* '(standard|est.ndar|padr.o|スタンダード|스탠다드|標準|标准)'
        AND COALESCE(observation.raw_payload ->> 'item_name', '') !~* '(with ads|mit werbung|avec pub|con pubblic|con anuncios|広告|광고)'
      ) THEN (SELECT id FROM targets WHERE slug = 'standard')
      WHEN COALESCE(observation.raw_payload ->> 'item_name', '') ~* '(premium|pr.mium|プレミアム|프리미엄|高級|高级)'
        THEN (SELECT id FROM targets WHERE slug = 'premium')
      ELSE NULL
    END AS target_plan_id
  FROM price_observations observation
  JOIN disney ON disney.id = observation.product_id
  LEFT JOIN countries country ON country.id = observation.country_id
)
UPDATE price_observations observation
SET
  plan_id = classified.target_plan_id,
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'normalized_product_plan', 'disney_monthly_v1',
    'normalized_at', NOW()::TEXT
  ),
  updated_at = NOW()
FROM classified
WHERE observation.id = classified.observation_id
  AND classified.target_plan_id IS NOT NULL;

-- Explicit annual, one-time and non-US US-only rows are never monthly price
-- evidence even if they came from the official App Store listing.
WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
),
excluded_observations AS (
  SELECT observation.id
  FROM price_observations observation
  JOIN disney ON disney.id = observation.product_id
  LEFT JOIN countries country ON country.id = observation.country_id
  WHERE observation.status IN ('pending', 'approved')
    AND (
      COALESCE(observation.raw_payload ->> 'item_name', '') ~* '(premier access|annual|yearly|jaarabonnement|年額|年度|年费|年費|연간)'
      OR (
        COALESCE(observation.raw_payload ->> 'item_name', '') ~* '(us|u[.]s[.])[[:space:]-]*only'
        AND country.code <> 'US'
      )
    )
)
UPDATE price_observations observation
SET
  status = 'ignored',
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'ignored_at', NOW()::TEXT,
    'ignore_reason', 'Excluded from the monthly Disney+ comparison: annual, one-time or region-restricted App Store item.',
    'auto_review_rule', 'disney_monthly_plan_normalization',
    'auto_review_decision', 'ignored',
    'auto_review_reason_code', 'app_store_non_monthly_or_region_restricted_item'
  ),
  updated_at = NOW()
FROM excluded_observations excluded
WHERE observation.id = excluded.id;

-- Hide every fallback-generated plan after valid evidence has been moved.
WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
),
legacy_plans AS (
  SELECT plan.id
  FROM plans plan
  JOIN disney ON disney.id = plan.product_id
  WHERE plan.slug NOT IN ('standard-with-ads', 'standard', 'premium')
)
UPDATE region_prices price
SET
  status = 'review',
  data_quality = 'pending_review',
  source_summary = CONCAT_WS(
    ' ',
    NULLIF(price.source_summary, ''),
    'Hidden because the source plan was generated by pre-normalization Disney+ fallback matching.'
  ),
  updated_at = NOW()
FROM legacy_plans legacy
WHERE price.plan_id = legacy.id;

WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
),
legacy_plans AS (
  SELECT plan.id
  FROM plans plan
  JOIN disney ON disney.id = plan.product_id
  WHERE plan.slug NOT IN ('standard-with-ads', 'standard', 'premium')
)
UPDATE price_observations observation
SET
  status = 'ignored',
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'ignored_at', NOW()::TEXT,
    'ignore_reason', 'Historical Disney+ observation used a fallback-generated plan that is no longer public.',
    'auto_review_rule', 'disney_monthly_plan_normalization',
    'auto_review_decision', 'ignored',
    'auto_review_reason_code', 'app_store_legacy_plan_mapping'
  ),
  updated_at = NOW()
FROM legacy_plans legacy
WHERE observation.plan_id = legacy.id
  AND observation.status IN ('pending', 'approved');

WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
)
UPDATE plans plan
SET
  status = 'archived',
  description = CONCAT_WS(
    ' ',
    NULLIF(plan.description, ''),
    'Archived after Disney+ App Store plans were normalized to three canonical monthly tiers.'
  ),
  updated_at = NOW()
FROM disney
WHERE plan.product_id = disney.id
  AND plan.slug NOT IN ('standard-with-ads', 'standard', 'premium');
