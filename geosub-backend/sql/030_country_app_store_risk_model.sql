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

WITH seed(code, risk_level, score, factors_en, note_en, requirements_en, confidence) AS (
  VALUES
    ('AU', 'low', 34, 'Mature App Store storefront; main risk is matching account region and payment method.', 'Cross-region subscription risk is relatively low, but final availability depends on App Store checkout.', 'May require an Australian Apple ID, local payment method, or gift card.', 'medium'),
    ('BR', 'low', 42, 'Mature App Store coverage; state tax variation adds minor checkout uncertainty.', 'Cross-region risk is low to medium; tax and payment requirements depend on checkout.', 'May require a Brazilian Apple ID, local payment method, or gift card.', 'medium'),
    ('CA', 'low', 38, 'Mature App Store storefront; provincial tax variation adds minor checkout uncertainty.', 'Cross-region risk is relatively low, but provincial taxes may vary.', 'May require a Canadian Apple ID, local payment method, or gift card.', 'medium'),
    ('DE', 'low', 34, 'Mature App Store storefront with relatively stable price and tax rules.', 'Cross-region risk is relatively low, but account region and payment method still apply.', 'May require a German Apple ID, local payment method, or gift card.', 'medium'),
    ('DK', 'low', 34, 'Mature App Store storefront with relatively stable price and tax rules.', 'Cross-region risk is relatively low, but account region and payment method still apply.', 'May require a Danish Apple ID, local payment method, or gift card.', 'medium'),
    ('FR', 'low', 34, 'Mature App Store storefront with relatively stable price and tax rules.', 'Cross-region risk is relatively low, but account region and payment method still apply.', 'May require a French Apple ID, local payment method, or gift card.', 'medium'),
    ('GB', 'low', 34, 'Mature App Store storefront with relatively stable price and tax rules.', 'Cross-region risk is relatively low, but account region and payment method still apply.', 'May require a UK Apple ID, local payment method, or gift card.', 'medium'),
    ('IN', 'low', 44, 'Price-sensitive storefront; payment method and billing details can add friction.', 'Cross-region risk is low to medium; rely on checkout completion.', 'May require an Indian Apple ID, local payment method, or gift card.', 'medium'),
    ('JP', 'low', 32, 'Mature App Store storefront with relatively stable price and tax rules.', 'Cross-region risk is relatively low, but account region and payment method still apply.', 'May require a Japanese Apple ID, local payment method, or gift card.', 'medium'),
    ('KR', 'low', 38, 'Mature App Store storefront; cross-region use may still depend on local payment methods.', 'Cross-region risk is relatively low, but payment requirements depend on checkout.', 'May require a Korean Apple ID, local payment method, or gift card.', 'medium'),
    ('MX', 'low', 40, 'Mature App Store coverage; higher price is mainly a cost issue rather than high platform risk.', 'Cross-region risk is low to medium; account region and payment method still apply.', 'May require a Mexican Apple ID, local payment method, or gift card.', 'medium'),
    ('PH', 'low', 38, 'Meaningful price advantage but still a common App Store storefront; main risk is payment and account region.', 'Cross-region risk is low to medium; final availability depends on checkout completion.', 'May require a Philippine Apple ID, local payment method, or gift card.', 'medium'),
    ('SG', 'low', 34, 'Mature App Store storefront with relatively stable price and tax rules.', 'Cross-region risk is relatively low, but account region and payment method still apply.', 'May require a Singapore Apple ID, local payment method, or gift card.', 'medium'),
    ('US', 'low', 34, 'Reference storefront; state taxes vary and cross-region use still depends on account and payment match.', 'Cross-region risk is relatively low, but state tax and payment requirements depend on checkout.', 'May require a US Apple ID, local payment method, or gift card.', 'medium'),
    ('AR', 'medium', 64, 'Price-sensitive storefront; cross-region subscription is more likely to be affected by payment, billing details, or platform risk controls.', 'Cross-region risk is medium; public price should be treated as reference and subscription completion is not guaranteed.', 'May require an Argentinian Apple ID, local payment method, billing details, or gift card.', 'medium'),
    ('TR', 'medium', 62, 'Price-sensitive storefront; cross-region subscription is more likely to be affected by payment, billing details, or platform risk controls.', 'Cross-region risk is medium; public price should be treated as reference and subscription completion is not guaranteed.', 'May require a Turkish Apple ID, local payment method, billing details, or gift card.', 'medium')
)
INSERT INTO country_app_store_risk_profiles (
  country_id,
  risk_level,
  base_risk_score,
  model_version,
  risk_factors_zh,
  risk_factors_en,
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
  seed.score,
  'app-store-risk-v2',
  seed.factors_en,
  seed.factors_en,
  seed.note_en,
  seed.note_en,
  seed.requirements_en,
  seed.requirements_en,
  seed.confidence,
  'GeoSub rule model + Apple Media Services Terms',
  'https://www.apple.com/legal/internet-services/itunes/',
  DATE '2026-06-30',
  'active'
FROM seed
JOIN countries ON countries.code = seed.code
ON CONFLICT (country_id) DO UPDATE SET
  risk_level = EXCLUDED.risk_level,
  base_risk_score = EXCLUDED.base_risk_score,
  model_version = EXCLUDED.model_version,
  risk_factors_zh = EXCLUDED.risk_factors_zh,
  risk_factors_en = EXCLUDED.risk_factors_en,
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
