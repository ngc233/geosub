-- GeoSub backfill migration. Split from sql/073_product_seo_content_quality.sql; see migration-layout.json.

-- Fill the remaining published-product SEO gaps and prevent duplicate
-- product-level metadata from making an older draft win nondeterministically.

WITH ranked_product_seo AS (
  SELECT
    seo.id,
    ROW_NUMBER() OVER (
      PARTITION BY
        seo.product_id,
        COALESCE(
          seo.plan_id,
          '00000000-0000-0000-0000-000000000000'::uuid
        ),
        seo.locale
      ORDER BY
        (seo.status = 'published') DESC,
        (
          (CASE WHEN LENGTH(BTRIM(seo.title)) >= 10 THEN 1 ELSE 0 END) +
          (CASE WHEN LENGTH(BTRIM(COALESCE(seo.description, ''))) >= 70 THEN 1 ELSE 0 END) +
          (CASE WHEN LENGTH(BTRIM(COALESCE(seo.h1, ''))) >= 10 THEN 1 ELSE 0 END)
        ) DESC,
        seo.updated_at DESC,
        seo.created_at DESC
    ) AS row_number
  FROM seo_meta seo
)
DELETE FROM seo_meta seo
USING ranked_product_seo ranked
WHERE seo.id = ranked.id
  AND ranked.row_number > 1;

WITH product_copy(slug, description) AS (
  VALUES
    (
      'perplexity',
      'Perplexity 是带来源引用的 AI 搜索与研究工具。个人付费层级主要按高级模型、Pro Search、Research、文件与应用创建、上传额度和支持级别区分；API 与企业套餐不纳入本页比较。'
    ),
    (
      'suno',
      'Suno 是面向音乐创作的生成式 AI 服务。个人方案主要按创作额度和商业使用权区分：Basic 适合非商业试用，Pro 和 Premier 面向需要稳定月度积分及商业使用权的创作者。'
    )
)
UPDATE products product
SET
  description = copy.description,
  updated_at = NOW()
FROM product_copy copy
WHERE product.slug = copy.slug
  AND product.description IS DISTINCT FROM copy.description;

WITH plan_copy(product_slug, plan_slug, description) AS (
  VALUES
    (
      'perplexity',
      'pro',
      '面向规律检索、文件分析和深度研究的个人用户，提供更多带引用的搜索、Research、文件上传、图像生成及高级模型访问。'
    ),
    (
      'perplexity',
      'max',
      '面向需要更高使用量、文件与应用创建、最新高级模型和优先支持的研究者、创作者及专业用户。'
    ),
    (
      'suno',
      'basic',
      'Suno 当前将 Basic 定义为非商业试用的免费层；历史 App Store 付费记录不代表新用户仍可购买该订阅。'
    ),
    (
      'suno',
      'pro',
      'Suno 的付费入门层，每月提供 2,500 积分，并为订阅期间创作的歌曲提供商业使用权。'
    ),
    (
      'suno',
      'premier-plan',
      'Suno 的最高月度积分层，每月提供 10,000 积分，适合创作频率较高的专业或重度用户。'
    )
)
UPDATE plans plan
SET
  description = copy.description,
  updated_at = NOW()
FROM products product, plan_copy copy
WHERE plan.product_id = product.id
  AND product.slug = copy.product_slug
  AND plan.slug = copy.plan_slug
  AND plan.description IS DISTINCT FROM copy.description;

