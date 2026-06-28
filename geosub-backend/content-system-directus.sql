-- GeoSub Content System Directus Registration v1
-- 注册文章系统 / 站点设置 / 导航 / 重定向 / 内链到 Directus，并汉化字段

-- 1. 注册 Collection 到 Directus 左侧菜单
INSERT INTO directus_collections (
  collection,
  icon,
  note,
  hidden,
  singleton,
  sort
)
VALUES
  ('article_categories', 'category', '文章分类：教程、榜单、对比、方法论等内容分类。', false, false, 180),
  ('articles', 'article', '文章管理：教程、指南、榜单、对比、方法论和公告。', false, false, 190),
  ('article_blocks', 'view_agenda', '文章结构化内容块：段落、图片、表格、广告、产品卡等。', false, false, 200),
  ('article_tags', 'sell', '文章标签管理。', false, false, 210),
  ('article_tag_links', 'link', '文章与标签的关联关系。', false, false, 220),
  ('article_relations', 'hub', '文章与产品、国家、价格页、相关文章的关联。', false, false, 230),
  ('site_settings', 'settings_applications', '站点设置：统计代码、全站配置、默认 SEO、品牌信息。', false, false, 240),
  ('redirects', 'alt_route', '301 / 302 重定向管理，用于 SEO URL 迁移。', false, false, 250),
  ('navigation_items', 'menu', '导航菜单管理：顶部、底部、侧边栏、移动端。', false, false, 260),
  ('internal_links', 'lan', '内链管理：文章、产品页、榜单页之间的 SEO 内链。', false, false, 270)
ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  hidden = EXCLUDED.hidden,
  singleton = EXCLUDED.singleton,
  sort = EXCLUDED.sort;


-- 2. 注册关系字段
INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_categories', 'parent_id', 'article_categories', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_categories'
    AND many_field = 'parent_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'articles', 'category_id', 'article_categories', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'articles'
    AND many_field = 'category_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_blocks', 'article_id', 'articles', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_blocks'
    AND many_field = 'article_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_blocks', 'linked_product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_blocks'
    AND many_field = 'linked_product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_blocks', 'linked_plan_id', 'plans', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_blocks'
    AND many_field = 'linked_plan_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_blocks', 'linked_country_id', 'countries', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_blocks'
    AND many_field = 'linked_country_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_blocks', 'ad_slot_id', 'ad_slots', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_blocks'
    AND many_field = 'ad_slot_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_blocks', 'affiliate_link_id', 'affiliate_links', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_blocks'
    AND many_field = 'affiliate_link_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_tag_links', 'article_id', 'articles', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_tag_links'
    AND many_field = 'article_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_tag_links', 'tag_id', 'article_tags', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_tag_links'
    AND many_field = 'tag_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_relations', 'article_id', 'articles', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_relations'
    AND many_field = 'article_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_relations', 'product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_relations'
    AND many_field = 'product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_relations', 'plan_id', 'plans', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_relations'
    AND many_field = 'plan_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_relations', 'country_id', 'countries', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_relations'
    AND many_field = 'country_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_relations', 'related_article_id', 'articles', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_relations'
    AND many_field = 'related_article_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'article_relations', 'affiliate_link_id', 'affiliate_links', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'article_relations'
    AND many_field = 'affiliate_link_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'navigation_items', 'parent_id', 'navigation_items', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations
  WHERE many_collection = 'navigation_items'
    AND many_field = 'parent_id'
);


-- 3. 汉化工具函数
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


-- 4. 左侧菜单中文名
SELECT geosub_set_collection_label('article_categories', '文章分类');
SELECT geosub_set_collection_label('articles', '文章管理');
SELECT geosub_set_collection_label('article_blocks', '内容块');
SELECT geosub_set_collection_label('article_tags', '文章标签');
SELECT geosub_set_collection_label('article_tag_links', '文章标签关系');
SELECT geosub_set_collection_label('article_relations', '文章关联');
SELECT geosub_set_collection_label('site_settings', '站点设置');
SELECT geosub_set_collection_label('redirects', '重定向管理');
SELECT geosub_set_collection_label('navigation_items', '导航菜单');
SELECT geosub_set_collection_label('internal_links', '内链管理');


