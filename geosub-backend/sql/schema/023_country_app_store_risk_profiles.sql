-- GeoSub schema migration. Split from sql/029_country_app_store_risk_profiles.sql; see migration-layout.json.

CREATE TABLE IF NOT EXISTS country_app_store_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  display_note_zh TEXT NOT NULL,
  display_note_en TEXT NOT NULL,
  requirements_zh TEXT,
  requirements_en TEXT,
  source_label TEXT,
  source_url TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium',
  verified_at DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT country_app_store_risk_profiles_country_unique UNIQUE (country_id),
  CONSTRAINT country_app_store_risk_profiles_risk_level_check CHECK (risk_level IN ('low', 'medium', 'high', 'unknown')),
  CONSTRAINT country_app_store_risk_profiles_confidence_check CHECK (confidence IN ('high', 'medium', 'low')),
  CONSTRAINT country_app_store_risk_profiles_status_check CHECK (status IN ('active', 'draft', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_country_app_store_risk_profiles_status
ON country_app_store_risk_profiles(status);

CREATE INDEX IF NOT EXISTS idx_country_app_store_risk_profiles_risk_level
ON country_app_store_risk_profiles(risk_level);

DROP TRIGGER IF EXISTS trg_country_app_store_risk_profiles_updated_at ON country_app_store_risk_profiles;
CREATE TRIGGER trg_country_app_store_risk_profiles_updated_at
BEFORE UPDATE ON country_app_store_risk_profiles
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();