WITH desired_seo(
  product_slug,
  title,
  description,
  h1,
  canonical_url
) AS (
  VALUES
    (
      'chatgpt',
      'ChatGPT价格：全球各地区与套餐对比（2026）',
      '比较 ChatGPT Go、Plus 与 Pro 在不同国家和地区的 App Store 月度订阅价格，查看本地货币、美元折算、税费、汇率日期及购买力差异，帮助选择适合自己的套餐和订阅地区。',
      'ChatGPT 全球订阅价格与套餐对比',
      '/zh/ai-pricing/chatgpt'
    ),
    (
      'perplexity',
      'Perplexity价格：Pro与Max全球地区对比（2026）',
      '比较 Perplexity Pro 与 Max 在不同国家和地区的 App Store 月度订阅价格，查看本地货币、美元折算、税费、汇率日期和购买力差异，并了解两个个人套餐的主要区别。',
      'Perplexity Pro与Max全球订阅价格对比',
      '/zh/ai-pricing/perplexity'
    ),
    (
      'suno',
      'Suno价格：Pro与Premier全球地区对比（2026）',
      '比较 Suno Pro 与 Premier 在不同国家和地区的 App Store 月度订阅价格，查看本地货币、美元折算、税费、汇率日期和购买力差异，并了解创作额度与商业使用权的主要区别。',
      'Suno Pro与Premier全球订阅价格对比',
      '/zh/ai-pricing/suno'
    )
)
UPDATE seo_meta seo
SET
  title = desired.title,
  description = desired.description,
  h1 = desired.h1,
  canonical_url = desired.canonical_url,
  status = 'published',
  updated_at = NOW()
FROM products product, desired_seo desired
WHERE seo.product_id = product.id
  AND product.slug = desired.product_slug
  AND seo.plan_id IS NULL
  AND seo.article_id IS NULL
  AND seo.category_id IS NULL
  AND seo.locale = 'zh';

WITH desired_seo(
  product_slug,
  title,
  description,
  h1,
  canonical_url
) AS (
  VALUES
    (
      'chatgpt',
      'ChatGPT价格：全球各地区与套餐对比（2026）',
      '比较 ChatGPT Go、Plus 与 Pro 在不同国家和地区的 App Store 月度订阅价格，查看本地货币、美元折算、税费、汇率日期及购买力差异，帮助选择适合自己的套餐和订阅地区。',
      'ChatGPT 全球订阅价格与套餐对比',
      '/zh/ai-pricing/chatgpt'
    ),
    (
      'perplexity',
      'Perplexity价格：Pro与Max全球地区对比（2026）',
      '比较 Perplexity Pro 与 Max 在不同国家和地区的 App Store 月度订阅价格，查看本地货币、美元折算、税费、汇率日期和购买力差异，并了解两个个人套餐的主要区别。',
      'Perplexity Pro与Max全球订阅价格对比',
      '/zh/ai-pricing/perplexity'
    ),
    (
      'suno',
      'Suno价格：Pro与Premier全球地区对比（2026）',
      '比较 Suno Pro 与 Premier 在不同国家和地区的 App Store 月度订阅价格，查看本地货币、美元折算、税费、汇率日期和购买力差异，并了解创作额度与商业使用权的主要区别。',
      'Suno Pro与Premier全球订阅价格对比',
      '/zh/ai-pricing/suno'
    )
)
INSERT INTO seo_meta (
  id,
  product_id,
  plan_id,
  article_id,
  category_id,
  locale,
  title,
  description,
  h1,
  canonical_url,
  status,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  product.id,
  NULL,
  NULL,
  NULL,
  'zh',
  desired.title,
  desired.description,
  desired.h1,
  desired.canonical_url,
  'published',
  NOW(),
  NOW()
FROM products product
JOIN desired_seo desired
  ON desired.product_slug = product.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM seo_meta seo
  WHERE seo.product_id = product.id
    AND seo.plan_id IS NULL
    AND seo.article_id IS NULL
    AND seo.category_id IS NULL
    AND seo.locale = 'zh'
);

