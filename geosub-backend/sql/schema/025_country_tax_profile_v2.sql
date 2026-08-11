-- GeoSub schema migration. Split from sql/032_country_tax_profile_v2.sql; see migration-layout.json.

ALTER TABLE country_tax_profiles
  ADD COLUMN IF NOT EXISTS app_store_tax_treatment TEXT NOT NULL DEFAULT 'included_likely',
  ADD COLUMN IF NOT EXISTS price_calculation_policy TEXT NOT NULL DEFAULT 'do_not_calculate',
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS frontend_note_zh TEXT,
  ADD COLUMN IF NOT EXISTS frontend_note_en TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'country_tax_profiles_app_store_tax_treatment_check'
  ) THEN
    ALTER TABLE country_tax_profiles
      ADD CONSTRAINT country_tax_profiles_app_store_tax_treatment_check
      CHECK (app_store_tax_treatment IN (
        'included_likely',
        'varies_by_region',
        'checkout_may_add',
        'unknown'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'country_tax_profiles_price_calculation_policy_check'
  ) THEN
    ALTER TABLE country_tax_profiles
      ADD CONSTRAINT country_tax_profiles_price_calculation_policy_check
      CHECK (price_calculation_policy IN (
        'do_not_calculate',
        'informational_only'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'country_tax_profiles_review_status_check'
  ) THEN
    ALTER TABLE country_tax_profiles
      ADD CONSTRAINT country_tax_profiles_review_status_check
      CHECK (review_status IN (
        'verified',
        'needs_review',
        'unknown'
      ));
  END IF;
END $$;
