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

WITH seed(code, treatment, review_status, note_zh, note_en) AS (
  VALUES
    ('AU', 'included_likely', 'verified', 'App Store 标价通常已含 GST，最终以结算页为准', 'App Store list price is usually GST-inclusive; final checkout applies'),
    ('BR', 'varies_by_region', 'needs_review', '州税不同，仅作税费背景说明', 'State tax varies; shown as tax context only'),
    ('CA', 'varies_by_region', 'verified', '各省税费不同，最终以结算页为准', 'Province-level tax varies; final checkout applies'),
    ('DE', 'included_likely', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive'),
    ('DK', 'included_likely', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive'),
    ('GB', 'included_likely', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive'),
    ('IN', 'included_likely', 'needs_review', '通常含 GST，仍以结算页为准', 'Usually GST-inclusive; final checkout applies'),
    ('JP', 'included_likely', 'verified', 'App Store 标价通常已含消费税', 'App Store list price is usually consumption-tax-inclusive'),
    ('KR', 'included_likely', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive'),
    ('MX', 'included_likely', 'needs_review', '通常含 VAT，仍以结算页为准', 'Usually VAT-inclusive; final checkout applies'),
    ('PH', 'included_likely', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive'),
    ('SG', 'included_likely', 'verified', 'App Store 标价通常已含 GST', 'App Store list price is usually GST-inclusive'),
    ('TR', 'included_likely', 'needs_review', '通常含 VAT，仍以结算页为准', 'Usually VAT-inclusive; final checkout applies'),
    ('US', 'varies_by_region', 'verified', '各州销售税不同，结算页可能变化', 'Sales tax varies by state and may change at checkout')
)
UPDATE country_tax_profiles profile
SET
  app_store_tax_treatment = seed.treatment,
  price_calculation_policy = 'do_not_calculate',
  review_status = seed.review_status,
  frontend_note_zh = seed.note_zh,
  frontend_note_en = seed.note_en,
  updated_at = NOW()
FROM seed
JOIN countries c ON c.code = seed.code
WHERE profile.country_id = c.id;

UPDATE country_tax_profiles
SET
  app_store_tax_treatment = CASE
    WHEN is_variable_by_region THEN 'varies_by_region'
    ELSE 'included_likely'
  END,
  price_calculation_policy = 'do_not_calculate',
  review_status = CASE
    WHEN confidence = 'low' THEN 'needs_review'
    ELSE review_status
  END,
  frontend_note_zh = COALESCE(frontend_note_zh, '税费说明仅作参考，最终以结算页为准'),
  frontend_note_en = COALESCE(frontend_note_en, 'Tax note is informational; final checkout applies'),
  updated_at = NOW()
WHERE status = 'active';
