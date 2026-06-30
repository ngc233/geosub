ALTER TABLE country_tax_profiles
  ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_document_date DATE,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS sync_note TEXT,
  ADD COLUMN IF NOT EXISTS source_payload JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'country_tax_profiles_source_kind_check'
  ) THEN
    ALTER TABLE country_tax_profiles
      ADD CONSTRAINT country_tax_profiles_source_kind_check
      CHECK (source_kind IN ('manual', 'official', 'apple', 'provider', 'inferred'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'country_tax_profiles_sync_status_check'
  ) THEN
    ALTER TABLE country_tax_profiles
      ADD CONSTRAINT country_tax_profiles_sync_status_check
      CHECK (sync_status IN ('manual', 'synced', 'needs_review', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_country_tax_profiles_next_review
ON country_tax_profiles(next_review_at)
WHERE status = 'active';

CREATE TABLE IF NOT EXISTS country_tax_profile_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running',
  requested_url TEXT,
  profile_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  needs_review_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT country_tax_profile_sync_runs_source_kind_check
    CHECK (source_kind IN ('manual', 'official', 'apple', 'provider', 'inferred')),
  CONSTRAINT country_tax_profile_sync_runs_status_check
    CHECK (status IN ('running', 'succeeded', 'partial', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_country_tax_profile_sync_runs_started
ON country_tax_profile_sync_runs(started_at DESC);

CREATE OR REPLACE FUNCTION upsert_country_tax_profile(
  p_country_code TEXT,
  p_tax_type TEXT,
  p_rate_min NUMERIC,
  p_rate_max NUMERIC,
  p_applies_to_digital_services BOOLEAN,
  p_is_variable_by_region BOOLEAN,
  p_display_note_zh TEXT,
  p_display_note_en TEXT,
  p_confidence TEXT,
  p_source_label TEXT,
  p_source_url TEXT,
  p_verified_at DATE,
  p_app_store_tax_treatment TEXT,
  p_price_calculation_policy TEXT,
  p_review_status TEXT,
  p_frontend_note_zh TEXT,
  p_frontend_note_en TEXT,
  p_source_kind TEXT,
  p_source_document_date DATE,
  p_next_review_at TIMESTAMPTZ,
  p_sync_status TEXT,
  p_sync_note TEXT,
  p_source_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_country_id UUID;
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_country_id
  FROM countries
  WHERE code = UPPER(TRIM(p_country_code));

  IF v_country_id IS NULL THEN
    RAISE EXCEPTION 'Unknown country code: %', p_country_code;
  END IF;

  INSERT INTO country_tax_profiles (
    country_id,
    tax_type,
    rate_min,
    rate_max,
    applies_to_digital_services,
    is_variable_by_region,
    display_note_zh,
    display_note_en,
    confidence,
    source_label,
    source_url,
    verified_at,
    status,
    app_store_tax_treatment,
    price_calculation_policy,
    review_status,
    frontend_note_zh,
    frontend_note_en,
    source_kind,
    source_document_date,
    last_synced_at,
    next_review_at,
    sync_status,
    sync_note,
    source_payload
  )
  VALUES (
    v_country_id,
    p_tax_type,
    p_rate_min,
    p_rate_max,
    COALESCE(p_applies_to_digital_services, TRUE),
    COALESCE(p_is_variable_by_region, FALSE),
    p_display_note_zh,
    p_display_note_en,
    p_confidence,
    p_source_label,
    p_source_url,
    p_verified_at,
    'active',
    p_app_store_tax_treatment,
    p_price_calculation_policy,
    p_review_status,
    p_frontend_note_zh,
    p_frontend_note_en,
    p_source_kind,
    p_source_document_date,
    NOW(),
    p_next_review_at,
    p_sync_status,
    p_sync_note,
    p_source_payload
  )
  ON CONFLICT (country_id) DO UPDATE SET
    tax_type = EXCLUDED.tax_type,
    rate_min = EXCLUDED.rate_min,
    rate_max = EXCLUDED.rate_max,
    applies_to_digital_services = EXCLUDED.applies_to_digital_services,
    is_variable_by_region = EXCLUDED.is_variable_by_region,
    display_note_zh = EXCLUDED.display_note_zh,
    display_note_en = EXCLUDED.display_note_en,
    confidence = EXCLUDED.confidence,
    source_label = EXCLUDED.source_label,
    source_url = EXCLUDED.source_url,
    verified_at = EXCLUDED.verified_at,
    status = EXCLUDED.status,
    app_store_tax_treatment = EXCLUDED.app_store_tax_treatment,
    price_calculation_policy = EXCLUDED.price_calculation_policy,
    review_status = EXCLUDED.review_status,
    frontend_note_zh = EXCLUDED.frontend_note_zh,
    frontend_note_en = EXCLUDED.frontend_note_en,
    source_kind = EXCLUDED.source_kind,
    source_document_date = EXCLUDED.source_document_date,
    last_synced_at = EXCLUDED.last_synced_at,
    next_review_at = EXCLUDED.next_review_at,
    sync_status = EXCLUDED.sync_status,
    sync_note = EXCLUDED.sync_note,
    source_payload = EXCLUDED.source_payload,
    updated_at = NOW()
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;
