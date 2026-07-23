-- HBO Max App Store listings localize the same core tiers and can also expose
-- legacy, quarterly and sports bundle purchases. Keep the public comparison on
-- the three current monthly tiers documented by Max while retaining excluded
-- evidence for audit history.

INSERT INTO products (
  id,
  slug,
  name,
  category,
  provider,
  description,
  official_url,
  status,
  featured,
  sort_order,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'hbo-max',
  'HBO Max',
  'streaming',
  'Warner Bros. Discovery',
  'Compare HBO Max monthly subscription prices across supported App Store regions.',
  'https://www.max.com/',
  'review',
  FALSE,
  210,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  provider = COALESCE(NULLIF(products.provider, ''), EXCLUDED.provider),
  description = COALESCE(NULLIF(products.description, ''), EXCLUDED.description),
  official_url = COALESCE(NULLIF(products.official_url, ''), EXCLUDED.official_url),
  updated_at = NOW();

WITH upserted_source AS (
  INSERT INTO price_sources (
    id, source_key, name, source_level, type, provider, base_url,
    country_url_pattern, requires_javascript, requires_geo,
    reliability_score, status, note, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), 'hbo-max-app-store', 'HBO Max App Store', 'B',
    'app_store', 'Apple',
    'https://apps.apple.com/us/app/hbo-max-stream-movies-tv/id1666653815',
    'https://apps.apple.com/{country}/app/hbo-max-stream-movies-tv/id1666653815',
    TRUE, TRUE, 78, 'active',
    'Official App Store source for HBO Max monthly subscription tiers.',
    NOW(), NOW()
  )
  ON CONFLICT (source_key) DO UPDATE
  SET
    name = EXCLUDED.name,
    source_level = EXCLUDED.source_level,
    type = EXCLUDED.type,
    provider = EXCLUDED.provider,
    base_url = EXCLUDED.base_url,
    country_url_pattern = EXCLUDED.country_url_pattern,
    requires_javascript = EXCLUDED.requires_javascript,
    requires_geo = EXCLUDED.requires_geo,
    reliability_score = EXCLUDED.reliability_score,
    status = 'active',
    note = EXCLUDED.note,
    updated_at = NOW()
  RETURNING id
),
hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
)
UPDATE collector_jobs job
SET
  source_id = upserted_source.id,
  job_config = COALESCE(job.job_config, '{}'::jsonb) || jsonb_build_object(
    'url', 'https://apps.apple.com/us/app/hbo-max-stream-movies-tv/id1666653815?uo=4',
    'product_id', hbo_max.id,
    'source_kind', 'app-store',
    'app_store_id', '1666653815',
    'collector_kind', 'app_store'
  ),
  updated_at = NOW()
FROM hbo_max
CROSS JOIN upserted_source
WHERE job.product_id = hbo_max.id
  AND job.status <> 'archived'
  AND job.job_config ->> 'collector_kind' = 'app_store';

WITH hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
),
hbo_source AS (
  SELECT id
  FROM price_sources
  WHERE source_key = 'hbo-max-app-store'
  LIMIT 1
)
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
  created_at,
  updated_at,
  job_config,
  priority
)
SELECT
  gen_random_uuid(),
  hbo_source.id,
  hbo_max.id,
  'ai_pricing',
  'daily',
  'active',
  NOW(),
  0,
  0,
  NOW(),
  NOW(),
  jsonb_build_object(
    'url', 'https://apps.apple.com/us/app/hbo-max-stream-movies-tv/id1666653815?uo=4',
    'product_id', hbo_max.id,
    'source_kind', 'app-store',
    'app_store_id', '1666653815',
    'created_from', 'required_catalog_migration',
    'collector_kind', 'app_store'
  ),
  100
FROM hbo_max
CROSS JOIN hbo_source
WHERE NOT EXISTS (
  SELECT 1
  FROM collector_jobs job
  WHERE job.product_id = hbo_max.id
    AND job.schedule = 'daily'
    AND job.status <> 'archived'
    AND job.job_config ->> 'collector_kind' = 'app_store'
);

