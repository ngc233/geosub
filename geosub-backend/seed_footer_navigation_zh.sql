SET client_encoding = 'UTF8';
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

DELETE FROM navigation_items
WHERE locale = 'zh'::locale
  AND position = 'footer'::navigation_position;

DO $$
DECLARE
  product_id uuid;
  guide_id uuid;
  resource_id uuid;
  about_id uuid;
BEGIN
  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'zh'::locale, '产品', '/zh/', 'footer'::navigation_position, NULL, NULL, false, 'published'::publish_status, 10, NOW(), NOW()
  )
  RETURNING id INTO product_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'zh'::locale, 'AI 定价', '/zh/ai-pricing/', 'footer'::navigation_position, product_id, NULL, false, 'published'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '软件订阅', '/zh/software-subscriptions/', 'footer'::navigation_position, product_id, NULL, false, 'published'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '游戏 / Steam', '/zh/gaming-steam/', 'footer'::navigation_position, product_id, NULL, false, 'published'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '礼品卡', '/zh/gift-cards/', 'footer'::navigation_position, product_id, NULL, false, 'published'::publish_status, 40, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, 'AI 工具', '/zh/ai-rankings/', 'footer'::navigation_position, product_id, NULL, false, 'published'::publish_status, 50, NOW(), NOW());

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'zh'::locale, '指南', '/zh/guides/', 'footer'::navigation_position, NULL, NULL, false, 'published'::publish_status, 20, NOW(), NOW()
  )
  RETURNING id INTO guide_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'zh'::locale, '价格指南', '/zh/guides/price-guide/', 'footer'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '礼品卡教程', '/zh/guides/gift-card-guide/', 'footer'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '支付与账号', '/zh/guides/payment-account/', 'footer'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '工具测评', '/zh/guides/tool-review/', 'footer'::navigation_position, guide_id, NULL, false, 'published'::publish_status, 40, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '数据方法', '/zh/guides/methodology/', 'footer'::navigation_position, guide_id, NULL, false, 'draft'::publish_status, 50, NOW(), NOW());

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'zh'::locale, '资源', '/zh/resources/', 'footer'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()
  )
  RETURNING id INTO resource_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'zh'::locale, '价格分析', '/zh/guides/price-analysis/', 'footer'::navigation_position, resource_id, NULL, false, 'draft'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '排行榜', '/zh/rankings/', 'footer'::navigation_position, resource_id, NULL, false, 'draft'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '对比榜单', '/zh/comparison/', 'footer'::navigation_position, resource_id, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '政策更新', '/zh/policy-updates/', 'footer'::navigation_position, resource_id, NULL, false, 'draft'::publish_status, 40, NOW(), NOW());

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'zh'::locale, '关于', '/zh/about/', 'footer'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 40, NOW(), NOW()
  )
  RETURNING id INTO about_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'zh'::locale, '关于 GeoSub', '/zh/about/', 'footer'::navigation_position, about_id, NULL, false, 'draft'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '数据来源', '/zh/data-sources/', 'footer'::navigation_position, about_id, NULL, false, 'draft'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '隐私政策', '/zh/privacy/', 'footer'::navigation_position, about_id, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'zh'::locale, '服务条款', '/zh/terms/', 'footer'::navigation_position, about_id, NULL, false, 'draft'::publish_status, 40, NOW(), NOW());
END $$;

COMMIT;