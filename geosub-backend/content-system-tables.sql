-- GeoSub Content System Tables v1
-- 文章系统 / 站点设置 / 导航 / 重定向 / 内链管理
-- 只建表，不注册 Directus 后台显示

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 1. 文章分类
CREATE TABLE IF NOT EXISTS article_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh' CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),

  name TEXT NOT NULL,
  description TEXT,

  parent_id UUID REFERENCES article_categories(id) ON DELETE SET NULL,

  seo_title TEXT,
  seo_description TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (slug, locale)
);


-- 2. 文章主体
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh' CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),

  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT,

  article_type TEXT NOT NULL DEFAULT 'guide' CHECK (article_type IN (
    'guide',
    'how_to',
    'comparison',
    'ranking',
    'news',
    'methodology',
    'faq_hub',
    'review',
    'announcement',
    'other'
  )),

  category_id UUID REFERENCES article_categories(id) ON DELETE SET NULL,

  cover_image UUID REFERENCES directus_files(id) ON DELETE SET NULL,
  cover_image_url TEXT,

  author_name TEXT DEFAULT 'GeoSub 编辑部',

  body_markdown TEXT,
  body_html TEXT,
  body_json JSONB,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'review',
    'published',
    'scheduled',
    'archived'
  )),

  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  reading_time INTEGER,

  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,

  canonical_url TEXT,

  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,

  og_title TEXT,
  og_description TEXT,
  og_image UUID REFERENCES directus_files(id) ON DELETE SET NULL,
  og_image_url TEXT,

  structured_data_type TEXT NOT NULL DEFAULT 'Article' CHECK (structured_data_type IN (
    'Article',
    'BlogPosting',
    'HowTo',
    'FAQPage',
    'NewsArticle',
    'TechArticle',
    'None'
  )),

  toc_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  noindex BOOLEAN NOT NULL DEFAULT FALSE,
  nofollow BOOLEAN NOT NULL DEFAULT FALSE,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (slug, locale)
);


-- 3. 文章内容块
CREATE TABLE IF NOT EXISTS article_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,

  block_type TEXT NOT NULL DEFAULT 'paragraph' CHECK (block_type IN (
    'paragraph',
    'heading',
    'image',
    'table',
    'callout',
    'quote',
    'code',
    'price_table',
    'product_card',
    'country_card',
    'affiliate_box',
    'ad_slot',
    'faq',
    'toc',
    'related_articles',
    'custom_html'
  )),

  sort_order INTEGER NOT NULL DEFAULT 0,

  heading_level INTEGER CHECK (
    heading_level IS NULL OR heading_level BETWEEN 2 AND 4
  ),

  title TEXT,

  content_markdown TEXT,
  content_html TEXT,
  content_json JSONB,

  image UUID REFERENCES directus_files(id) ON DELETE SET NULL,
  image_url TEXT,
  image_alt TEXT,
  image_caption TEXT,

  linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  linked_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  linked_country_id UUID REFERENCES countries(id) ON DELETE SET NULL,

  ad_slot_id UUID REFERENCES ad_slots(id) ON DELETE SET NULL,
  affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 4. 文章标签
CREATE TABLE IF NOT EXISTS article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh' CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),

  name TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (slug, locale)
);


-- 5. 文章标签关系
CREATE TABLE IF NOT EXISTS article_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES article_tags(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (article_id, tag_id)
);


-- 6. 文章关联：产品 / 套餐 / 国家 / 相关文章 / Affiliate
CREATE TABLE IF NOT EXISTS article_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,

  relation_type TEXT NOT NULL DEFAULT 'recommended_reading' CHECK (relation_type IN (
    'related_product',
    'related_plan',
    'related_country',
    'related_article',
    'recommended_reading',
    'source_reference',
    'commercial_recommendation'
  )),

  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  related_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,

  title TEXT,
  description TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 7. 站点设置
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  setting_key TEXT NOT NULL UNIQUE,
  group_name TEXT NOT NULL DEFAULT 'general',

  label TEXT NOT NULL,

  value_text TEXT,
  value_json JSONB,

  is_public BOOLEAN NOT NULL DEFAULT FALSE,

  note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 8. 301 / 302 重定向
