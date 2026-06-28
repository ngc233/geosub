-- GeoSub Directus 中文运营后台 v2
-- 不修改真实数据库字段名，只修改 Directus 后台显示名称、字段顺序、默认隐藏字段

CREATE OR REPLACE FUNCTION geosub_set_collection_label(
  p_collection TEXT,
  p_label TEXT
)
RETURNS VOID AS $$
DECLARE
  v_json_type TEXT;
  v_payload TEXT;
BEGIN
  SELECT udt_name
  INTO v_json_type
  FROM information_schema.columns
  WHERE table_name = 'directus_collections'
    AND column_name = 'translations';

  IF v_json_type IS NOT NULL THEN
    v_payload := json_build_array(
      json_build_object('language', 'zh-CN', 'translation', p_label)
    )::TEXT;

    EXECUTE format(
      'UPDATE directus_collections SET translations = %L::%s WHERE collection = %L',
      v_payload,
      v_json_type,
      p_collection
    );
  END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION geosub_set_field_label(
  p_collection TEXT,
  p_field TEXT,
  p_label TEXT
)
RETURNS VOID AS $$
DECLARE
  v_json_type TEXT;
  v_payload TEXT;
BEGIN
  SELECT udt_name
  INTO v_json_type
  FROM information_schema.columns
  WHERE table_name = 'directus_fields'
    AND column_name = 'translations';

  IF v_json_type IS NOT NULL THEN
    v_payload := json_build_array(
      json_build_object('language', 'zh-CN', 'translation', p_label)
    )::TEXT;

    EXECUTE format(
      '
      INSERT INTO directus_fields (collection, field, translations)
      VALUES (%L, %L, %L::%s)
      ON CONFLICT (collection, field) DO UPDATE SET
        translations = EXCLUDED.translations
      ',
      p_collection,
      p_field,
      v_payload,
      v_json_type
    );
  END IF;
END;
$$ LANGUAGE plpgsql;


-- 1. 左侧菜单 / Collection 中文名
SELECT geosub_set_collection_label('countries', '国家 / 地区');
SELECT geosub_set_collection_label('products', '产品管理');
SELECT geosub_set_collection_label('plans', '套餐管理');
SELECT geosub_set_collection_label('region_prices', '正式地区价格');
SELECT geosub_set_collection_label('price_sources', '数据来源');
SELECT geosub_set_collection_label('price_observations', '采集观测');
SELECT geosub_set_collection_label('source_evidence', '来源证据');
SELECT geosub_set_collection_label('review_queue', '异常审核');
SELECT geosub_set_collection_label('exchange_rates', '汇率管理');
SELECT geosub_set_collection_label('seo_meta', 'SEO 管理');
SELECT geosub_set_collection_label('faqs', 'FAQ 管理');
SELECT geosub_set_collection_label('affiliate_links', '联盟推荐');
SELECT geosub_set_collection_label('ad_slots', '广告位管理');
SELECT geosub_set_collection_label('collector_jobs', '采集任务');
SELECT geosub_set_collection_label('parser_rules', '解析规则');
SELECT geosub_set_collection_label('audit_logs', '操作日志');
SELECT geosub_set_collection_label('tracking_events', '统计事件');


-- 2. countries 字段中文名
SELECT geosub_set_field_label('countries', 'code', '国家代码');
SELECT geosub_set_field_label('countries', 'name_zh', '中文名称');
SELECT geosub_set_field_label('countries', 'name_en', '英文名称');
SELECT geosub_set_field_label('countries', 'name_es', '西语名称');
SELECT geosub_set_field_label('countries', 'name_ja', '日语名称');
SELECT geosub_set_field_label('countries', 'currency', '默认货币');
SELECT geosub_set_field_label('countries', 'region', '所属区域');
SELECT geosub_set_field_label('countries', 'is_reference', '是否基准国家');
SELECT geosub_set_field_label('countries', 'is_supported', '是否启用');
SELECT geosub_set_field_label('countries', 'sort_order', '排序');