-- 5. 字段中文名：文章分类
SELECT geosub_set_field_label('article_categories', 'slug', 'URL 标识');
SELECT geosub_set_field_label('article_categories', 'locale', '语言');
SELECT geosub_set_field_label('article_categories', 'name', '分类名称');
SELECT geosub_set_field_label('article_categories', 'description', '分类说明');
SELECT geosub_set_field_label('article_categories', 'parent_id', '上级分类');
SELECT geosub_set_field_label('article_categories', 'seo_title', 'SEO 标题');
SELECT geosub_set_field_label('article_categories', 'seo_description', '元描述');
SELECT geosub_set_field_label('article_categories', 'status', '发布状态');
SELECT geosub_set_field_label('article_categories', 'sort_order', '排序');


-- 6. 字段中文名：文章管理
SELECT geosub_set_field_label('articles', 'slug', 'URL 标识');
SELECT geosub_set_field_label('articles', 'locale', '语言');
SELECT geosub_set_field_label('articles', 'title', '文章标题');
SELECT geosub_set_field_label('articles', 'subtitle', '副标题');
SELECT geosub_set_field_label('articles', 'excerpt', '摘要');
SELECT geosub_set_field_label('articles', 'article_type', '文章类型');
SELECT geosub_set_field_label('articles', 'category_id', '文章分类');
SELECT geosub_set_field_label('articles', 'cover_image', '封面图');
SELECT geosub_set_field_label('articles', 'cover_image_url', '封面图地址');
SELECT geosub_set_field_label('articles', 'author_name', '作者');
SELECT geosub_set_field_label('articles', 'body_markdown', '正文 Markdown');
SELECT geosub_set_field_label('articles', 'body_html', '正文 HTML');
SELECT geosub_set_field_label('articles', 'body_json', '正文 JSON');
SELECT geosub_set_field_label('articles', 'status', '发布状态');
SELECT geosub_set_field_label('articles', 'is_featured', '是否推荐');
SELECT geosub_set_field_label('articles', 'reading_time', '阅读时间');
SELECT geosub_set_field_label('articles', 'published_at', '发布时间');
SELECT geosub_set_field_label('articles', 'scheduled_at', '定时发布时间');
SELECT geosub_set_field_label('articles', 'canonical_url', 'Canonical 链接');
SELECT geosub_set_field_label('articles', 'seo_title', 'SEO 标题');
SELECT geosub_set_field_label('articles', 'seo_description', '元描述');
SELECT geosub_set_field_label('articles', 'seo_keywords', 'SEO 关键词');
SELECT geosub_set_field_label('articles', 'og_title', 'OG 标题');
SELECT geosub_set_field_label('articles', 'og_description', 'OG 描述');
SELECT geosub_set_field_label('articles', 'og_image', 'OG 图片');
SELECT geosub_set_field_label('articles', 'og_image_url', 'OG 图片地址');
SELECT geosub_set_field_label('articles', 'structured_data_type', '结构化数据类型');
SELECT geosub_set_field_label('articles', 'toc_enabled', '启用目录');
SELECT geosub_set_field_label('articles', 'noindex', '禁止收录');
SELECT geosub_set_field_label('articles', 'nofollow', '禁止跟随链接');
SELECT geosub_set_field_label('articles', 'sort_order', '排序');


