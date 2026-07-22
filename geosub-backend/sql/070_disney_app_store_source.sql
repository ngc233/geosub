-- Attach the required Disney+ collector to a first-class App Store source so
-- the admin UI and evidence records use the same source configuration.

WITH upserted_source AS (
  INSERT INTO price_sources (
    id, source_key, name, source_level, type, provider, base_url,
    country_url_pattern, requires_javascript, requires_geo,
    reliability_score, status, note, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), 'disney-app-store', 'Disney+ App Store', 'B',
    'app_store', 'Apple',
    'https://apps.apple.com/us/app/disney/id1446075923',
    'https://apps.apple.com/{country}/app/disney/id1446075923',
    TRUE, TRUE, 78, 'active',
    'Official App Store source for Disney+ monthly subscription tiers.',
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
disney AS (
  SELECT id FROM products WHERE slug = 'disney' LIMIT 1
)
UPDATE collector_jobs job
SET source_id = upserted_source.id, updated_at = NOW()
FROM disney
CROSS JOIN upserted_source
WHERE job.product_id = disney.id
  AND job.status <> 'archived'
  AND job.job_config ->> 'collector_kind' = 'app_store';