-- 3. products 字段中文名
SELECT geosub_set_field_label('products', 'name', '产品名称');
SELECT geosub_set_field_label('products', 'slug', 'URL 标识');
SELECT geosub_set_field_label('products', 'category', '分类');
SELECT geosub_set_field_label('products', 'provider', '品牌 / 提供方');
SELECT geosub_set_field_label('products', 'logo_file', 'Logo 文件');
SELECT geosub_set_field_label('products', 'logo_url', 'Logo 地址');
SELECT geosub_set_field_label('products', 'description', '产品简介');
SELECT geosub_set_field_label('products', 'official_url', '官方链接');
SELECT geosub_set_field_label('products', 'status', '发布状态');
SELECT geosub_set_field_label('products', 'featured', '是否推荐');
SELECT geosub_set_field_label('products', 'sort_order', '排序');


-- 4. plans 字段中文名
SELECT geosub_set_field_label('plans', 'product_id', '所属产品');
SELECT geosub_set_field_label('plans', 'name', '套餐名称');
SELECT geosub_set_field_label('plans', 'slug', 'URL 标识');
SELECT geosub_set_field_label('plans', 'billing_cycle', '计费周期');
SELECT geosub_set_field_label('plans', 'description', '套餐说明');
SELECT geosub_set_field_label('plans', 'status', '发布状态');
SELECT geosub_set_field_label('plans', 'sort_order', '排序');


-- 5. region_prices 字段中文名
SELECT geosub_set_field_label('region_prices', 'product_id', '产品');
SELECT geosub_set_field_label('region_prices', 'plan_id', '套餐');
SELECT geosub_set_field_label('region_prices', 'country_id', '国家 / 地区');
SELECT geosub_set_field_label('region_prices', 'local_price', '本地价格');
SELECT geosub_set_field_label('region_prices', 'currency', '币种');
SELECT geosub_set_field_label('region_prices', 'price_usd', '折算美元');
SELECT geosub_set_field_label('region_prices', 'us_base_price', '美国基准价');
SELECT geosub_set_field_label('region_prices', 'diff_vs_us_percent', '相对美国价差');
SELECT geosub_set_field_label('region_prices', 'billing_platform', '计费平台');
SELECT geosub_set_field_label('region_prices', 'price_type', '价格类型');
SELECT geosub_set_field_label('region_prices', 'tax_note', '税费说明');
SELECT geosub_set_field_label('region_prices', 'availability_note', '可用性说明');
SELECT geosub_set_field_label('region_prices', 'source_summary', '来源摘要');
SELECT geosub_set_field_label('region_prices', 'primary_source_id', '主要来源');
SELECT geosub_set_field_label('region_prices', 'confidence_score', '置信度');
SELECT geosub_set_field_label('region_prices', 'data_quality', '数据质量');
SELECT geosub_set_field_label('region_prices', 'status', '发布状态');
SELECT geosub_set_field_label('region_prices', 'last_checked_at', '最近检查时间');
SELECT geosub_set_field_label('region_prices', 'published_at', '发布时间');


-- 6. price_sources 字段中文名
SELECT geosub_set_field_label('price_sources', 'source_key', '来源标识');
SELECT geosub_set_field_label('price_sources', 'name', '来源名称');
SELECT geosub_set_field_label('price_sources', 'source_level', '来源等级');
SELECT geosub_set_field_label('price_sources', 'type', '来源类型');
SELECT geosub_set_field_label('price_sources', 'provider', '提供方');
SELECT geosub_set_field_label('price_sources', 'base_url', '基础链接');
SELECT geosub_set_field_label('price_sources', 'country_url_pattern', '国家链接规则');
SELECT geosub_set_field_label('price_sources', 'requires_javascript', '需要 JS 渲染');
SELECT geosub_set_field_label('price_sources', 'requires_account', '需要登录');
SELECT geosub_set_field_label('price_sources', 'requires_geo', '需要地区环境');
SELECT geosub_set_field_label('price_sources', 'terms_risk', '条款风险');
SELECT geosub_set_field_label('price_sources', 'reliability_score', '可靠度');
SELECT geosub_set_field_label('price_sources', 'status', '状态');
SELECT geosub_set_field_label('price_sources', 'note', '备注');


