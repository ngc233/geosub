CREATE TABLE IF NOT EXISTS app_store_availability_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_id UUID REFERENCES price_sources(id) ON DELETE SET NULL,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  billing_platform billing_platform NOT NULL DEFAULT 'ios',
  status TEXT NOT NULL CHECK (status IN (
    'available_with_prices',
    'available_no_iap',
    'not_available',
    'blocked',
    'unknown_error'
  )),
  app_store_id TEXT,
  storefront TEXT NOT NULL,
  source_url TEXT,
  final_url TEXT,
  http_status INTEGER,
  item_count INTEGER NOT NULL DEFAULT 0,
  subscription_item_count INTEGER NOT NULL DEFAULT 0,
  ignored_item_count INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, country_id, billing_platform)
);

CREATE INDEX IF NOT EXISTS idx_app_store_availability_product_status
  ON app_store_availability_checks(product_id, status);

CREATE INDEX IF NOT EXISTS idx_app_store_availability_country_status
  ON app_store_availability_checks(country_id, status);

CREATE INDEX IF NOT EXISTS idx_app_store_availability_checked_at
  ON app_store_availability_checks(checked_at DESC);

DROP TRIGGER IF EXISTS trg_app_store_availability_checks_updated_at ON app_store_availability_checks;
CREATE TRIGGER trg_app_store_availability_checks_updated_at
BEFORE UPDATE ON app_store_availability_checks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE VIEW app_store_availability_latest_view AS
SELECT
  availability.id,
  availability.product_id,
  product.slug AS product_slug,
  product.name AS product_name,
  availability.source_id,
  source.name AS source_name,
  availability.country_id,
  country.code AS country_code,
  country.name_zh AS country_name_zh,
  country.name_en AS country_name_en,
  country.currency,
  availability.billing_platform,
  availability.status,
  availability.app_store_id,
  availability.storefront,
  availability.source_url,
  availability.final_url,
  availability.http_status,
  availability.item_count,
  availability.subscription_item_count,
  availability.ignored_item_count,
  availability.reason,
  availability.checked_at,
  availability.updated_at
FROM app_store_availability_checks availability
JOIN products product ON product.id = availability.product_id
JOIN countries country ON country.id = availability.country_id
LEFT JOIN price_sources source ON source.id = availability.source_id;
