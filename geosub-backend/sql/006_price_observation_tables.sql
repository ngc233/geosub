-- GeoSub external price observation layer
-- Raw external observations should be reviewed before promoting into region_prices.

CREATE TABLE IF NOT EXISTS product_source_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_slug TEXT NOT NULL,

  platform TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,

  external_app_id TEXT,
  bundle_id TEXT,
  source_url TEXT,

  storefront_country_code TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_source_profiles_platform_check CHECK (
    platform IN (
      'app_store_ios',
      'google_play',
      'web',
      'desktop',
      'third_party',
      'manual',
      'unknown'
    )
  ),

  CONSTRAINT product_source_profiles_source_type_check CHECK (
    source_type IN (
      'app_store_page',
      'manual_screenshot',
      'third_party',
      'official_page',
      'user_submission',
      'internal_seed',
      'unknown'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_source_profiles_unique_source
ON product_source_profiles (
  product_slug,
  platform,
  source_type,
  COALESCE(external_app_id, ''),
  COALESCE(storefront_country_code, '')
);

CREATE INDEX IF NOT EXISTS idx_product_source_profiles_product_slug
ON product_source_profiles(product_slug);

CREATE INDEX IF NOT EXISTS idx_product_source_profiles_platform
ON product_source_profiles(platform, source_type, is_active);


CREATE TABLE IF NOT EXISTS price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_profile_id UUID REFERENCES product_source_profiles(id) ON DELETE SET NULL,

  product_slug TEXT NOT NULL,
  plan_slug TEXT NOT NULL,
  country_code TEXT NOT NULL,

  platform TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,

  observed_local_price NUMERIC(14, 4),
  observed_currency TEXT,
  observed_price_text TEXT,
  observed_billing_cycle TEXT,

  observed_price_usd NUMERIC(14, 4),
  fx_rate_to_usd NUMERIC(18, 8),
  fx_rate_date DATE,

  raw_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  screenshot_url TEXT,

  confidence_score INTEGER NOT NULL DEFAULT 50,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,

  reviewer TEXT,
  reviewed_at TIMESTAMPTZ,
  promoted_region_price_id UUID REFERENCES region_prices(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,

  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT price_observations_platform_check CHECK (
    platform IN (
      'app_store_ios',
      'google_play',
      'web',
      'desktop',
      'third_party',
      'manual',
      'unknown'
    )
  ),

  CONSTRAINT price_observations_source_type_check CHECK (
    source_type IN (
      'app_store_page',
      'manual_screenshot',
      'third_party',
      'official_page',
      'user_submission',
      'internal_seed',
      'unknown'
    )
  ),

  CONSTRAINT price_observations_review_status_check CHECK (
    review_status IN (
      'pending',
      'approved',
      'rejected',
      'promoted'
    )
  ),

  CONSTRAINT price_observations_confidence_score_check CHECK (
    confidence_score >= 0 AND confidence_score <= 100
  )
);

CREATE INDEX IF NOT EXISTS idx_price_observations_product_plan
ON price_observations(product_slug, plan_slug, country_code);

CREATE INDEX IF NOT EXISTS idx_price_observations_status
ON price_observations(review_status, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_observations_platform
ON price_observations(platform, source_type);

CREATE INDEX IF NOT EXISTS idx_price_observations_source_profile
ON price_observations(source_profile_id);


DROP TRIGGER IF EXISTS trg_product_source_profiles_updated_at ON product_source_profiles;
CREATE TRIGGER trg_product_source_profiles_updated_at
BEFORE UPDATE ON product_source_profiles
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();

DROP TRIGGER IF EXISTS trg_price_observations_updated_at ON price_observations;
CREATE TRIGGER trg_price_observations_updated_at
BEFORE UPDATE ON price_observations
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();


CREATE OR REPLACE VIEW pending_price_observations_view AS
SELECT
  po.id,
  po.product_slug,
  po.plan_slug,
  po.country_code,
  c.name_zh AS country_name_zh,
  c.name_en AS country_name_en,
  po.platform,
  po.source_type,
  po.observed_local_price,
  po.observed_currency,
  po.observed_price_text,
  po.observed_billing_cycle,
  po.observed_price_usd,
  po.confidence_score,
  po.review_status,
  po.source_url,
  po.screenshot_url,
  po.observed_at,
  po.created_at
FROM price_observations po
LEFT JOIN countries c ON UPPER(c.code) = UPPER(po.country_code)
WHERE po.review_status = 'pending'
ORDER BY po.observed_at DESC;


INSERT INTO product_source_profiles (
  product_id,
  product_slug,
  platform,
  source_type,
  source_name,
  external_app_id,
  source_url,
  config
)
SELECT
  p.id,
  'chatgpt',
  'app_store_ios',
  'app_store_page',
  'Apple App Store - ChatGPT',
  '6448311069',
  'https://apps.apple.com/us/app/chatgpt/id6448311069',
  jsonb_build_object(
    'provider', 'apple',
    'storefront_mode', 'country_path',
    'primary_storefront', 'us',
    'notes', 'Official ChatGPT iOS App Store listing. Use storefront-specific observations before promoting prices.'
  )
FROM products p
WHERE p.slug = 'chatgpt'
ON CONFLICT (
  product_slug,
  platform,
  source_type,
  COALESCE(external_app_id, ''),
  COALESCE(storefront_country_code, '')
)
DO UPDATE SET
  product_id = EXCLUDED.product_id,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  config = EXCLUDED.config,
  is_active = TRUE,
  updated_at = NOW();


SELECT
  id,
  product_slug,
  platform,
  source_type,
  source_name,
  external_app_id,
  source_url,
  is_active
FROM product_source_profiles
WHERE product_slug = 'chatgpt'
ORDER BY created_at DESC;