-- 7. price_observations 字段中文名
SELECT geosub_set_field_label('price_observations', 'product_id', '产品');
SELECT geosub_set_field_label('price_observations', 'plan_id', '套餐');
SELECT geosub_set_field_label('price_observations', 'country_id', '国家 / 地区');
SELECT geosub_set_field_label('price_observations', 'source_id', '数据来源');
SELECT geosub_set_field_label('price_observations', 'source_level', '来源等级');
SELECT geosub_set_field_label('price_observations', 'raw_price', '原始价格');
SELECT geosub_set_field_label('price_observations', 'currency', '币种');
SELECT geosub_set_field_label('price_observations', 'converted_usd', '折算美元');
SELECT geosub_set_field_label('price_observations', 'observed_at', '采集时间');
SELECT geosub_set_field_label('price_observations', 'source_url', '来源链接');
SELECT geosub_set_field_label('price_observations', 'locale', '语言环境');
SELECT geosub_set_field_label('price_observations', 'ip_country', '采集地区');
SELECT geosub_set_field_label('price_observations', 'billing_platform', '计费平台');
SELECT geosub_set_field_label('price_observations', 'price_type', '价格类型');
SELECT geosub_set_field_label('price_observations', 'tax_included', '是否含税');
SELECT geosub_set_field_label('price_observations', 'raw_payload', '原始数据');
SELECT geosub_set_field_label('price_observations', 'parser_version', '解析器版本');
SELECT geosub_set_field_label('price_observations', 'confidence_score', '置信度');
SELECT geosub_set_field_label('price_observations', 'anomaly_flag', '是否异常');
SELECT geosub_set_field_label('price_observations', 'anomaly_reason', '异常原因');
SELECT geosub_set_field_label('price_observations', 'status', '状态');


-- 8. source_evidence 字段中文名
SELECT geosub_set_field_label('source_evidence', 'observation_id', '观测记录');
SELECT geosub_set_field_label('source_evidence', 'evidence_type', '证据类型');
SELECT geosub_set_field_label('source_evidence', 'storage_url', '存储地址');
SELECT geosub_set_field_label('source_evidence', 'content_hash', '内容 Hash');
SELECT geosub_set_field_label('source_evidence', 'captured_at', '保存时间');
SELECT geosub_set_field_label('source_evidence', 'http_status', 'HTTP 状态');
SELECT geosub_set_field_label('source_evidence', 'final_url', '最终链接');
SELECT geosub_set_field_label('source_evidence', 'user_agent', 'User Agent');
SELECT geosub_set_field_label('source_evidence', 'country_context', '国家上下文');
SELECT geosub_set_field_label('source_evidence', 'note', '备注');


-- 9. review_queue 字段中文名
SELECT geosub_set_field_label('review_queue', 'target_type', '审核对象类型');
SELECT geosub_set_field_label('review_queue', 'target_id', '审核对象 ID');
SELECT geosub_set_field_label('review_queue', 'reason', '审核原因');
SELECT geosub_set_field_label('review_queue', 'old_value', '旧数据');
SELECT geosub_set_field_label('review_queue', 'new_value', '新数据');
SELECT geosub_set_field_label('review_queue', 'severity', '严重程度');
SELECT geosub_set_field_label('review_queue', 'status', '处理状态');
SELECT geosub_set_field_label('review_queue', 'assigned_to', '负责人');
SELECT geosub_set_field_label('review_queue', 'note', '处理备注');
SELECT geosub_set_field_label('review_queue', 'resolved_at', '处理时间');


-- 10. SEO / FAQ / Affiliate / Ads
SELECT geosub_set_field_label('seo_meta', 'product_id', '产品');
SELECT geosub_set_field_label('seo_meta', 'plan_id', '套餐');
SELECT geosub_set_field_label('seo_meta', 'locale', '语言');
SELECT geosub_set_field_label('seo_meta', 'title', 'SEO 标题');
SELECT geosub_set_field_label('seo_meta', 'description', '元描述');
SELECT geosub_set_field_label('seo_meta', 'h1', 'H1 标题');
SELECT geosub_set_field_label('seo_meta', 'canonical_url', 'Canonical 链接');
SELECT geosub_set_field_label('seo_meta', 'status', '发布状态');

SELECT geosub_set_field_label('faqs', 'product_id', '产品');
SELECT geosub_set_field_label('faqs', 'plan_id', '套餐');
SELECT geosub_set_field_label('faqs', 'locale', '语言');
SELECT geosub_set_field_label('faqs', 'question', '问题');
SELECT geosub_set_field_label('faqs', 'answer', '答案');
SELECT geosub_set_field_label('faqs', 'sort_order', '排序');
SELECT geosub_set_field_label('faqs', 'status', '发布状态');

