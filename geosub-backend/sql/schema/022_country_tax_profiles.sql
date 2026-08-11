-- GeoSub schema migration. Split from sql/028_country_tax_profiles.sql; see migration-layout.json.

CREATE TABLE IF NOT EXISTS country_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  tax_type TEXT NOT NULL,
  rate_min NUMERIC(7, 3),
  rate_max NUMERIC(7, 3),
  applies_to_digital_services BOOLEAN NOT NULL DEFAULT TRUE,
  is_variable_by_region BOOLEAN NOT NULL DEFAULT FALSE,
  display_note_zh TEXT NOT NULL,
  display_note_en TEXT NOT NULL,
  source_label TEXT,
  source_url TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium',
  verified_at DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT country_tax_profiles_country_unique UNIQUE (country_id),
  CONSTRAINT country_tax_profiles_confidence_check CHECK (confidence IN ('high', 'medium', 'low')),
  CONSTRAINT country_tax_profiles_status_check CHECK (status IN ('active', 'draft', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_country_tax_profiles_status
ON country_tax_profiles(status);

DROP TRIGGER IF EXISTS trg_country_tax_profiles_updated_at ON country_tax_profiles;
CREATE TRIGGER trg_country_tax_profiles_updated_at
BEFORE UPDATE ON country_tax_profiles
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();