-- 7. 字段中文名：内容块
SELECT geosub_set_field_label('article_blocks', 'article_id', '所属文章');
SELECT geosub_set_field_label('article_blocks', 'block_type', '内容块类型');
SELECT geosub_set_field_label('article_blocks', 'sort_order', '排序');
SELECT geosub_set_field_label('article_blocks', 'heading_level', '标题级别');
SELECT geosub_set_field_label('article_blocks', 'title', '标题');
SELECT geosub_set_field_label('article_blocks', 'content_markdown', 'Markdown 内容');
SELECT geosub_set_field_label('article_blocks', 'content_html', 'HTML 内容');
SELECT geosub_set_field_label('article_blocks', 'content_json', 'JSON 内容');
SELECT geosub_set_field_label('article_blocks', 'image', '图片');
SELECT geosub_set_field_label('article_blocks', 'image_url', '图片地址');
SELECT geosub_set_field_label('article_blocks', 'image_alt', '图片 ALT');
SELECT geosub_set_field_label('article_blocks', 'image_caption', '图片说明');
SELECT geosub_set_field_label('article_blocks', 'linked_product_id', '关联产品');
SELECT geosub_set_field_label('article_blocks', 'linked_plan_id', '关联套餐');
SELECT geosub_set_field_label('article_blocks', 'linked_country_id', '关联国家');
SELECT geosub_set_field_label('article_blocks', 'ad_slot_id', '关联广告位');
SELECT geosub_set_field_label('article_blocks', 'affiliate_link_id', '关联联盟推荐');
SELECT geosub_set_field_label('article_blocks', 'status', '状态');


-- 8. 字段中文名：标签 / 关联 / 设置
SELECT geosub_set_field_label('article_tags', 'slug', 'URL 标识');
SELECT geosub_set_field_label('article_tags', 'locale', '语言');
SELECT geosub_set_field_label('article_tags', 'name', '标签名称');
SELECT geosub_set_field_label('article_tags', 'description', '标签说明');
SELECT geosub_set_field_label('article_tags', 'status', '发布状态');

SELECT geosub_set_field_label('article_tag_links', 'article_id', '文章');
SELECT geosub_set_field_label('article_tag_links', 'tag_id', '标签');

SELECT geosub_set_field_label('article_relations', 'article_id', '文章');
SELECT geosub_set_field_label('article_relations', 'relation_type', '关联类型');
SELECT geosub_set_field_label('article_relations', 'product_id', '关联产品');
SELECT geosub_set_field_label('article_relations', 'plan_id', '关联套餐');
SELECT geosub_set_field_label('article_relations', 'country_id', '关联国家');
SELECT geosub_set_field_label('article_relations', 'related_article_id', '相关文章');
SELECT geosub_set_field_label('article_relations', 'affiliate_link_id', '关联联盟推荐');
SELECT geosub_set_field_label('article_relations', 'title', '标题');
SELECT geosub_set_field_label('article_relations', 'description', '说明');
SELECT geosub_set_field_label('article_relations', 'sort_order', '排序');
SELECT geosub_set_field_label('article_relations', 'status', '状态');

SELECT geosub_set_field_label('site_settings', 'setting_key', '设置标识');
SELECT geosub_set_field_label('site_settings', 'group_name', '设置分组');
SELECT geosub_set_field_label('site_settings', 'label', '设置名称');
SELECT geosub_set_field_label('site_settings', 'value_text', '文本值');
SELECT geosub_set_field_label('site_settings', 'value_json', 'JSON 值');
SELECT geosub_set_field_label('site_settings', 'is_public', '前台可读取');
SELECT geosub_set_field_label('site_settings', 'note', '备注');

SELECT geosub_set_field_label('redirects', 'source_path', '原始路径');
SELECT geosub_set_field_label('redirects', 'target_path', '目标路径');
SELECT geosub_set_field_label('redirects', 'status_code', '状态码');
SELECT geosub_set_field_label('redirects', 'locale', '语言');
SELECT geosub_set_field_label('redirects', 'reason', '原因');
SELECT geosub_set_field_label('redirects', 'is_active', '是否启用');
SELECT geosub_set_field_label('redirects', 'hit_count', '命中次数');