CREATE TABLE IF NOT EXISTS redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_path TEXT NOT NULL UNIQUE,
  target_path TEXT NOT NULL,

  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (
    301,
    302,
    307,
    308
  )),

  locale TEXT CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),

  reason TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  hit_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 9. 导航菜单
CREATE TABLE IF NOT EXISTS navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  locale TEXT NOT NULL DEFAULT 'zh' CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),

  label TEXT NOT NULL,
  href TEXT NOT NULL,

  position TEXT NOT NULL DEFAULT 'header' CHECK (position IN (
    'header',
    'footer',
    'sidebar',
    'mobile',
    'article_toc',
    'other'
  )),

  parent_id UUID REFERENCES navigation_items(id) ON DELETE SET NULL,

  icon TEXT,
  external BOOLEAN NOT NULL DEFAULT FALSE,

  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 10. 内链管理
CREATE TABLE IF NOT EXISTS internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_type TEXT NOT NULL CHECK (source_type IN (
    'article',
    'product',
    'category',
    'ranking',
    'compare',
    'home'
  )),

  source_id UUID,

  target_type TEXT NOT NULL CHECK (target_type IN (
    'article',
    'product',
    'category',
    'ranking',
    'compare',
    'external'
  )),

  target_id UUID,
  target_url TEXT,

  anchor_text TEXT NOT NULL,

  locale TEXT NOT NULL DEFAULT 'zh' CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),

  priority INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 索引
CREATE INDEX IF NOT EXISTS idx_article_categories_locale_status
ON article_categories(locale, status);

CREATE INDEX IF NOT EXISTS idx_articles_locale_status
ON articles(locale, status);

CREATE INDEX IF NOT EXISTS idx_articles_type_status
ON articles(article_type, status);

CREATE INDEX IF NOT EXISTS idx_articles_category_status
ON articles(category_id, status);

CREATE INDEX IF NOT EXISTS idx_articles_published_at
ON articles(published_at);

CREATE INDEX IF NOT EXISTS idx_article_blocks_article_sort
ON article_blocks(article_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_article_tags_locale_status
ON article_tags(locale, status);

CREATE INDEX IF NOT EXISTS idx_article_relations_article_type
ON article_relations(article_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_article_relations_product
ON article_relations(product_id);

CREATE INDEX IF NOT EXISTS idx_redirects_source_path
ON redirects(source_path);

CREATE INDEX IF NOT EXISTS idx_redirects_active
ON redirects(is_active);

CREATE INDEX IF NOT EXISTS idx_navigation_items_locale_position
ON navigation_items(locale, position, status);

CREATE INDEX IF NOT EXISTS idx_internal_links_source
ON internal_links(source_type, source_id, locale);

CREATE INDEX IF NOT EXISTS idx_internal_links_target
ON internal_links(target_type, target_id, locale);


-- 更新时间触发器
DROP TRIGGER IF EXISTS trg_article_categories_updated_at ON article_categories;
CREATE TRIGGER trg_article_categories_updated_at
BEFORE UPDATE ON article_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;
CREATE TRIGGER trg_articles_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_article_blocks_updated_at ON article_blocks;
CREATE TRIGGER trg_article_blocks_updated_at
BEFORE UPDATE ON article_blocks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_article_tags_updated_at ON article_tags;
CREATE TRIGGER trg_article_tags_updated_at
BEFORE UPDATE ON article_tags
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_article_relations_updated_at ON article_relations;
CREATE TRIGGER trg_article_relations_updated_at
BEFORE UPDATE ON article_relations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON site_settings;
CREATE TRIGGER trg_site_settings_updated_at
BEFORE UPDATE ON site_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_redirects_updated_at ON redirects;
CREATE TRIGGER trg_redirects_updated_at
BEFORE UPDATE ON redirects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_navigation_items_updated_at ON navigation_items;
CREATE TRIGGER trg_navigation_items_updated_at
BEFORE UPDATE ON navigation_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_internal_links_updated_at ON internal_links;
CREATE TRIGGER trg_internal_links_updated_at
BEFORE UPDATE ON internal_links
FOR EACH ROW EXECUTE FUNCTION set_updated_at();