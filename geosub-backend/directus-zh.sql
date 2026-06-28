-- GeoSub Directus Chinese UI Labels v1
-- 只修改 Directus 后台显示，不修改真实数据库字段名

-- 1. 调整左侧 Collection 说明
UPDATE directus_collections
SET
  note = '国家 / 地区基础表，所有价格都会关联这里。'
WHERE collection = 'countries';

UPDATE directus_collections
SET
  note = '产品管理：AI、流媒体、软件、Steam 游戏、VPN、支付工具。'
WHERE collection = 'products';

UPDATE directus_collections
SET
  note = '套餐管理：Plus、Pro、Standard、Family、Steam 游戏本体等。'
WHERE collection = 'plans';

UPDATE directus_collections
SET
  note = '正式地区价格表，前台页面只读取这里已发布的数据。'
WHERE collection = 'region_prices';

UPDATE directus_collections
SET
  note = '数据来源管理：官方页面、API、第三方来源、人工录入。'
WHERE collection = 'price_sources';

UPDATE directus_collections
SET
  note = '自动采集和人工导入的价格观测记录，不直接展示到前台。'
WHERE collection = 'price_observations';

UPDATE directus_collections
SET
  note = '采集证据：HTML、JSON、截图、最终 URL、hash 等。'
WHERE collection = 'source_evidence';

UPDATE directus_collections
SET
  note = '异常价格和待审核数据队列。'
WHERE collection = 'review_queue';

UPDATE directus_collections
SET
  note = '汇率表，用于本地价格折算美元。'
WHERE collection = 'exchange_rates';

UPDATE directus_collections
SET
  note = 'SEO 标题、描述、H1、canonical、多语言元信息。'
WHERE collection = 'seo_meta';

UPDATE directus_collections
SET
  note = '产品 FAQ 管理，后期生成 FAQ 结构化数据。'
WHERE collection = 'faqs';

UPDATE directus_collections
SET
  note = 'Affiliate、VPN、支付工具、官方入口、服务推荐链接。'
WHERE collection = 'affiliate_links';

UPDATE directus_collections
SET
  note = '广告位管理：AdSense、Ezoic、自营广告、推荐位。'
WHERE collection = 'ad_slots';

UPDATE directus_collections
SET
  note = '自动采集任务：AI、流媒体、Steam、汇率等。'
WHERE collection = 'collector_jobs';

UPDATE directus_collections
SET
  note = '页面解析规则和版本管理。'
WHERE collection = 'parser_rules';

UPDATE directus_collections
SET
  note = '后台操作日志和数据变更记录。'
WHERE collection = 'audit_logs';

UPDATE directus_collections
SET
  note = '统计事件配置：点击、分享、广告、Affiliate、语言切换等。'
WHERE collection = 'tracking_events';