-- Every published product gets a complete Chinese and English SEO baseline.
-- Curated copy remains authoritative; only missing or visibly incomplete fields
-- are replaced. This keeps product publishing independent from a hand-maintained
-- list of slugs.
WITH published_product_defaults AS (
  SELECT
    product.id AS product_id,
    locale.code::locale AS locale,
    CASE locale.code
      WHEN 'zh' THEN product.name || '价格：全球各地区与套餐对比'
      ELSE product.name || ' pricing by country and plan'
    END AS title,
    CASE locale.code
      WHEN 'zh' THEN
        '比较 ' || product.name ||
        ' 在不同国家和地区的 App Store 订阅价格，查看当地货币、美元折算、税费说明、汇率日期与购买力差异，帮助判断更合适的套餐和订阅地区。'
      ELSE
        'Compare ' || product.name ||
        ' App Store subscription prices by country, with local currency, USD conversion, tax notes, exchange-rate dates and purchasing-power context for each plan.'
    END AS description,
    CASE locale.code
      WHEN 'zh' THEN product.name || ' 全球订阅价格与套餐对比'
      ELSE product.name || ' global subscription pricing by plan'
    END AS h1,
    '/' || locale.code || '/' ||
      CASE
        WHEN product.category = 'streaming'::product_category
          THEN 'streaming-pricing'
        ELSE 'ai-pricing'
      END || '/' || product.slug AS canonical_url
  FROM products product
  CROSS JOIN (VALUES ('zh'), ('en')) AS locale(code)
  WHERE product.status = 'published'::publish_status
    AND product.category IN (
      'ai'::product_category,
      'streaming'::product_category
    )
)
INSERT INTO seo_meta (
  id,
  product_id,
  plan_id,
  article_id,
  category_id,
  locale,
  title,
  description,
  h1,
  canonical_url,
  status,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  defaults.product_id,
  NULL,
  NULL,
  NULL,
  defaults.locale,
  defaults.title,
  defaults.description,
  defaults.h1,
  defaults.canonical_url,
  'published'::publish_status,
  NOW(),
  NOW()
FROM published_product_defaults defaults
ON CONFLICT DO NOTHING;

WITH published_product_defaults AS (
  SELECT
    product.id AS product_id,
    locale.code::locale AS locale,
    CASE locale.code
      WHEN 'zh' THEN product.name || '价格：全球各地区与套餐对比'
      ELSE product.name || ' pricing by country and plan'
    END AS title,
    CASE locale.code
      WHEN 'zh' THEN
        '比较 ' || product.name ||
        ' 在不同国家和地区的 App Store 订阅价格，查看当地货币、美元折算、税费说明、汇率日期与购买力差异，帮助判断更合适的套餐和订阅地区。'
      ELSE
        'Compare ' || product.name ||
        ' App Store subscription prices by country, with local currency, USD conversion, tax notes, exchange-rate dates and purchasing-power context for each plan.'
    END AS description,
    CASE locale.code
      WHEN 'zh' THEN product.name || ' 全球订阅价格与套餐对比'
      ELSE product.name || ' global subscription pricing by plan'
    END AS h1,
    '/' || locale.code || '/' ||
      CASE
        WHEN product.category = 'streaming'::product_category
          THEN 'streaming-pricing'
        ELSE 'ai-pricing'
      END || '/' || product.slug AS canonical_url
  FROM products product
  CROSS JOIN (VALUES ('zh'), ('en')) AS locale(code)
  WHERE product.status = 'published'::publish_status
    AND product.category IN (
      'ai'::product_category,
      'streaming'::product_category
    )
)
UPDATE seo_meta seo
SET
  title = CASE
    WHEN LENGTH(BTRIM(seo.title)) BETWEEN 10 AND 65
      THEN seo.title
    ELSE defaults.title
  END,
  description = CASE
    WHEN LENGTH(BTRIM(COALESCE(seo.description, ''))) BETWEEN 70 AND 180
      THEN seo.description
    ELSE defaults.description
  END,
  h1 = CASE
    WHEN LENGTH(BTRIM(COALESCE(seo.h1, ''))) >= 10
      THEN seo.h1
    ELSE defaults.h1
  END,
  canonical_url = defaults.canonical_url,
  status = 'published'::publish_status,
  updated_at = NOW()
FROM published_product_defaults defaults
WHERE seo.product_id = defaults.product_id
  AND seo.plan_id IS NULL
  AND seo.article_id IS NULL
  AND seo.category_id IS NULL
  AND seo.locale = defaults.locale;
