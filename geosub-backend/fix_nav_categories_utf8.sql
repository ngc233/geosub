SET client_encoding = 'UTF8';
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

DELETE FROM navigation_items
WHERE locale = 'zh'::locale
  AND position = 'header'::navigation_position;

DO $$
DECLARE
  guide_id uuid;
BEGIN
  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'zh'::locale, '首页', '/zh/', 'header'::navigation_position, NULL, NULL, false, 'published'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, 'AI 定价', '/zh/ai-pricing/', 'header'::navigation_position, NULL, NULL, false, 'published'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '软件订阅', '/zh/software-subscriptions/', 'header'::navigation_position, NULL, NULL, false, 'published'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '游戏 / Steam', '/zh/gaming-steam/', 'header'::navigation_position, NULL, NULL, false, 'published'::publish_status, 40, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '礼品卡', '/zh/gift-cards/', 'header'::navigation_position, NULL, NULL, false, 'published'::publish_status, 50, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, 'AI 工具', '/zh/ai-rankings/', 'header'::navigation_position, NULL, NULL, false, 'published'::publish_status, 60, NOW(), NOW());

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'zh'::locale, '指南', '/zh/guides/', 'header'::navigation_position, NULL, NULL, false, 'published'::publish_status, 70, NOW(), NOW()
  )
  RETURNING id INTO guide_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'zh'::locale, '全部指南', '/zh/guides/', 'header'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '价格指南', '/zh/guides/price-guide/', 'header'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '礼品卡教程', '/zh/guides/gift-card-guide/', 'header'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '支付与账号', '/zh/guides/payment-account/', 'header'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 40, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '工具测评', '/zh/guides/tool-review/', 'header'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 50, NOW(), NOW());
END $$;

WITH desired_categories(slug, name, description, seo_title, seo_description, status, sort_order) AS (
  VALUES
    ('guides', '指南总览', '订阅省钱、账号、支付、地区价格和工具使用指南。', '订阅与数字服务指南', '查看订阅省钱、账号、支付、地区价格和工具使用指南。', 'published'::publish_status, 10),
    ('ai-pricing', 'AI 定价', 'ChatGPT、Claude、Gemini、Grok 等 AI 订阅价格、地区差异和套餐说明。', 'AI 定价指南', '比较主流 AI 订阅在不同国家和地区的价格差异。', 'published'::publish_status, 20),
    ('software-subscriptions', '软件订阅', 'Microsoft 365、Adobe、Canva、Notion、Cursor、JetBrains 等软件订阅价格对比。', '软件订阅价格指南', '比较常见软件订阅在不同国家和地区的价格差异。', 'published'::publish_status, 30),
    ('gaming-steam', '游戏 / Steam', 'Steam、Xbox、PlayStation、Nintendo、游戏订阅和充值卡区域价格对比。', '游戏与 Steam 区域价格指南', '比较游戏服务、Steam 区域价格和游戏充值卡在不同地区的价格差异。', 'published'::publish_status, 40),
    ('gift-card-guide', '礼品卡教程', 'Apple、Google、Steam 等礼品卡的购买渠道、面值、溢价和使用说明。', '礼品卡购买与价格指南', '整理 Apple、Google、Steam 等礼品卡的地区价格和购买方式。', 'published'::publish_status, 50),
    ('payment-account', '支付与账号', '订阅支付方式、账号注册、地区限制和常见问题说明。', '支付与账号指南', '整理数字订阅相关的支付方式、账号注册和地区限制问题。', 'published'::publish_status, 60),
    ('regional-guide', '地区订阅', '不同国家和地区的订阅价格、可用性和注意事项。', '地区订阅价格指南', '查看不同国家和地区的数字订阅价格差异和可用性说明。', 'published'::publish_status, 70),
    ('tool-review', '工具测评', 'AI 工具、软件工具、效率工具和数字服务的测评与使用场景。', '工具测评', '查看 AI 工具、软件工具和数字服务的测评内容。', 'published'::publish_status, 80),
    ('streaming', '流媒体', 'Netflix、YouTube Premium、Spotify、Disney+ 等流媒体订阅价格对比。', '流媒体订阅价格指南', '比较主流流媒体服务在不同国家和地区的价格差异。', 'published'::publish_status, 90),
    ('price-analysis', '价格分析', '数字订阅和虚拟服务的地区价格分析。', '价格分析', '查看数字订阅和虚拟服务的地区价格分析。', 'published'::publish_status, 100),
    ('rankings', '排行榜', '产品、工具和价格排行榜。', '排行榜', '查看产品、工具和价格排行榜。', 'published'::publish_status, 110),
    ('comparison', '对比榜单', '不同产品、地区和订阅方案的对比内容。', '对比榜单', '查看不同产品、地区和订阅方案的对比内容。', 'published'::publish_status, 120),
    ('methodology', '数据方法', '数据来源、采集方法和价格计算说明。', '数据方法', '了解 GeoSub 的数据来源、采集方法和价格计算说明。', 'published'::publish_status, 130),
    ('policy-update', '政策更新', '数字订阅、地区定价、账号规则和支付政策变化记录。', '订阅政策更新', '记录数字订阅、账号、支付和地区价格政策变化。', 'published'::publish_status, 140),
    ('network-tools', '网络工具（预留）', '高风险栏目，仅作为英文站或后续区域站预留，简体中文默认不展示。', NULL, NULL, 'draft'::publish_status, 900)
),
updated AS (
  UPDATE article_categories c
  SET
    name = d.name,
    description = d.description,
    seo_title = d.seo_title,
    seo_description = d.seo_description,
    status = d.status,
    sort_order = d.sort_order,
    updated_at = NOW()
  FROM desired_categories d
  WHERE c.locale = 'zh'::locale
    AND c.slug = d.slug
  RETURNING c.slug
)
INSERT INTO article_categories (
  id, slug, locale, name, description, parent_id, seo_title, seo_description, status, sort_order, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  d.slug,
  'zh'::locale,
  d.name,
  d.description,
  NULL,
  d.seo_title,
  d.seo_description,
  d.status,
  d.sort_order,
  NOW(),
  NOW()
FROM desired_categories d
WHERE NOT EXISTS (
  SELECT 1
  FROM article_categories c
  WHERE c.locale = 'zh'::locale
    AND c.slug = d.slug
);

COMMIT;