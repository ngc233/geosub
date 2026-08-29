-- Seed the review-only Apple Music official Web pilot.
--
-- This backfill creates canonical collection prerequisites only. It does not
-- insert observations or region_prices, publish products or plans, or enable
-- the collector job. Production application remains a separately approved
-- data operation.

BEGIN;

DO $$
DECLARE
  missing_countries TEXT;
  currency_mismatches TEXT;
BEGIN
  WITH expected(code, currency) AS (
    VALUES
      ('US', 'USD'),
      ('BR', 'BRL'),
      ('TR', 'TRY'),
      ('JP', 'JPY'),
      ('DE', 'EUR')
  )
  SELECT string_agg(expected.code, ', ' ORDER BY expected.code)
  INTO missing_countries
  FROM expected
  LEFT JOIN countries country ON country.code = expected.code
  WHERE country.id IS NULL;

  IF missing_countries IS NOT NULL THEN
    RAISE EXCEPTION 'Apple Music pilot is missing canonical countries: %', missing_countries;
  END IF;

  WITH expected(code, currency) AS (
    VALUES
      ('US', 'USD'),
      ('BR', 'BRL'),
      ('TR', 'TRY'),
      ('JP', 'JPY'),
      ('DE', 'EUR')
  )
  SELECT string_agg(
    expected.code || ':' || country.currency || '!=' || expected.currency,
    ', ' ORDER BY expected.code
  )
  INTO currency_mismatches
  FROM expected
  JOIN countries country ON country.code = expected.code
  WHERE country.currency <> expected.currency;

  IF currency_mismatches IS NOT NULL THEN
    RAISE EXCEPTION 'Apple Music pilot country currency mismatch: %', currency_mismatches;
  END IF;
END $$;

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
  'apple-music',
  'Apple Music',
  'streaming',
  'Apple',
  'Review-only pilot for Apple Music Individual, Family and Student monthly Web prices from official localized Apple pages.',
  'https://www.apple.com/apple-music/',
  'review',
  FALSE,
  415,
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
  sort_order = CASE
    WHEN products.sort_order = 0 THEN EXCLUDED.sort_order
    ELSE products.sort_order
  END,
  updated_at = NOW();

WITH apple_music AS (
  SELECT id
  FROM products
  WHERE slug = 'apple-music'
  LIMIT 1
),
canonical_plans(slug, name, description, sort_order) AS (
  VALUES
    (
      'individual',
      'Apple Music Individual',
      'Apple Music Individual monthly Web plan.',
      10
    ),
    (
      'family',
      'Apple Music Family',
      'Apple Music Family monthly Web plan.',
      20
    ),
    (
      'student',
      'Apple Music Student',
      'Apple Music Student monthly Web plan.',
      30
    )
)
INSERT INTO plans (
  id,
  product_id,
  slug,
  name,
  billing_cycle,
  description,
  status,
  sort_order,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  apple_music.id,
  canonical.slug,
  canonical.name,
  'monthly',
  canonical.description,
  'review',
  canonical.sort_order,
  NOW(),
  NOW()
FROM apple_music
CROSS JOIN canonical_plans canonical
ON CONFLICT (product_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  billing_cycle = EXCLUDED.billing_cycle,
  description = COALESCE(NULLIF(plans.description, ''), EXCLUDED.description),
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO price_sources (
  id,
  source_key,
  name,
  source_level,
  type,
  provider,
  base_url,
  country_url_pattern,
  requires_javascript,
  requires_account,
  requires_geo,
  terms_risk,
  reliability_score,
  status,
  note,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'apple-music-official-web',
  'Apple Music Official Web Pricing',
  'A',
  'official_page',
  'Apple',
  'https://www.apple.com/apple-music/',
  NULL,
  TRUE,
  FALSE,
  FALSE,
  'low',
  90,
  'active',
  'Official localized Apple Music pricing pages. Parser-complete observations remain pending until a Web-specific review rule is approved.',
  NOW(),
  NOW()
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
  requires_account = EXCLUDED.requires_account,
  requires_geo = EXCLUDED.requires_geo,
  terms_risk = EXCLUDED.terms_risk,
  reliability_score = EXCLUDED.reliability_score,
  status = 'active',
  note = EXCLUDED.note,
  updated_at = NOW();

WITH apple_music AS (
  SELECT id
  FROM products
  WHERE slug = 'apple-music'
  LIMIT 1
),
apple_music_source AS (
  SELECT id
  FROM price_sources
  WHERE source_key = 'apple-music-official-web'
  LIMIT 1
)
UPDATE collector_jobs job
SET
  source_id = apple_music_source.id,
  job_type = 'streaming_pricing',
  schedule = 'daily',
  job_config = COALESCE(job.job_config, '{}'::jsonb) || jsonb_build_object(
    'url', 'https://www.apple.com/apple-music/',
    'product_id', apple_music.id,
    'source_kind', 'official-web',
    'collector_kind', 'pricing_page',
    'official_web_source_key', 'apple-music',
    'country_codes', jsonb_build_array('US', 'BR', 'TR', 'JP', 'DE'),
    'created_from', 'apple_music_official_web_pilot',
    'pilot', TRUE
  ),
  priority = 90,
  updated_at = NOW()
FROM apple_music
CROSS JOIN apple_music_source
WHERE job.product_id = apple_music.id
  AND job.status <> 'archived'
  AND (
    job.source_id = apple_music_source.id
    OR (
      job.job_config ->> 'collector_kind' = 'pricing_page'
      AND job.job_config ->> 'official_web_source_key' = 'apple-music'
    )
  );

WITH apple_music AS (
  SELECT id
  FROM products
  WHERE slug = 'apple-music'
  LIMIT 1
),
apple_music_source AS (
  SELECT id
  FROM price_sources
  WHERE source_key = 'apple-music-official-web'
  LIMIT 1
)
INSERT INTO collector_jobs (
  id,
  source_id,
  product_id,
  job_type,
  schedule,
  status,
  last_run_at,
  next_run_at,
  success_count,
  error_count,
  last_error,
  created_at,
  updated_at,
  job_config,
  priority
)
SELECT
  gen_random_uuid(),
  apple_music_source.id,
  apple_music.id,
  'streaming_pricing',
  'daily',
  'paused',
  NULL,
  NULL,
  0,
  0,
  NULL,
  NOW(),
  NOW(),
  jsonb_build_object(
    'url', 'https://www.apple.com/apple-music/',
    'product_id', apple_music.id,
    'source_kind', 'official-web',
    'collector_kind', 'pricing_page',
    'official_web_source_key', 'apple-music',
    'country_codes', jsonb_build_array('US', 'BR', 'TR', 'JP', 'DE'),
    'created_from', 'apple_music_official_web_pilot',
    'pilot', TRUE
  ),
  90
FROM apple_music
CROSS JOIN apple_music_source
WHERE NOT EXISTS (
  SELECT 1
  FROM collector_jobs existing
  WHERE existing.product_id = apple_music.id
    AND existing.status <> 'archived'
    AND (
      existing.source_id = apple_music_source.id
      OR (
        existing.job_config ->> 'collector_kind' = 'pricing_page'
        AND existing.job_config ->> 'official_web_source_key' = 'apple-music'
      )
    )
);

COMMIT;
