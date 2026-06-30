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

WITH seed(code, risk_level, score, factors_zh, factors_en, note_zh, note_en, requirements_zh, requirements_en, confidence) AS (
  VALUES
    ('AU', 'low', 34, '成熟 App Store 地区；主要风险来自跨区账号和付款方式匹配。', 'Mature App Store storefront; main risk is matching account region and payment method.', '跨区订阅风险较低，但仍需以 App Store 结算页为准。', 'Cross-region subscription risk is relatively low, but final availability depends on App Store checkout.', '可能需要澳大利亚 Apple ID、当地付款方式或礼品卡。', 'May require an Australian Apple ID, local payment method, or gift card.', 'medium'),
    ('BR', 'low', 42, 'App Store 覆盖成熟；州税差异会增加一点结算不确定性。', 'Mature App Store coverage; state tax variation adds minor checkout uncertainty.', '跨区订阅风险较低到中等，税费和付款方式需以结算页为准。', 'Cross-region risk is low to medium; tax and payment requirements depend on checkout.', '可能需要巴西 Apple ID、当地付款方式或礼品卡。', 'May require a Brazilian Apple ID, local payment method, or gift card.', 'medium'),
    ('CA', 'low', 38, '成熟 App Store 地区；省税差异会增加一点结算不确定性。', 'Mature App Store storefront; provincial tax variation adds minor checkout uncertainty.', '跨区订阅风险较低，但不同省份税费可能不同。', 'Cross-region risk is relatively low, but provincial taxes may vary.', '可能需要加拿大 Apple ID、当地付款方式或礼品卡。', 'May require a Canadian Apple ID, local payment method, or gift card.', 'medium'),
    ('DE', 'low', 34, '成熟 App Store 地区；价格和税费规则相对稳定。', 'Mature App Store storefront with relatively stable price and tax rules.', '跨区订阅风险较低，但仍受账号地区和付款方式影响。', 'Cross-region risk is relatively low, but account region and payment method still apply.', '可能需要德国 Apple ID、当地付款方式或礼品卡。', 'May require a German Apple ID, local payment method, or gift card.', 'medium'),
    ('DK', 'low', 34, '成熟 App Store 地区；价格和税费规则相对稳定。', 'Mature App Store storefront with relatively stable price and tax rules.', '跨区订阅风险较低，但仍受账号地区和付款方式影响。', 'Cross-region risk is relatively low, but account region and payment method still apply.', '可能需要丹麦 Apple ID、当地付款方式或礼品卡。', 'May require a Danish Apple ID, local payment method, or gift card.', 'medium'),
    ('FR', 'low', 34, '成熟 App Store 地区；价格和税费规则相对稳定。', 'Mature App Store storefront with relatively stable price and tax rules.', '跨区订阅风险较低，但仍受账号地区和付款方式影响。', 'Cross-region risk is relatively low, but account region and payment method still apply.', '可能需要法国 Apple ID、当地付款方式或礼品卡。', 'May require a French Apple ID, local payment method, or gift card.', 'medium'),
    ('GB', 'low', 34, '成熟 App Store 地区；价格和税费规则相对稳定。', 'Mature App Store storefront with relatively stable price and tax rules.', '跨区订阅风险较低，但仍受账号地区和付款方式影响。', 'Cross-region risk is relatively low, but account region and payment method still apply.', '可能需要英国 Apple ID、当地付款方式或礼品卡。', 'May require a UK Apple ID, local payment method, or gift card.', 'medium'),
    ('IN', 'low', 44, '价格相对敏感；跨区付款方式和账单资料可能带来额外摩擦。', 'Price-sensitive storefront; payment method and billing details can add friction.', '跨区订阅风险较低到中等，建议以结算页能否完成为准。', 'Cross-region risk is low to medium; rely on checkout completion.', '可能需要印度 Apple ID、当地付款方式或礼品卡。', 'May require an Indian Apple ID, local payment method, or gift card.', 'medium'),
    ('JP', 'low', 32, '成熟 App Store 地区；价格和税费规则相对稳定。', 'Mature App Store storefront with relatively stable price and tax rules.', '跨区订阅风险较低，但仍受账号地区和付款方式影响。', 'Cross-region risk is relatively low, but account region and payment method still apply.', '可能需要日本 Apple ID、当地付款方式或礼品卡。', 'May require a Japanese Apple ID, local payment method, or gift card.', 'medium'),
    ('KR', 'low', 38, '成熟 App Store 地区；跨区时仍可能受本地付款方式影响。', 'Mature App Store storefront; cross-region use may still depend on local payment methods.', '跨区订阅风险较低，但付款方式需以结算页为准。', 'Cross-region risk is relatively low, but payment requirements depend on checkout.', '可能需要韩国 Apple ID、当地付款方式或礼品卡。', 'May require a Korean Apple ID, local payment method, or gift card.', 'medium'),
    ('MX', 'low', 40, 'App Store 覆盖成熟；价格较美国偏高时主要是成本问题，不是高风控。', 'Mature App Store coverage; higher price is mainly a cost issue rather than high platform risk.', '跨区订阅风险较低到中等，仍需匹配账号地区和付款方式。', 'Cross-region risk is low to medium; account region and payment method still apply.', '可能需要墨西哥 Apple ID、当地付款方式或礼品卡。', 'May require a Mexican Apple ID, local payment method, or gift card.', 'medium'),
    ('PH', 'low', 38, '价格优势明显，但仍属于常见 App Store 地区；主要风险来自付款方式和账号地区。', 'Meaningful price advantage but still a common App Store storefront; main risk is payment and account region.', '跨区订阅风险较低到中等，最终以结算页可完成为准。', 'Cross-region risk is low to medium; final availability depends on checkout completion.', '可能需要菲律宾 Apple ID、当地付款方式或礼品卡。', 'May require a Philippine Apple ID, local payment method, or gift card.', 'medium'),
    ('SG', 'low', 34, '成熟 App Store 地区；价格和税费规则相对稳定。', 'Mature App Store storefront with relatively stable price and tax rules.', '跨区订阅风险较低，但仍受账号地区和付款方式影响。', 'Cross-region risk is relatively low, but account region and payment method still apply.', '可能需要新加坡 Apple ID、当地付款方式或礼品卡。', 'May require a Singapore Apple ID, local payment method, or gift card.', 'medium'),
    ('US', 'low', 34, '基准地区；税费按州变化，跨区时仍需匹配账号地区和付款方式。', 'Reference storefront; state taxes vary and cross-region use still depends on account and payment match.', '跨区订阅风险较低，但不同州税费和付款方式需以结算页为准。', 'Cross-region risk is relatively low, but state tax and payment requirements depend on checkout.', '可能需要美国 Apple ID、当地付款方式或礼品卡。', 'May require a US Apple ID, local payment method, or gift card.', 'medium'),
    ('AR', 'medium', 64, '价格敏感地区；跨区订阅更容易受到付款方式、账单资料或平台风控影响。', 'Price-sensitive storefront; cross-region subscription is more likely to be affected by payment, billing details, or platform risk controls.', '跨区订阅风险中等，建议仅把公开价格作为参考，不保证可完成订阅。', 'Cross-region risk is medium; public price should be treated as reference and subscription completion is not guaranteed.', '可能需要阿根廷 Apple ID、当地付款方式、账单资料或礼品卡。', 'May require an Argentinian Apple ID, local payment method, billing details, or gift card.', 'medium'),
    ('TR', 'medium', 62, '价格敏感地区；跨区订阅更容易受到付款方式、账单资料或平台风控影响。', 'Price-sensitive storefront; cross-region subscription is more likely to be affected by payment, billing details, or platform risk controls.', '跨区订阅风险中等，建议仅把公开价格作为参考，不保证可完成订阅。', 'Cross-region risk is medium; public price should be treated as reference and subscription completion is not guaranteed.', '可能需要土耳其 Apple ID、当地付款方式、账单资料或礼品卡。', 'May require a Turkish Apple ID, local payment method, billing details, or gift card.', 'medium')
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
  'app-store-risk-v1',
  seed.factors_zh,
  seed.factors_en,
  seed.note_zh,
  seed.note_en,
  seed.requirements_zh,
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