SELECT geosub_set_field_label('navigation_items', 'locale', '语言');
SELECT geosub_set_field_label('navigation_items', 'label', '菜单名称');
SELECT geosub_set_field_label('navigation_items', 'href', '链接');
SELECT geosub_set_field_label('navigation_items', 'position', '菜单位置');
SELECT geosub_set_field_label('navigation_items', 'parent_id', '上级菜单');
SELECT geosub_set_field_label('navigation_items', 'icon', '图标');
SELECT geosub_set_field_label('navigation_items', 'external', '外部链接');
SELECT geosub_set_field_label('navigation_items', 'status', '状态');
SELECT geosub_set_field_label('navigation_items', 'sort_order', '排序');

SELECT geosub_set_field_label('internal_links', 'source_type', '来源类型');
SELECT geosub_set_field_label('internal_links', 'source_id', '来源 ID');
SELECT geosub_set_field_label('internal_links', 'target_type', '目标类型');
SELECT geosub_set_field_label('internal_links', 'target_id', '目标 ID');
SELECT geosub_set_field_label('internal_links', 'target_url', '目标链接');
SELECT geosub_set_field_label('internal_links', 'anchor_text', '锚文本');
SELECT geosub_set_field_label('internal_links', 'locale', '语言');
SELECT geosub_set_field_label('internal_links', 'priority', '优先级');
SELECT geosub_set_field_label('internal_links', 'status', '状态');


