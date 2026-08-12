-- GeoSub schema migration. Split from sql/006_price_observation_tables.sql.
-- The later observation model superseded the remaining legacy objects, but
-- production still owns and retains this source-profile table.

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

DROP TRIGGER IF EXISTS trg_product_source_profiles_updated_at ON product_source_profiles;
CREATE TRIGGER trg_product_source_profiles_updated_at
BEFORE UPDATE ON product_source_profiles
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();
