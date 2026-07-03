-- Common App Store country tax profiles.
-- These profiles improve public tax explanations for the default App Store
-- collector countries. GeoSub still does not add tax to collected list prices;
-- checkout remains the source of truth.

WITH profiles(
  country_code,
  tax_type,
  rate_min,
  rate_max,
  is_variable_by_region,
  display_note_zh,
  display_note_en,
  confidence,
  source_label,
  source_url,
  review_status,
  frontend_note_zh,
  frontend_note_en,
  next_review_at,
  sync_status,
  sync_note
) AS (
  VALUES
    ('FR', 'VAT', 20::numeric, 20::numeric, FALSE, '含 20% VAT', 'Includes 20% VAT', 'high', 'European Commission VAT rates', 'https://taxation-customs.ec.europa.eu/taxation/vat/vat-rules-and-rates_en', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common EU App Store country tax profile.'),
    ('ES', 'VAT', 21::numeric, 21::numeric, FALSE, '含 21% VAT', 'Includes 21% VAT', 'high', 'European Commission VAT rates', 'https://taxation-customs.ec.europa.eu/taxation/vat/vat-rules-and-rates_en', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common EU App Store country tax profile.'),
    ('IT', 'VAT', 22::numeric, 22::numeric, FALSE, '含 22% VAT', 'Includes 22% VAT', 'high', 'European Commission VAT rates', 'https://taxation-customs.ec.europa.eu/taxation/vat/vat-rules-and-rates_en', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common EU App Store country tax profile.'),
    ('NL', 'VAT', 21::numeric, 21::numeric, FALSE, '含 21% VAT', 'Includes 21% VAT', 'high', 'European Commission VAT rates', 'https://taxation-customs.ec.europa.eu/taxation/vat/vat-rules-and-rates_en', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common EU App Store country tax profile.'),
    ('SE', 'VAT', 25::numeric, 25::numeric, FALSE, '含 25% VAT', 'Includes 25% VAT', 'high', 'European Commission VAT rates', 'https://taxation-customs.ec.europa.eu/taxation/vat/vat-rules-and-rates_en', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common EU App Store country tax profile.'),
    ('PL', 'VAT', 23::numeric, 23::numeric, FALSE, '含 23% VAT', 'Includes 23% VAT', 'high', 'European Commission VAT rates', 'https://taxation-customs.ec.europa.eu/taxation/vat/vat-rules-and-rates_en', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common EU App Store country tax profile.'),
    ('NO', 'VAT', 25::numeric, 25::numeric, FALSE, '含 25% VAT', 'Includes 25% VAT', 'high', 'Norwegian Tax Administration', 'https://www.skatteetaten.no/en/business-and-organisation/vat-and-duties/vat/rates/', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common App Store country tax profile.'),
    ('CH', 'VAT', 8.1::numeric, 8.1::numeric, FALSE, '含 8.1% VAT', 'Includes 8.1% VAT', 'high', 'Swiss Federal Tax Administration', 'https://www.estv.admin.ch/en/vat-rates-switzerland', 'verified', 'App Store 标价通常已含 VAT', 'App Store list price is usually VAT-inclusive', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common App Store country tax profile.'),
    ('NZ', 'GST', 15::numeric, 15::numeric, FALSE, '含 15% GST', 'Includes 15% GST', 'high', 'New Zealand Inland Revenue', 'https://www.ird.govt.nz/gst', 'verified', 'App Store 标价通常已含 GST，最终以结算页为准', 'App Store list price is usually GST-inclusive; final checkout applies', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common App Store country tax profile.'),

    ('AR', 'VAT', 21::numeric, 21::numeric, FALSE, '通常含 21% VAT', 'Usually includes 21% VAT', 'medium', 'Argentina tax authority', 'https://www.afip.gob.ar/iva/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('CL', 'VAT', 19::numeric, 19::numeric, FALSE, '通常含 19% VAT', 'Usually includes 19% VAT', 'medium', 'Chile tax authority', 'https://www.sii.cl/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('CO', 'VAT', 19::numeric, 19::numeric, FALSE, '通常含 19% VAT', 'Usually includes 19% VAT', 'medium', 'Colombia DIAN', 'https://www.dian.gov.co/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('TW', 'VAT', 5::numeric, 5::numeric, FALSE, '通常含 5% VAT', 'Usually includes 5% VAT', 'medium', 'Taiwan Ministry of Finance', 'https://www.etax.nat.gov.tw/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('MY', 'SST', 8::numeric, 8::numeric, FALSE, '通常含 8% 服务税', 'Usually includes 8% service tax', 'medium', 'Royal Malaysian Customs Department', 'https://www.customs.gov.my/', 'needs_review', '数字服务税务规则可能随服务类别变化，最终以结算页为准', 'Digital service tax treatment may vary by service category; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('TH', 'VAT', 7::numeric, 7::numeric, FALSE, '通常含 7% VAT', 'Usually includes 7% VAT', 'medium', 'Thailand Revenue Department', 'https://www.rd.go.th/english/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('ID', 'VAT', 11::numeric, 12::numeric, FALSE, 'VAT 规则需复核', 'VAT treatment needs review', 'medium', 'Indonesia Directorate General of Taxes', 'https://www.pajak.go.id/', 'needs_review', 'VAT 规则近年有调整，最终以结算页为准', 'VAT rules have changed recently; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence because VAT rate/tax base needs review.'),
    ('VN', 'VAT', 10::numeric, 10::numeric, FALSE, '通常含 10% VAT', 'Usually includes 10% VAT', 'medium', 'Vietnam General Department of Taxation', 'https://gdt.gov.vn/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('PK', 'Sales Tax', NULL::numeric, NULL::numeric, TRUE, '销售税因地区不同', 'Sales tax varies by region', 'medium', 'Pakistan Federal Board of Revenue', 'https://fbr.gov.pk/', 'needs_review', '销售税可能因省份或服务分类变化，最终以结算页为准', 'Sales tax may vary by province or service category; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; no single national app-store tax rate is applied.'),

    ('AE', 'VAT', 5::numeric, 5::numeric, FALSE, '含 5% VAT', 'Includes 5% VAT', 'high', 'UAE Federal Tax Authority', 'https://tax.gov.ae/', 'verified', 'App Store 标价通常已含 VAT，最终以结算页为准', 'App Store list price is usually VAT-inclusive; final checkout applies', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common App Store country tax profile.'),
    ('SA', 'VAT', 15::numeric, 15::numeric, FALSE, '含 15% VAT', 'Includes 15% VAT', 'high', 'Saudi Zakat, Tax and Customs Authority', 'https://zatca.gov.sa/en/RulesRegulations/Taxes/Pages/VAT.aspx', 'verified', 'App Store 标价通常已含 VAT，最终以结算页为准', 'App Store list price is usually VAT-inclusive; final checkout applies', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common App Store country tax profile.'),
    ('IL', 'VAT', 18::numeric, 18::numeric, FALSE, '通常含 18% VAT', 'Usually includes 18% VAT', 'medium', 'Israel Tax Authority', 'https://www.gov.il/en/departments/israel_tax_authority', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; VAT rate changed recently, keep medium confidence.'),
    ('ZA', 'VAT', 15::numeric, 15::numeric, FALSE, '含 15% VAT', 'Includes 15% VAT', 'high', 'South African Revenue Service', 'https://www.sars.gov.za/types-of-tax/value-added-tax/', 'verified', 'App Store 标价通常已含 VAT，最终以结算页为准', 'App Store list price is usually VAT-inclusive; final checkout applies', '2026-10-01T00:00:00Z'::timestamptz, 'synced', 'Common App Store country tax profile.'),
    ('EG', 'VAT', 14::numeric, 14::numeric, FALSE, '通常含 14% VAT', 'Usually includes 14% VAT', 'medium', 'Egyptian Tax Authority', 'https://eta.gov.eg/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('KE', 'VAT', 16::numeric, 16::numeric, FALSE, '通常含 16% VAT', 'Usually includes 16% VAT', 'medium', 'Kenya Revenue Authority', 'https://www.kra.go.ke/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.'),
    ('NG', 'VAT', 7.5::numeric, 7.5::numeric, FALSE, '通常含 7.5% VAT', 'Usually includes 7.5% VAT', 'medium', 'Nigeria Federal Inland Revenue Service', 'https://www.firs.gov.ng/', 'needs_review', '通常已含 VAT，最终以结算页为准', 'Usually VAT-inclusive; final checkout applies', '2026-08-31T00:00:00Z'::timestamptz, 'needs_review', 'Common App Store country tax profile; keep medium confidence pending country-specific review.')
)
SELECT upsert_country_tax_profile(
  country_code,
  tax_type,
  rate_min,
  rate_max,
  TRUE,
  is_variable_by_region,
  display_note_zh,
  display_note_en,
  confidence,
  source_label,
  source_url,
  CURRENT_DATE,
  CASE
    WHEN is_variable_by_region THEN 'varies_by_region'
    ELSE 'included_likely'
  END,
  'do_not_calculate',
  review_status,
  frontend_note_zh,
  frontend_note_en,
  'official',
  CURRENT_DATE,
  next_review_at,
  sync_status,
  sync_note,
  jsonb_build_object(
    'seed', '038_common_app_store_tax_profiles',
    'country_code', country_code,
    'price_policy', 'do_not_calculate'
  )
)
FROM profiles;