WITH hbo_max AS (
  SELECT id, status
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
),
canonical_plans(slug, name, sort_order) AS (
  VALUES
    ('basic-with-ads', 'HBO Max Basic with Ads', 10),
    ('standard', 'HBO Max Standard', 20),
    ('premium', 'HBO Max Premium', 30)
)
INSERT INTO plans (
  id,
  product_id,
  slug,
  name,
  billing_cycle,
  status,
  sort_order,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  hbo_max.id,
  canonical.slug,
  canonical.name,
  'monthly',
  (
    CASE WHEN hbo_max.status = 'published' THEN 'published' ELSE 'review' END
  )::publish_status,
  canonical.sort_order,
  NOW(),
  NOW()
FROM hbo_max
CROSS JOIN canonical_plans canonical
ON CONFLICT (product_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  billing_cycle = EXCLUDED.billing_cycle,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Move reviewed prices only when the exact App Store item identifies a current
-- canonical tier. Legacy and bundle names intentionally classify to NULL.
WITH hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
),
targets AS (
  SELECT plan.slug, plan.id
  FROM plans plan
  JOIN hbo_max ON hbo_max.id = plan.product_id
  WHERE plan.slug IN ('basic-with-ads', 'standard', 'premium')
),
classified AS (
  SELECT
    price.id AS region_price_id,
    price.plan_id AS source_plan_id,
    CASE
      WHEN COALESCE(selected.item_name, '') ~*
        '(antes[[:space:]]+(est.ndar|standard)|est.ndar[[:space:]]+antiguo|trimestral|quarter|mobile|tnt|dazn|sport|extra[[:space:]]+member)'
        THEN NULL
      WHEN COALESCE(selected.item_name, '') ~*
        '(basic.*ads|basic avec pub|base con pubblicit|basis mit werbung|b.sico (con|com) an.ncios|広告|광고|含广告|含廣告)'
        THEN (SELECT id FROM targets WHERE slug = 'basic-with-ads')
      WHEN COALESCE(selected.item_name, '') ~*
        '(premium|platinum|platino|プレミアム|프리미엄|高級|高级)'
        THEN (SELECT id FROM targets WHERE slug = 'premium')
      WHEN COALESCE(selected.item_name, '') ~*
        '(standard|est.ndar|スタンダード|스탠다드|標準|标准)'
        THEN (SELECT id FROM targets WHERE slug = 'standard')
      ELSE NULL
    END AS target_plan_id
  FROM region_prices price
  JOIN hbo_max ON hbo_max.id = price.product_id
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
    'Normalized to a canonical HBO Max monthly tier from the selected App Store item.'
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

-- Keep an already reviewed canonical row when two localized source plans
-- collapse to the same country/tier key.
WITH hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
),
targets AS (
  SELECT plan.slug, plan.id
  FROM plans plan
  JOIN hbo_max ON hbo_max.id = plan.product_id
  WHERE plan.slug IN ('basic-with-ads', 'standard', 'premium')
),
classified AS (
  SELECT
    price.id AS region_price_id,
    price.plan_id AS source_plan_id,
    CASE
      WHEN COALESCE(selected.item_name, '') ~*
        '(antes[[:space:]]+(est.ndar|standard)|est.ndar[[:space:]]+antiguo|trimestral|quarter|mobile|tnt|dazn|sport|extra[[:space:]]+member)'
        THEN NULL
      WHEN COALESCE(selected.item_name, '') ~*
        '(basic.*ads|basic avec pub|base con pubblicit|basis mit werbung|b.sico (con|com) an.ncios|広告|광고|含广告|含廣告)'
        THEN (SELECT id FROM targets WHERE slug = 'basic-with-ads')
      WHEN COALESCE(selected.item_name, '') ~*
        '(premium|platinum|platino|プレミアム|프리미엄|高級|高级)'
        THEN (SELECT id FROM targets WHERE slug = 'premium')
      WHEN COALESCE(selected.item_name, '') ~*
        '(standard|est.ndar|スタンダード|스탠다드|標準|标准)'
        THEN (SELECT id FROM targets WHERE slug = 'standard')
      ELSE NULL
    END AS target_plan_id
  FROM region_prices price
  JOIN hbo_max ON hbo_max.id = price.product_id
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
    'Quarantined as a duplicate during HBO Max plan normalization.'
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

-- Reattach all current-tier evidence to its canonical plan.
WITH hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
),
targets AS (
  SELECT plan.slug, plan.id
  FROM plans plan
  JOIN hbo_max ON hbo_max.id = plan.product_id
  WHERE plan.slug IN ('basic-with-ads', 'standard', 'premium')
),
classified AS (
  SELECT
    observation.id AS observation_id,
    CASE
      WHEN COALESCE(observation.raw_payload ->> 'item_name', '') ~*
        '(antes[[:space:]]+(est.ndar|standard)|est.ndar[[:space:]]+antiguo|trimestral|quarter|mobile|tnt|dazn|sport|extra[[:space:]]+member)'
        THEN NULL
      WHEN COALESCE(observation.raw_payload ->> 'item_name', '') ~*
        '(basic.*ads|basic avec pub|base con pubblicit|basis mit werbung|b.sico (con|com) an.ncios|広告|광고|含广告|含廣告)'
        THEN (SELECT id FROM targets WHERE slug = 'basic-with-ads')
      WHEN COALESCE(observation.raw_payload ->> 'item_name', '') ~*
        '(premium|platinum|platino|プレミアム|프리미엄|高級|高级)'
        THEN (SELECT id FROM targets WHERE slug = 'premium')
      WHEN COALESCE(observation.raw_payload ->> 'item_name', '') ~*
        '(standard|est.ndar|スタンダード|스탠다드|標準|标准)'
        THEN (SELECT id FROM targets WHERE slug = 'standard')
      ELSE NULL
    END AS target_plan_id
  FROM price_observations observation
  JOIN hbo_max ON hbo_max.id = observation.product_id
)
UPDATE price_observations observation
SET
  plan_id = classified.target_plan_id,
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'normalized_product_plan', 'hbo_max_monthly_v1',
    'normalized_at', NOW()::TEXT
  ),
  updated_at = NOW()