SELECT geosub_set_field_label('affiliate_links', 'product_id', '产品');
SELECT geosub_set_field_label('affiliate_links', 'category', '推荐分类');
SELECT geosub_set_field_label('affiliate_links', 'title', '标题');
SELECT geosub_set_field_label('affiliate_links', 'description', '说明');
SELECT geosub_set_field_label('affiliate_links', 'button_text', '按钮文字');
SELECT geosub_set_field_label('affiliate_links', 'url', '链接');
SELECT geosub_set_field_label('affiliate_links', 'placement', '展示位置');
SELECT geosub_set_field_label('affiliate_links', 'locale', '语言');
SELECT geosub_set_field_label('affiliate_links', 'priority', '优先级');
SELECT geosub_set_field_label('affiliate_links', 'status', '发布状态');

SELECT geosub_set_field_label('ad_slots', 'slot_key', '广告位标识');
SELECT geosub_set_field_label('ad_slots', 'name', '广告位名称');
SELECT geosub_set_field_label('ad_slots', 'position', '页面位置');
SELECT geosub_set_field_label('ad_slots', 'page_type', '页面类型');
SELECT geosub_set_field_label('ad_slots', 'provider', '广告平台');
SELECT geosub_set_field_label('ad_slots', 'code', '广告代码');
SELECT geosub_set_field_label('ad_slots', 'status', '发布状态');
SELECT geosub_set_field_label('ad_slots', 'priority', '优先级');
SELECT geosub_set_field_label('ad_slots', 'show_on_mobile', '移动端显示');
SELECT geosub_set_field_label('ad_slots', 'show_on_desktop', '桌面端显示');


-- 11. exchange / jobs / parser / tracking
SELECT geosub_set_field_label('exchange_rates', 'base_currency', '基础货币');
SELECT geosub_set_field_label('exchange_rates', 'quote_currency', '目标货币');
SELECT geosub_set_field_label('exchange_rates', 'rate', '汇率');
SELECT geosub_set_field_label('exchange_rates', 'source', '来源');
SELECT geosub_set_field_label('exchange_rates', 'rate_date', '汇率日期');
SELECT geosub_set_field_label('exchange_rates', 'fetched_at', '获取时间');
SELECT geosub_set_field_label('exchange_rates', 'status', '状态');

SELECT geosub_set_field_label('collector_jobs', 'source_id', '数据来源');
SELECT geosub_set_field_label('collector_jobs', 'product_id', '产品');
SELECT geosub_set_field_label('collector_jobs', 'job_type', '任务类型');
SELECT geosub_set_field_label('collector_jobs', 'schedule', '执行计划');
SELECT geosub_set_field_label('collector_jobs', 'status', '状态');
SELECT geosub_set_field_label('collector_jobs', 'last_run_at', '上次运行');
SELECT geosub_set_field_label('collector_jobs', 'next_run_at', '下次运行');
SELECT geosub_set_field_label('collector_jobs', 'success_count', '成功次数');
SELECT geosub_set_field_label('collector_jobs', 'error_count', '失败次数');
SELECT geosub_set_field_label('collector_jobs', 'last_error', '最近错误');

SELECT geosub_set_field_label('parser_rules', 'source_id', '数据来源');
SELECT geosub_set_field_label('parser_rules', 'name', '规则名称');
SELECT geosub_set_field_label('parser_rules', 'version', '版本');
SELECT geosub_set_field_label('parser_rules', 'selector_config', '选择器配置');
SELECT geosub_set_field_label('parser_rules', 'regex_config', '正则配置');
SELECT geosub_set_field_label('parser_rules', 'status', '状态');

SELECT geosub_set_field_label('tracking_events', 'event_key', '事件标识');
SELECT geosub_set_field_label('tracking_events', 'event_name', '事件名称');
SELECT geosub_set_field_label('tracking_events', 'description', '说明');
SELECT geosub_set_field_label('tracking_events', 'enabled', '是否启用');


