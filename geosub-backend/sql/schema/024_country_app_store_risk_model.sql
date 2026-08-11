-- GeoSub schema migration. Split from sql/030_country_app_store_risk_model.sql; see migration-layout.json.

ALTER TABLE country_app_store_risk_profiles
ADD COLUMN IF NOT EXISTS base_risk_score INTEGER NOT NULL DEFAULT 55,
ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT 'app-store-risk-v1',
ADD COLUMN IF NOT EXISTS risk_factors_zh TEXT,
ADD COLUMN IF NOT EXISTS risk_factors_en TEXT;

ALTER TABLE country_app_store_risk_profiles
DROP CONSTRAINT IF EXISTS country_app_store_risk_profiles_base_score_check;

ALTER TABLE country_app_store_risk_profiles
ADD CONSTRAINT country_app_store_risk_profiles_base_score_check
CHECK (base_risk_score BETWEEN 0 AND 100);
