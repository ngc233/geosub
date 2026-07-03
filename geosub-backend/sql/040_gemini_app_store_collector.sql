-- Wire Gemini into the App Store collector.
-- The previous local seed only had a generic official-page snapshot job, which
-- cannot produce App Store price observations.

WITH gemini_product AS (
  SELECT id
  FROM products
  WHERE slug = 'gemini'
  LIMIT 1
),
plan_specs(plan_slug, plan_name, plan_description, sort_order) AS (
  VALUES
    ('plus', 'Google AI Plus', 'Google AI Plus monthly App Store plan.', 10),
    ('pro', 'Google AI Pro', 'Google AI Pro monthly App Store plan.', 20),
    ('ultra', 'Google AI Ultra', 'Google AI Ultra monthly App Store plan.', 30)
),
upserted_plans AS (
  INSERT INTO plans (
    id, product_id, slug, name, billing_cycle, description,
    status, sort_order, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), gemini_product.id, plan_specs.plan_slug,
    plan_specs.plan_name, 'monthly', plan_specs.plan_description,
    'published', plan_specs.sort_order, NOW(), NOW()
  FROM gemini_product
  CROSS JOIN plan_specs
  ON CONFLICT (product_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = 'published',
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW()
  RETURNING id
),
upserted_source AS (
  INSERT INTO price_sources (
    id, source_key, name, source_level, type, provider, base_url,
    country_url_pattern, requires_javascript, requires_geo,
    reliability_score, status, note, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), 'gemini-app-store', 'Gemini App Store', 'B',
    'app_store', 'Apple', 'https://apps.apple.com/app/google-gemini/id6477489729',
    'https://apps.apple.com/{country}/app/google-gemini/id6477489729',
    TRUE, TRUE, 78, 'active',
    'App Store source for Google Gemini in-app subscription tiers.',
    NOW(), NOW()
  )
  ON CONFLICT (source_key) DO UPDATE SET
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
)
INSERT INTO collector_jobs (
  id, source_id, product_id, job_type, schedule, status,
  next_run_at, success_count, error_count, last_error, job_config,
  priority, created_at, updated_at
)
SELECT
  gen_random_uuid(), upserted_source.id, gemini_product.id,
  'ai_pricing', 'daily', 'active', NOW(), 0, 0, NULL,
  jsonb_build_object(
    'collector_kind', 'app_store',
    'source_kind', 'app-store',
    'app_store_id', '6477489729',
    'country_codes', jsonb_build_array(
      'US', 'JP', 'SG', 'GB', 'DE', 'FR', 'IN', 'BR', 'CA', 'AU',
      'KR', 'MX', 'TR', 'ID', 'PH', 'TH', 'MY', 'VN', 'ZA', 'NG',
      'AE', 'SA', 'IL', 'EG', 'KE', 'SE', 'NO', 'DK', 'NL', 'CH',
      'PL', 'IT', 'ES', 'CL', 'CO', 'AR', 'NZ', 'PK', 'TW'
    )
  ),
  82, NOW(), NOW()
FROM gemini_product
CROSS JOIN upserted_source
WHERE NOT EXISTS (
  SELECT 1
  FROM collector_jobs existing
  WHERE existing.product_id = gemini_product.id
    AND existing.source_id = upserted_source.id
    AND existing.job_config ->> 'collector_kind' = 'app_store'
);