-- 2. 如果当前 Directus 版本支持字段 translations，则写入中文字段名
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'directus_fields'
    AND column_name = 'translations'
  ) THEN

    -- countries
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"ID"}]'::jsonb WHERE collection = 'countries' AND field = 'id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"国家代码"}]'::jsonb WHERE collection = 'countries' AND field = 'code';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"中文名称"}]'::jsonb WHERE collection = 'countries' AND field = 'name_zh';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"英文名称"}]'::jsonb WHERE collection = 'countries' AND field = 'name_en';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"西语名称"}]'::jsonb WHERE collection = 'countries' AND field = 'name_es';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"日语名称"}]'::jsonb WHERE collection = 'countries' AND field = 'name_ja';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"默认货币"}]'::jsonb WHERE collection = 'countries' AND field = 'currency';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"所属区域"}]'::jsonb WHERE collection = 'countries' AND field = 'region';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"是否基准国家"}]'::jsonb WHERE collection = 'countries' AND field = 'is_reference';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"是否启用"}]'::jsonb WHERE collection = 'countries' AND field = 'is_supported';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"排序"}]'::jsonb WHERE collection = 'countries' AND field = 'sort_order';

    -- products
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"产品名称"}]'::jsonb WHERE collection = 'products' AND field = 'name';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"URL 标识"}]'::jsonb WHERE collection = 'products' AND field = 'slug';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"分类"}]'::jsonb WHERE collection = 'products' AND field = 'category';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"品牌 / 提供方"}]'::jsonb WHERE collection = 'products' AND field = 'provider';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"Logo 文件"}]'::jsonb WHERE collection = 'products' AND field = 'logo_file';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"Logo 地址"}]'::jsonb WHERE collection = 'products' AND field = 'logo_url';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"产品简介"}]'::jsonb WHERE collection = 'products' AND field = 'description';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"官方链接"}]'::jsonb WHERE collection = 'products' AND field = 'official_url';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"发布状态"}]'::jsonb WHERE collection = 'products' AND field = 'status';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"是否推荐"}]'::jsonb WHERE collection = 'products' AND field = 'featured';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"排序"}]'::jsonb WHERE collection = 'products' AND field = 'sort_order';

    -- plans
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"所属产品"}]'::jsonb WHERE collection = 'plans' AND field = 'product_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"套餐名称"}]'::jsonb WHERE collection = 'plans' AND field = 'name';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"URL 标识"}]'::jsonb WHERE collection = 'plans' AND field = 'slug';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"计费周期"}]'::jsonb WHERE collection = 'plans' AND field = 'billing_cycle';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"套餐说明"}]'::jsonb WHERE collection = 'plans' AND field = 'description';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"发布状态"}]'::jsonb WHERE collection = 'plans' AND field = 'status';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"排序"}]'::jsonb WHERE collection = 'plans' AND field = 'sort_order';

    -- region_prices
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"产品"}]'::jsonb WHERE collection = 'region_prices' AND field = 'product_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"套餐"}]'::jsonb WHERE collection = 'region_prices' AND field = 'plan_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"国家 / 地区"}]'::jsonb WHERE collection = 'region_prices' AND field = 'country_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"本地价格"}]'::jsonb WHERE collection = 'region_prices' AND field = 'local_price';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"币种"}]'::jsonb WHERE collection = 'region_prices' AND field = 'currency';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"折算美元"}]'::jsonb WHERE collection = 'region_prices' AND field = 'price_usd';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"美国基准价"}]'::jsonb WHERE collection = 'region_prices' AND field = 'us_base_price';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"相对美国价差"}]'::jsonb WHERE collection = 'region_prices' AND field = 'diff_vs_us_percent';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"计费平台"}]'::jsonb WHERE collection = 'region_prices' AND field = 'billing_platform';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"价格类型"}]'::jsonb WHERE collection = 'region_prices' AND field = 'price_type';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"税费说明"}]'::jsonb WHERE collection = 'region_prices' AND field = 'tax_note';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"可用性说明"}]'::jsonb WHERE collection = 'region_prices' AND field = 'availability_note';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"来源摘要"}]'::jsonb WHERE collection = 'region_prices' AND field = 'source_summary';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"主要来源"}]'::jsonb WHERE collection = 'region_prices' AND field = 'primary_source_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"置信度"}]'::jsonb WHERE collection = 'region_prices' AND field = 'confidence_score';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"数据质量"}]'::jsonb WHERE collection = 'region_prices' AND field = 'data_quality';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"发布状态"}]'::jsonb WHERE collection = 'region_prices' AND field = 'status';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"最近检查时间"}]'::jsonb WHERE collection = 'region_prices' AND field = 'last_checked_at';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"发布时间"}]'::jsonb WHERE collection = 'region_prices' AND field = 'published_at';

    -- price_sources
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"来源标识"}]'::jsonb WHERE collection = 'price_sources' AND field = 'source_key';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"来源名称"}]'::jsonb WHERE collection = 'price_sources' AND field = 'name';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"来源等级"}]'::jsonb WHERE collection = 'price_sources' AND field = 'source_level';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"来源类型"}]'::jsonb WHERE collection = 'price_sources' AND field = 'type';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"提供方"}]'::jsonb WHERE collection = 'price_sources' AND field = 'provider';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"基础链接"}]'::jsonb WHERE collection = 'price_sources' AND field = 'base_url';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"国家链接规则"}]'::jsonb WHERE collection = 'price_sources' AND field = 'country_url_pattern';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"需要 JS 渲染"}]'::jsonb WHERE collection = 'price_sources' AND field = 'requires_javascript';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"需要登录"}]'::jsonb WHERE collection = 'price_sources' AND field = 'requires_account';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"需要地区环境"}]'::jsonb WHERE collection = 'price_sources' AND field = 'requires_geo';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"条款风险"}]'::jsonb WHERE collection = 'price_sources' AND field = 'terms_risk';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"可靠度"}]'::jsonb WHERE collection = 'price_sources' AND field = 'reliability_score';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"状态"}]'::jsonb WHERE collection = 'price_sources' AND field = 'status';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"备注"}]'::jsonb WHERE collection = 'price_sources' AND field = 'note';

    -- SEO / FAQ / Affiliate / Ads
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"产品"}]'::jsonb WHERE collection = 'seo_meta' AND field = 'product_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"套餐"}]'::jsonb WHERE collection = 'seo_meta' AND field = 'plan_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"语言"}]'::jsonb WHERE collection = 'seo_meta' AND field = 'locale';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"SEO 标题"}]'::jsonb WHERE collection = 'seo_meta' AND field = 'title';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"元描述"}]'::jsonb WHERE collection = 'seo_meta' AND field = 'description';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"H1 标题"}]'::jsonb WHERE collection = 'seo_meta' AND field = 'h1';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"Canonical 链接"}]'::jsonb WHERE collection = 'seo_meta' AND field = 'canonical_url';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"发布状态"}]'::jsonb WHERE collection = 'seo_meta' AND field = 'status';

    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"产品"}]'::jsonb WHERE collection = 'faqs' AND field = 'product_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"套餐"}]'::jsonb WHERE collection = 'faqs' AND field = 'plan_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"语言"}]'::jsonb WHERE collection = 'faqs' AND field = 'locale';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"问题"}]'::jsonb WHERE collection = 'faqs' AND field = 'question';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"答案"}]'::jsonb WHERE collection = 'faqs' AND field = 'answer';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"排序"}]'::jsonb WHERE collection = 'faqs' AND field = 'sort_order';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"发布状态"}]'::jsonb WHERE collection = 'faqs' AND field = 'status';

    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"产品"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'product_id';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"推荐分类"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'category';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"标题"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'title';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"说明"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'description';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"按钮文字"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'button_text';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"链接"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'url';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"展示位置"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'placement';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"语言"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'locale';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"优先级"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'priority';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"发布状态"}]'::jsonb WHERE collection = 'affiliate_links' AND field = 'status';

    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"广告位标识"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'slot_key';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"广告位名称"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'name';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"页面位置"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'position';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"页面类型"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'page_type';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"广告平台"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'provider';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"广告代码"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'code';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"发布状态"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'status';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"优先级"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'priority';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"移动端显示"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'show_on_mobile';
    UPDATE directus_fields SET translations = '[{"language":"zh-CN","translation":"桌面端显示"}]'::jsonb WHERE collection = 'ad_slots' AND field = 'show_on_desktop';

  END IF;
END $$;