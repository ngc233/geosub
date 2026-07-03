-- GeoSub seed data: ChatGPT sample product

WITH product_insert AS (
  INSERT INTO products (
    slug,
    name,
    category,
    provider,
    logo_url,
    description,
    official_url,
    status,
    featured,
    sort_order
  )
  VALUES (
    'chatgpt',
    'ChatGPT',
    'ai',
    'OpenAI',
    'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/22/59/ed/2259edf9-6bd5-a17a-c035-074aac0954d2/AppIcon-0-0-1x_U007epad-0-0-0-1-0-P3-85-220.png/512x512bb.jpg',
    'ChatGPT 是 OpenAI 提供的 AI 助手服务，本页面用于比较 ChatGPT Plus / Pro 在不同国家和地区的订阅价格差异。',
    'https://chat.openai.com/',
    'published',
    true,
    1
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    provider = EXCLUDED.provider,
    logo_url = EXCLUDED.logo_url,
    description = EXCLUDED.description,
    official_url = EXCLUDED.official_url,
    status = EXCLUDED.status,
    featured = EXCLUDED.featured,
    sort_order = EXCLUDED.sort_order
  RETURNING id
),

plus_plan AS (
  INSERT INTO plans (
    product_id,
    slug,
    name,
    billing_cycle,
    description,
    status,
    sort_order
  )
  SELECT
    id,
    'plus',
    'Plus',
    'monthly',
    '适合个人用户的月度订阅套餐。',
    'published',
    1
  FROM product_insert
  ON CONFLICT (product_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    billing_cycle = EXCLUDED.billing_cycle,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order
  RETURNING id, product_id
),

pro_plan AS (
  INSERT INTO plans (
    product_id,
    slug,
    name,
    billing_cycle,
    description,
    status,
    sort_order
  )
  SELECT
    id,
    'pro',
    'Pro',
    'monthly',
    '面向高频使用者的高级订阅套餐。',
    'published',
    2
  FROM product_insert
  ON CONFLICT (product_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    billing_cycle = EXCLUDED.billing_cycle,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order
  RETURNING id, product_id
),

source_insert AS (
  INSERT INTO price_sources (
    source_key,
    name,
    source_level,
    type,
    provider,
    base_url,
    requires_javascript,
    requires_account,
    requires_geo,
    terms_risk,
    reliability_score,
    status,
    note
  )
  VALUES (
    'openai_public_pricing_manual',
    'OpenAI 公开价格资料 / 人工整理',
    'B',
    'manual',
    'OpenAI',
    'https://openai.com/',
    false,
    false,
    false,
    'low',
    80,
    'active',
    '开发阶段测试来源。正式上线前需要替换为可追溯的官方页面、结账页或人工复核记录。'
  )
  ON CONFLICT (source_key) DO UPDATE SET
    name = EXCLUDED.name,
    source_level = EXCLUDED.source_level,
    type = EXCLUDED.type,
    provider = EXCLUDED.provider,
    base_url = EXCLUDED.base_url,
    reliability_score = EXCLUDED.reliability_score,
    status = EXCLUDED.status,
    note = EXCLUDED.note
  RETURNING id
),

price_rows AS (
  SELECT
    plus_plan.product_id AS product_id,
    plus_plan.id AS plan_id,
    countries.id AS country_id,
    data.local_price,
    data.currency,
    data.price_usd,
    20.00::numeric AS us_base_price,
    ROUND(((data.price_usd - 20.00) / 20.00) * 100, 2) AS diff_vs_us_percent,
    data.tax_note,
    data.availability_note,
    source_insert.id AS source_id,
    data.confidence_score,
    data.data_quality,
    data.status
  FROM plus_plan
  CROSS JOIN source_insert
  JOIN (
    VALUES
      ('US', 20.00::numeric, 'USD', 20.00::numeric, '美国基准价格，税费可能因州而异。', '作为统一基准，仅用于价格差异比较。', 95, 'verified', 'published'),
      ('PH', 1120.00::numeric, 'PHP', 19.10::numeric, '以页面显示为准，税费可能已包含。', '价格较接近美国，适合观察低价区。', 82, 'estimated', 'published'),
      ('JP', 3000.00::numeric, 'JPY', 19.20::numeric, '可能含日本消费税。', '价格接近美国。', 82, 'estimated', 'published'),
      ('IN', 1999.00::numeric, 'INR', 23.95::numeric, '本地税费可能随平台变化。', '价格略高于美国。', 78, 'estimated', 'published'),
      ('GB', 20.00::numeric, 'GBP', 25.30::numeric, '英国价格可能含 VAT。', '价格高于美国。', 80, 'estimated', 'published'),
      ('DE', 22.99::numeric, 'EUR', 24.80::numeric, '欧盟价格通常可能含 VAT。', '价格高于美国。', 80, 'estimated', 'published'),
      ('DK', 179.00::numeric, 'DKK', 25.75::numeric, '本地税费可能已包含。', '价格高于美国。', 78, 'estimated', 'published'),
      ('CA', 27.00::numeric, 'CAD', 19.80::numeric, '加拿大税费可能按省份不同。', '价格接近美国。', 80, 'estimated', 'published'),
      ('AU', 33.00::numeric, 'AUD', 21.75::numeric, '澳大利亚价格可能含 GST。', '价格略高于美国。', 80, 'estimated', 'published'),
      ('SG', 27.00::numeric, 'SGD', 20.00::numeric, '新加坡价格可能含 GST。', '价格接近美国。', 80, 'estimated', 'published')
  ) AS data(code, local_price, currency, price_usd, tax_note, availability_note, confidence_score, data_quality, status)
  ON TRUE
  JOIN countries ON countries.code = data.code
)

INSERT INTO region_prices (
  product_id,
  plan_id,
  country_id,
  local_price,
  currency,
  price_usd,
  us_base_price,
  diff_vs_us_percent,
  billing_platform,
  price_type,
  tax_note,
  availability_note,
  source_summary,
  primary_source_id,
  confidence_score,
  data_quality,
  status,
  last_checked_at,
  published_at
)
SELECT
  product_id,
  plan_id,
  country_id,
  local_price,
  currency,
  price_usd,
  us_base_price,
  diff_vs_us_percent,
  'web',
  'list_price',
  tax_note,
  availability_note,
  '开发阶段测试数据，正式上线前需替换为可追溯来源。',
  source_id,
  confidence_score,
  data_quality,
  status,
  NOW(),
  NOW()
FROM price_rows
ON CONFLICT (plan_id, country_id, billing_platform, price_type) DO UPDATE SET
  local_price = EXCLUDED.local_price,
  currency = EXCLUDED.currency,
  price_usd = EXCLUDED.price_usd,
  us_base_price = EXCLUDED.us_base_price,
  diff_vs_us_percent = EXCLUDED.diff_vs_us_percent,
  tax_note = EXCLUDED.tax_note,
  availability_note = EXCLUDED.availability_note,
  source_summary = EXCLUDED.source_summary,
  primary_source_id = EXCLUDED.primary_source_id,
  confidence_score = EXCLUDED.confidence_score,
  data_quality = EXCLUDED.data_quality,
  status = EXCLUDED.status,
  last_checked_at = EXCLUDED.last_checked_at,
  published_at = EXCLUDED.published_at;

-- SEO metadata
INSERT INTO seo_meta (
  product_id,
  locale,
  title,
  description,
  h1,
  canonical_url,
  status
)
SELECT
  products.id,
  'zh',
  'ChatGPT Plus 各地区价格对比：哪个国家最便宜？- GeoSub',
  '查看 ChatGPT Plus 在美国、菲律宾、日本、德国、英国等地区的价格差异，基于美国价格计算各国订阅成本。',
  'ChatGPT Plus 全球价格对比',
  '/zh/ai-pricing/chatgpt/',
  'published'
FROM products
WHERE products.slug = 'chatgpt';

-- FAQ
INSERT INTO faqs (
  product_id,
  locale,
  question,
  answer,
  sort_order,
  status
)
SELECT
  products.id,
  'zh',
  item.question,
  item.answer,
  item.sort_order,
  'published'
FROM products
JOIN (
  VALUES
    (
      'ChatGPT Plus 哪个国家最便宜？',
      '不同国家和地区的价格会受到本地定价、税费和汇率影响。本页面以美国价格作为统一基准，展示各地区相对美国的价格差异。',
      1
    ),
    (
      '为什么 GeoSub 使用美国作为基准？',
      '美国价格通常更容易作为全球订阅价格的统一参照，因此 GeoSub 默认使用美国价格计算其他地区便宜或贵多少。',
      2
    ),
    (
      '这些价格是否包含税费？',
      '不同地区的税费规则不同，有些价格可能已经包含税费，有些可能在结账时另行计算。页面中的税费说明会根据数据来源进行标注。',
      3
    ),
    (
      '价格数据多久更新一次？',
      'AI 和流媒体订阅价格通常不需要每天更新，后续 GeoSub 会通过官方来源、采集任务和人工审核定期刷新数据。',
      4
    )
) AS item(question, answer, sort_order)
ON TRUE
WHERE products.slug = 'chatgpt';

-- Affiliate placeholder
INSERT INTO affiliate_links (
  product_id,
  category,
  title,
  description,
  button_text,
  url,
  placement,
  locale,
  priority,
  status
)
SELECT
  products.id,
  'official',
  '访问 ChatGPT 官方页面',
  '前往官方页面查看 ChatGPT 当前订阅信息。',
  '查看官方页面',
  'https://chat.openai.com/',
  'product_after_map',
  'zh',
  10,
  'published'
FROM products
WHERE products.slug = 'chatgpt';
