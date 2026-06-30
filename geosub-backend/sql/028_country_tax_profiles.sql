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

WITH seed(code, tax_type, rate_min, rate_max, variable, note_zh, note_en, confidence, source_label, source_url) AS (
  VALUES
    ('AU', 'GST', 10.0, 10.0, FALSE, '含 10% GST', 'Includes 10% GST', 'high', 'Australian Taxation Office', 'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst'),
    ('BR', 'ICMS', 7.0, 25.0, TRUE, '州税（ICMS）不同', 'State ICMS varies', 'medium', 'Brazil tax profile', 'https://www.gov.br/receitafederal/'),
    ('CA', 'GST/HST/PST', 5.0, 15.0, TRUE, '各省 5-15% GST/HST 不同', 'GST/HST varies by province, 5-15%', 'high', 'Canada Revenue Agency', 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html'),
    ('DE', 'VAT', 19.0, 19.0, FALSE, '含 19% 增值税', 'Includes 19% VAT', 'high', 'European Commission VAT rates', 'https://taxation-customs.ec.europa.eu/taxation/vat/vat-rules-and-rates_en'),
    ('DK', 'VAT', 25.0, 25.0, FALSE, '含 25% 增值税', 'Includes 25% VAT', 'high', 'European Commission VAT rates', 'https://taxation-customs.ec.europa.eu/taxation/vat/vat-rules-and-rates_en'),
    ('GB', 'VAT', 20.0, 20.0, FALSE, '含 20% 增值税', 'Includes 20% VAT', 'high', 'UK VAT rates', 'https://www.gov.uk/vat-rates'),
    ('IN', 'GST', 18.0, 18.0, FALSE, '含 18% GST', 'Includes 18% GST', 'medium', 'India GST portal', 'https://www.gst.gov.in/'),
    ('JP', 'Consumption Tax', 10.0, 10.0, FALSE, '含 10% 消费税', 'Includes 10% consumption tax', 'high', 'Japan National Tax Agency', 'https://www.nta.go.jp/english/taxes/consumption_tax/index.htm'),
    ('KR', 'VAT', 10.0, 10.0, FALSE, '含 10% 增值税', 'Includes 10% VAT', 'high', 'Korea National Tax Service', 'https://www.nts.go.kr/english/main.do'),
    ('MX', 'VAT', 16.0, 16.0, FALSE, '含 16% 增值税', 'Includes 16% VAT', 'medium', 'Mexico SAT', 'https://www.sat.gob.mx/'),
    ('PH', 'VAT', 12.0, 12.0, FALSE, '含 12% 增值税', 'Includes 12% VAT', 'high', 'Philippines BIR', 'https://www.bir.gov.ph/'),
    ('SG', 'GST', 9.0, 9.0, FALSE, '含 9% GST', 'Includes 9% GST', 'high', 'Singapore IRAS', 'https://www.iras.gov.sg/taxes/goods-services-tax-(gst)'),
    ('TR', 'VAT', 20.0, 20.0, FALSE, '含 20% 增值税', 'Includes 20% VAT', 'medium', 'Turkey Revenue Administration', 'https://www.gib.gov.tr/'),
    ('US', 'Sales Tax', 0.0, 10.0, TRUE, '各州销售税不同', 'Sales tax varies by state', 'high', 'State sales tax varies', 'https://www.usa.gov/state-taxes')
)
INSERT INTO country_tax_profiles (
  country_id,
  tax_type,
  rate_min,
  rate_max,
  is_variable_by_region,
  display_note_zh,
  display_note_en,
  confidence,
  source_label,
  source_url,
  verified_at,
  status
)
SELECT
  countries.id,
  seed.tax_type,
  seed.rate_min,
  seed.rate_max,
  seed.variable,
  seed.note_zh,
  seed.note_en,
  seed.confidence,
  seed.source_label,
  seed.source_url,
  DATE '2026-06-30',
  'active'
FROM seed
JOIN countries ON countries.code = seed.code
ON CONFLICT (country_id) DO UPDATE SET
  tax_type = EXCLUDED.tax_type,
  rate_min = EXCLUDED.rate_min,
  rate_max = EXCLUDED.rate_max,
  is_variable_by_region = EXCLUDED.is_variable_by_region,
  display_note_zh = EXCLUDED.display_note_zh,
  display_note_en = EXCLUDED.display_note_en,
  confidence = EXCLUDED.confidence,
  source_label = EXCLUDED.source_label,
  source_url = EXCLUDED.source_url,
  verified_at = EXCLUDED.verified_at,
  status = EXCLUDED.status,
  updated_at = NOW();