-- 9. M2O 字段交互优化
INSERT INTO directus_fields (
  collection,
  field,
  interface,
  options,
  display,
  display_options,
  sort,
  width
)
VALUES
  ('article_categories', 'parent_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 50, 'half'),

  ('articles', 'category_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 50, 'half'),

  ('article_blocks', 'article_id', 'select-dropdown-m2o', '{"template":"{{title}}"}', 'related-values', '{"template":"{{title}}"}', 10, 'half'),
  ('article_blocks', 'linked_product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 120, 'half'),
  ('article_blocks', 'linked_plan_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 130, 'half'),
  ('article_blocks', 'linked_country_id', 'select-dropdown-m2o', '{"template":"{{code}} - {{name_zh}}"}', 'related-values', '{"template":"{{code}} - {{name_zh}}"}', 140, 'half'),
  ('article_blocks', 'ad_slot_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 150, 'half'),
  ('article_blocks', 'affiliate_link_id', 'select-dropdown-m2o', '{"template":"{{title}}"}', 'related-values', '{"template":"{{title}}"}', 160, 'half'),

  ('article_tag_links', 'article_id', 'select-dropdown-m2o', '{"template":"{{title}}"}', 'related-values', '{"template":"{{title}}"}', 10, 'half'),
  ('article_tag_links', 'tag_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 20, 'half'),

  ('article_relations', 'article_id', 'select-dropdown-m2o', '{"template":"{{title}}"}', 'related-values', '{"template":"{{title}}"}', 10, 'half'),
  ('article_relations', 'product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 30, 'half'),
  ('article_relations', 'plan_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 40, 'half'),
  ('article_relations', 'country_id', 'select-dropdown-m2o', '{"template":"{{code}} - {{name_zh}}"}', 'related-values', '{"template":"{{code}} - {{name_zh}}"}', 50, 'half'),
  ('article_relations', 'related_article_id', 'select-dropdown-m2o', '{"template":"{{title}}"}', 'related-values', '{"template":"{{title}}"}', 60, 'half'),
  ('article_relations', 'affiliate_link_id', 'select-dropdown-m2o', '{"template":"{{title}}"}', 'related-values', '{"template":"{{title}}"}', 70, 'half'),

  ('navigation_items', 'parent_id', 'select-dropdown-m2o', '{"template":"{{label}}"}', 'related-values', '{"template":"{{label}}"}', 50, 'half')
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  sort = EXCLUDED.sort,
  width = EXCLUDED.width;


-- 10. 隐藏技术字段
INSERT INTO directus_fields (
  collection,
  field,
  hidden,
  readonly,
  sort,
  width
)
SELECT collection_name, field_name, TRUE, TRUE, 999, 'half'
FROM (
  VALUES
    ('article_categories', 'id'),
    ('articles', 'id'),
    ('article_blocks', 'id'),
    ('article_tags', 'id'),
    ('article_tag_links', 'id'),
    ('article_relations', 'id'),
    ('site_settings', 'id'),
    ('redirects', 'id'),
    ('navigation_items', 'id'),
    ('internal_links', 'id'),

    ('article_categories', 'created_at'),
    ('article_categories', 'updated_at'),
    ('articles', 'created_at'),
    ('articles', 'updated_at'),
    ('article_blocks', 'created_at'),
    ('article_blocks', 'updated_at'),
    ('article_tags', 'created_at'),
    ('article_tags', 'updated_at'),
    ('article_relations', 'created_at'),
    ('article_relations', 'updated_at'),
    ('site_settings', 'created_at'),
    ('site_settings', 'updated_at'),
    ('redirects', 'created_at'),
    ('redirects', 'updated_at'),
    ('navigation_items', 'created_at'),
    ('navigation_items', 'updated_at'),
    ('internal_links', 'created_at'),
    ('internal_links', 'updated_at')
) AS x(collection_name, field_name)
ON CONFLICT (collection, field) DO UPDATE SET
  hidden = EXCLUDED.hidden,
  readonly = EXCLUDED.readonly,
  sort = EXCLUDED.sort,
  width = EXCLUDED.width;


-- 11. 字段排序
INSERT INTO directus_fields (
  collection,
  field,
  sort,
  width
)
VALUES
  ('article_categories', 'name', 10, 'half'),
  ('article_categories', 'slug', 20, 'half'),
  ('article_categories', 'locale', 30, 'half'),
  ('article_categories', 'description', 40, 'full'),
  ('article_categories', 'parent_id', 50, 'half'),
  ('article_categories', 'seo_title', 60, 'full'),
  ('article_categories', 'seo_description', 70, 'full'),
  ('article_categories', 'status', 80, 'half'),

  ('articles', 'title', 10, 'full'),
  ('articles', 'slug', 20, 'half'),
  ('articles', 'locale', 30, 'half'),
  ('articles', 'article_type', 40, 'half'),
  ('articles', 'category_id', 50, 'half'),
  ('articles', 'status', 60, 'half'),
  ('articles', 'excerpt', 70, 'full'),
  ('articles', 'body_markdown', 80, 'full'),
  ('articles', 'seo_title', 90, 'full'),
  ('articles', 'seo_description', 100, 'full'),
  ('articles', 'canonical_url', 110, 'full'),
  ('articles', 'published_at', 120, 'half'),
  ('articles', 'noindex', 130, 'half'),

  ('article_blocks', 'article_id', 10, 'half'),
  ('article_blocks', 'block_type', 20, 'half'),
  ('article_blocks', 'sort_order', 30, 'half'),
  ('article_blocks', 'title', 40, 'full'),
  ('article_blocks', 'content_markdown', 50, 'full'),
  ('article_blocks', 'linked_product_id', 60, 'half'),
  ('article_blocks', 'linked_country_id', 70, 'half'),
  ('article_blocks', 'ad_slot_id', 80, 'half'),
  ('article_blocks', 'affiliate_link_id', 90, 'half'),
  ('article_blocks', 'status', 100, 'half'),

  ('site_settings', 'setting_key', 10, 'half'),
  ('site_settings', 'group_name', 20, 'half'),
  ('site_settings', 'label', 30, 'full'),
  ('site_settings', 'value_text', 40, 'full'),
  ('site_settings', 'value_json', 50, 'full'),
  ('site_settings', 'is_public', 60, 'half'),
  ('site_settings', 'note', 70, 'full'),

  ('redirects', 'source_path', 10, 'half'),
  ('redirects', 'target_path', 20, 'half'),
  ('redirects', 'status_code', 30, 'half'),
  ('redirects', 'is_active', 40, 'half'),
  ('redirects', 'reason', 50, 'full'),

  ('navigation_items', 'label', 10, 'half'),
  ('navigation_items', 'href', 20, 'half'),
  ('navigation_items', 'position', 30, 'half'),
  ('navigation_items', 'locale', 40, 'half'),
  ('navigation_items', 'parent_id', 50, 'half'),
  ('navigation_items', 'status', 60, 'half'),
  ('navigation_items', 'sort_order', 70, 'half')
ON CONFLICT (collection, field) DO UPDATE SET
  sort = EXCLUDED.sort,
  width = EXCLUDED.width;


-- 12. 初始化文章分类
INSERT INTO article_categories (
  slug,
  locale,
  name,
  description,
  status,
  sort_order
)
VALUES
  ('guides', 'zh', '教程指南', '账号注册、订阅操作、地区设置等教程内容。', 'published', 10),
  ('price-analysis', 'zh', '价格分析', '订阅价格、地区差异、购买力和价格变化分析。', 'published', 20),
  ('rankings', 'zh', '榜单排行', '最便宜地区、最贵地区、推荐地区等榜单内容。', 'published', 30),
  ('comparisons', 'zh', '产品对比', 'ChatGPT vs Claude、Netflix vs Disney+ 等对比内容。', 'published', 40),
  ('methodology', 'zh', '数据说明', '数据来源、计算方法、置信度、汇率说明。', 'published', 50)
ON CONFLICT (slug, locale) DO NOTHING;


-- 13. 初始化站点设置
INSERT INTO site_settings (
  setting_key,
  group_name,
  label,
  value_text,
  is_public,
  note
)
VALUES
  ('site_name', 'brand', '站点名称', 'GeoSub', true, '前台显示的站点名称。'),
  ('site_description', 'brand', '站点描述', '全球数字订阅与游戏价格数据平台', true, '默认 SEO 描述。'),
  ('default_locale', 'i18n', '默认语言', 'zh', true, '当前默认语言。'),
  ('gtm_id', 'tracking', 'Google Tag Manager ID', '', false, '例如 GTM-XXXXXXX，后期接统计时填写。'),
  ('ga4_id', 'tracking', 'Google Analytics 4 ID', '', false, '例如 G-XXXXXXXXXX。'),
  ('adsense_client_id', 'monetization', 'AdSense Client ID', '', false, '例如 ca-pub-xxxxxxxxxxxxxxxx。')
ON CONFLICT (setting_key) DO NOTHING;


-- 14. 初始化导航菜单
CREATE UNIQUE INDEX IF NOT EXISTS uniq_navigation_locale_position_href_label
ON navigation_items(locale, position, href, label);

INSERT INTO navigation_items (
  locale,
  label,
  href,
  position,
  status,
  sort_order
)
VALUES
  ('zh', '首页', '/zh/', 'header', 'published', 10),
  ('zh', 'AI 区域定价', '/zh/ai-pricing/', 'header', 'published', 20),
  ('zh', '礼品卡比价', '/zh/gift-cards/', 'header', 'published', 30),
  ('zh', 'VPN 对比', '/zh/vpn/', 'header', 'published', 40),
  ('zh', 'AI 工具矩阵', '/zh/ai-rankings/', 'header', 'published', 50),
  ('zh', '教程指南', '/zh/guides/', 'header', 'published', 60)
ON CONFLICT (locale, position, href, label) DO NOTHING;


-- 15. 清理列表布局缓存
DO $$
BEGIN
  IF to_regclass('public.directus_presets') IS NOT NULL THEN
    DELETE FROM directus_presets
    WHERE collection IN (
      'article_categories',
      'articles',
      'article_blocks',
      'article_tags',
      'article_tag_links',
      'article_relations',
      'site_settings',
      'redirects',
      'navigation_items',
      'internal_links'
    );
  END IF;
END $$;