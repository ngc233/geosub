INSERT INTO countries (id, code, name_zh, name_en, currency, region, is_reference, sort_order, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'CN', '中国大陆', 'China Mainland', 'CNY', 'Asia', FALSE, 190, NOW(), NOW()),
  (gen_random_uuid(), 'PK', '巴基斯坦', 'Pakistan', 'PKR', 'Asia', FALSE, 250, NOW(), NOW()),
  (gen_random_uuid(), 'EG', '埃及', 'Egypt', 'EGP', 'Africa', FALSE, 320, NOW(), NOW()),
  (gen_random_uuid(), 'NG', '尼日利亚', 'Nigeria', 'NGN', 'Africa', FALSE, 340, NOW(), NOW()),
  (gen_random_uuid(), 'KE', '肯尼亚', 'Kenya', 'KES', 'Africa', FALSE, 350, NOW(), NOW()),
  (gen_random_uuid(), 'SA', '沙特阿拉伯', 'Saudi Arabia', 'SAR', 'Middle East', FALSE, 360, NOW(), NOW()),
  (gen_random_uuid(), 'IL', '以色列', 'Israel', 'ILS', 'Middle East', FALSE, 370, NOW(), NOW()),
  (gen_random_uuid(), 'IE', '爱尔兰', 'Ireland', 'EUR', 'Europe', FALSE, 380, NOW(), NOW()),
  (gen_random_uuid(), 'AT', '奥地利', 'Austria', 'EUR', 'Europe', FALSE, 390, NOW(), NOW()),
  (gen_random_uuid(), 'BE', '比利时', 'Belgium', 'EUR', 'Europe', FALSE, 400, NOW(), NOW()),
  (gen_random_uuid(), 'FI', '芬兰', 'Finland', 'EUR', 'Europe', FALSE, 410, NOW(), NOW()),
  (gen_random_uuid(), 'PT', '葡萄牙', 'Portugal', 'EUR', 'Europe', FALSE, 420, NOW(), NOW()),
  (gen_random_uuid(), 'CZ', '捷克', 'Czechia', 'CZK', 'Europe', FALSE, 430, NOW(), NOW()),
  (gen_random_uuid(), 'HU', '匈牙利', 'Hungary', 'HUF', 'Europe', FALSE, 440, NOW(), NOW()),
  (gen_random_uuid(), 'RO', '罗马尼亚', 'Romania', 'RON', 'Europe', FALSE, 450, NOW(), NOW()),
  (gen_random_uuid(), 'GR', '希腊', 'Greece', 'EUR', 'Europe', FALSE, 460, NOW(), NOW()),
  (gen_random_uuid(), 'UA', '乌克兰', 'Ukraine', 'UAH', 'Europe', FALSE, 470, NOW(), NOW()),
  (gen_random_uuid(), 'PE', '秘鲁', 'Peru', 'PEN', 'South America', FALSE, 480, NOW(), NOW()),
  (gen_random_uuid(), 'UY', '乌拉圭', 'Uruguay', 'UYU', 'South America', FALSE, 490, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  currency = EXCLUDED.currency,
  region = EXCLUDED.region,
  is_reference = CASE WHEN countries.code = 'US' THEN TRUE ELSE countries.is_reference END,
  sort_order = COALESCE(countries.sort_order, EXCLUDED.sort_order),
  updated_at = NOW();