FROM classified
WHERE observation.id = classified.observation_id
  AND classified.target_plan_id IS NOT NULL;

-- Non-core subscriptions stay queryable as evidence, but cannot feed the
-- public monthly comparison or stability approval.
WITH hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
),
excluded_observations AS (
  SELECT observation.id
  FROM price_observations observation
  JOIN hbo_max ON hbo_max.id = observation.product_id
  WHERE observation.status IN ('pending', 'approved')
    AND COALESCE(observation.raw_payload ->> 'item_name', '') ~*
      '(antes[[:space:]]+(est.ndar|standard)|est.ndar[[:space:]]+antiguo|trimestral|quarter|mobile|tnt|dazn|sport|extra[[:space:]]+member|annual|yearly|anual)'
)
UPDATE price_observations observation
SET
  status = 'ignored',
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'ignored_at', NOW()::TEXT,
    'ignore_reason', 'Excluded from the core monthly HBO Max comparison: legacy, non-monthly, mobile-only, sports or bundle item.',
    'auto_review_rule', 'hbo_max_monthly_plan_normalization',
    'auto_review_decision', 'ignored',
    'auto_review_reason_code', 'app_store_non_core_subscription_item'
  ),
  updated_at = NOW()
FROM excluded_observations excluded
WHERE observation.id = excluded.id;

-- Hide every fallback-generated plan after valid evidence has been moved.
WITH hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
),
legacy_plans AS (
  SELECT plan.id
  FROM plans plan
  JOIN hbo_max ON hbo_max.id = plan.product_id
  WHERE plan.slug NOT IN ('basic-with-ads', 'standard', 'premium')
)
UPDATE region_prices price
SET
  status = 'review',
  data_quality = 'pending_review',
  source_summary = CONCAT_WS(
    ' ',
    NULLIF(price.source_summary, ''),
    'Hidden because the source plan is not a canonical HBO Max monthly tier.'
  ),
  updated_at = NOW()
FROM legacy_plans legacy
WHERE price.plan_id = legacy.id;

WITH hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
),
legacy_plans AS (
  SELECT plan.id
  FROM plans plan
  JOIN hbo_max ON hbo_max.id = plan.product_id
  WHERE plan.slug NOT IN ('basic-with-ads', 'standard', 'premium')
)
UPDATE price_observations observation
SET
  status = 'ignored',
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'ignored_at', NOW()::TEXT,
    'ignore_reason', 'Historical HBO Max observation used a fallback-generated plan that is no longer public.',
    'auto_review_rule', 'hbo_max_monthly_plan_normalization',
    'auto_review_decision', 'ignored',
    'auto_review_reason_code', 'app_store_legacy_plan_mapping'
  ),
  updated_at = NOW()
FROM legacy_plans legacy
WHERE observation.plan_id = legacy.id
  AND observation.status IN ('pending', 'approved');

WITH hbo_max AS (
  SELECT id
  FROM products
  WHERE slug = 'hbo-max'
  LIMIT 1
)
UPDATE plans plan
SET
  status = 'archived',
  description = CONCAT_WS(
    ' ',
    NULLIF(plan.description, ''),
    'Archived after HBO Max App Store plans were normalized to three canonical monthly tiers.'
  ),
  updated_at = NOW()
FROM hbo_max
WHERE plan.product_id = hbo_max.id
  AND plan.slug NOT IN ('basic-with-ads', 'standard', 'premium');

SELECT refresh_plan_affordability_metrics() AS refreshed_affordability_rows;
