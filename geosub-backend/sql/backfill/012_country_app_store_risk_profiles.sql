-- GeoSub backfill migration. Split from sql/029_country_app_store_risk_profiles.sql; see migration-layout.json.

WITH seed(code, risk_level, note_en, requirements_en, confidence) AS (
  VALUES
    ('AU', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require an Australian Apple ID, local payment method, or gift card.', 'medium'),
    ('BR', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Brazilian Apple ID, local payment method, or gift card.', 'medium'),
    ('CA', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Canadian Apple ID, local payment method, or gift card.', 'medium'),
    ('DE', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a German Apple ID, local payment method, or gift card.', 'medium'),
    ('DK', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Danish Apple ID, local payment method, or gift card.', 'medium'),
    ('GB', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a UK Apple ID, local payment method, or gift card.', 'medium'),
    ('IN', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require an Indian Apple ID, local payment method, or gift card.', 'medium'),
    ('JP', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Japanese Apple ID, local payment method, or gift card.', 'medium'),
    ('KR', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Korean Apple ID, local payment method, or gift card.', 'medium'),
    ('MX', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Mexican Apple ID, local payment method, or gift card.', 'medium'),
    ('PH', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Philippine Apple ID, local payment method, or gift card.', 'medium'),
    ('PK', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Pakistan Apple ID, local payment method, or gift card.', 'medium'),
    ('SG', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Singapore Apple ID, local payment method, or gift card.', 'medium'),
    ('TR', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a Turkish Apple ID, local payment method, or gift card.', 'medium'),
    ('US', 'medium', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', 'May require a US Apple ID, local payment method, or gift card.', 'medium')
)
INSERT INTO country_app_store_risk_profiles (
  country_id,
  risk_level,
  display_note_zh,
  display_note_en,
  requirements_zh,
  requirements_en,
  confidence,
  source_label,
  source_url,
  verified_at,
  status
)
SELECT
  countries.id,
  seed.risk_level,
  seed.note_en,
  seed.note_en,
  seed.requirements_en,
  seed.requirements_en,
  seed.confidence,
  'Apple Media Services Terms',
  'https://www.apple.com/legal/internet-services/itunes/',
  DATE '2026-06-30',
  'active'
FROM seed
JOIN countries ON countries.code = seed.code
ON CONFLICT (country_id) DO UPDATE SET
  risk_level = EXCLUDED.risk_level,
  display_note_zh = EXCLUDED.display_note_zh,
  display_note_en = EXCLUDED.display_note_en,
  requirements_zh = EXCLUDED.requirements_zh,
  requirements_en = EXCLUDED.requirements_en,
  confidence = EXCLUDED.confidence,
  source_label = EXCLUDED.source_label,
  source_url = EXCLUDED.source_url,
  verified_at = EXCLUDED.verified_at,
  status = EXCLUDED.status,
  updated_at = NOW();
