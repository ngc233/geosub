-- Ensure every maintained canonical App Store product can enter the shared
-- collection pipeline. Existing production records keep their lifecycle state
-- and price data; this migration only fills missing catalog configuration.

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
  'disney',
  'Disney+',
  'streaming',
  'Disney',
  'Compare Disney+ monthly subscription prices across supported App Store regions.',
  'https://www.disneyplus.com/',
  'review',
  FALSE,
  200,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  provider = COALESCE(products.provider, EXCLUDED.provider),
  description = COALESCE(products.description, EXCLUDED.description),
  official_url = COALESCE(products.official_url, EXCLUDED.official_url),
  updated_at = NOW();

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
  disney.id,
  canonical.slug,
  canonical.name,
  'monthly',
  'review',
  canonical.sort_order,
  NOW(),
  NOW()
FROM disney
CROSS JOIN canonical_plans canonical
ON CONFLICT (product_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  billing_cycle = EXCLUDED.billing_cycle,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH disney AS (
  SELECT id
  FROM products
  WHERE slug = 'disney'
  LIMIT 1
)
INSERT INTO collector_jobs (
  id,
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
  disney.id,
  'ai_pricing',
  'daily',
  'active',
  NOW(),
  0,
  0,
  NOW(),
  NOW(),
  jsonb_build_object(
    'url', 'https://apps.apple.com/us/app/disney/id1446075923?uo=4',
    'product_id', disney.id,
    'source_kind', 'app-store',
    'app_store_id', '1446075923',
    'created_from', 'required_catalog_migration',
    'collector_kind', 'app_store'
  ),
  100
FROM disney
WHERE NOT EXISTS (
  SELECT 1
  FROM collector_jobs job
  WHERE job.product_id = disney.id
    AND job.status <> 'archived'
    AND job.job_config ->> 'collector_kind' = 'app_store'
);
