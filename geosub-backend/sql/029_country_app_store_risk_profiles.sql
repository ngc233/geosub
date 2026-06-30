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

WITH seed(code, risk_level, note_zh, note_en, requirements_zh, requirements_en, confidence, source_label, source_url) AS (
  VALUES
    ('AU', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要澳大利亚 Apple ID、当地付款方式或礼品卡。', 'May require an Australian Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('BR', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要巴西 Apple ID、当地付款方式或礼品卡。', 'May require a Brazilian Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('CA', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要加拿大 Apple ID、当地付款方式或礼品卡。', 'May require a Canadian Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('DE', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要德国 Apple ID、当地付款方式或礼品卡。', 'May require a German Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('DK', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要丹麦 Apple ID、当地付款方式或礼品卡。', 'May require a Danish Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('GB', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要英国 Apple ID、当地付款方式或礼品卡。', 'May require a UK Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('IN', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要印度 Apple ID、当地付款方式或礼品卡。', 'May require an Indian Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('JP', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要日本 Apple ID、当地付款方式或礼品卡。', 'May require a Japanese Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('KR', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要韩国 Apple ID、当地付款方式或礼品卡。', 'May require a Korean Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('MX', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要墨西哥 Apple ID、当地付款方式或礼品卡。', 'May require a Mexican Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('PH', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要菲律宾 Apple ID、当地付款方式或礼品卡。', 'May require a Philippine Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('PK', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要巴基斯坦 Apple ID、当地付款方式或礼品卡。', 'May require a Pakistan Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('SG', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要新加坡 Apple ID、当地付款方式或礼品卡。', 'May require a Singapore Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('TR', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要土耳其 Apple ID、当地付款方式或礼品卡。', 'May require a Turkish Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/'),
    ('US', 'medium', '跨区订阅通常需要对应地区 Apple ID、付款方式或礼品卡，最终以 App Store 结算页为准。', 'Cross-region subscription may require a matching Apple ID, payment method, or gift card. Final availability depends on App Store checkout.', '可能需要美国 Apple ID、当地付款方式或礼品卡。', 'May require a US Apple ID, local payment method, or gift card.', 'medium', 'Apple Media Services Terms', 'https://www.apple.com/legal/internet-services/itunes/')
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
  seed.note_zh,
  seed.note_en,
  seed.requirements_zh,
  seed.requirements_en,
  seed.confidence,
  seed.source_label,
  seed.source_url,
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