-- 12. 隐藏技术字段
INSERT INTO directus_fields (collection, field, hidden, readonly, sort, width)
SELECT collection_name, field_name, TRUE, TRUE, 999, 'half'
FROM (
  VALUES
    ('countries', 'id'),
    ('products', 'id'),
    ('plans', 'id'),
    ('region_prices', 'id'),
    ('price_sources', 'id'),
    ('price_observations', 'id'),
    ('source_evidence', 'id'),
    ('review_queue', 'id'),
    ('exchange_rates', 'id'),
    ('seo_meta', 'id'),
    ('faqs', 'id'),
    ('affiliate_links', 'id'),
    ('ad_slots', 'id'),
    ('collector_jobs', 'id'),
    ('parser_rules', 'id'),
    ('audit_logs', 'id'),
    ('tracking_events', 'id'),

    ('countries', 'created_at'),
    ('countries', 'updated_at'),
    ('products', 'created_at'),
    ('products', 'updated_at'),
    ('plans', 'created_at'),
    ('plans', 'updated_at'),
    ('region_prices', 'created_at'),
    ('region_prices', 'updated_at'),
    ('price_sources', 'created_at'),
    ('price_sources', 'updated_at'),
    ('seo_meta', 'created_at'),
    ('seo_meta', 'updated_at'),
    ('faqs', 'created_at'),
    ('faqs', 'updated_at'),
    ('affiliate_links', 'created_at'),
    ('affiliate_links', 'updated_at')
) AS x(collection_name, field_name)
ON CONFLICT (collection, field) DO UPDATE SET
  hidden = EXCLUDED.hidden,
  readonly = EXCLUDED.readonly,
  sort = EXCLUDED.sort,
  width = EXCLUDED.width;


-- 13. 关键字段排序：让中文维护字段靠前
INSERT INTO directus_fields (collection, field, sort, width)
VALUES
  ('countries', 'code', 10, 'half'),
  ('countries', 'name_zh', 20, 'half'),
  ('countries', 'currency', 30, 'half'),
  ('countries', 'region', 40, 'half'),
  ('countries', 'is_reference', 50, 'half'),
  ('countries', 'is_supported', 60, 'half'),
  ('countries', 'name_en', 90, 'half'),
  ('countries', 'name_es', 100, 'half'),
  ('countries', 'name_ja', 110, 'half'),

  ('products', 'name', 10, 'half'),
  ('products', 'slug', 20, 'half'),
  ('products', 'category', 30, 'half'),
  ('products', 'provider', 40, 'half'),
  ('products', 'status', 50, 'half'),
  ('products', 'featured', 60, 'half'),
  ('products', 'description', 70, 'full'),
  ('products', 'official_url', 80, 'full'),

  ('plans', 'product_id', 10, 'half'),
  ('plans', 'name', 20, 'half'),
  ('plans', 'slug', 30, 'half'),
  ('plans', 'billing_cycle', 40, 'half'),
  ('plans', 'status', 50, 'half'),
  ('plans', 'description', 60, 'full'),

  ('region_prices', 'product_id', 10, 'half'),
  ('region_prices', 'plan_id', 20, 'half'),
  ('region_prices', 'country_id', 30, 'half'),
  ('region_prices', 'local_price', 40, 'half'),
  ('region_prices', 'currency', 50, 'half'),
  ('region_prices', 'price_usd', 60, 'half'),
  ('region_prices', 'diff_vs_us_percent', 70, 'half'),
  ('region_prices', 'confidence_score', 80, 'half'),
  ('region_prices', 'data_quality', 90, 'half'),
  ('region_prices', 'status', 100, 'half'),
  ('region_prices', 'tax_note', 110, 'full'),
  ('region_prices', 'availability_note', 120, 'full')
ON CONFLICT (collection, field) DO UPDATE SET
  sort = EXCLUDED.sort,
  width = EXCLUDED.width;


-- 14. 清理这些 Collection 的旧列表布局缓存，避免继续显示旧英文列
DO $$
BEGIN
  IF to_regclass('public.directus_presets') IS NOT NULL THEN
    DELETE FROM directus_presets
    WHERE collection IN (
      'countries',
      'products',
      'plans',
      'region_prices',
      'price_sources',
      'price_observations',
      'source_evidence',
      'review_queue',
      'exchange_rates',
      'seo_meta',
      'faqs',
      'affiliate_links',
      'ad_slots',
      'collector_jobs',
      'parser_rules',
      'audit_logs',
      'tracking_events'
    );
  END IF;
END $$;