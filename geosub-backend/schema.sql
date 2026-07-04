CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE "locale" AS ENUM ('zh', 'en', 'es', 'ja', 'ko', 'de'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "publish_status" AS ENUM ('draft', 'review', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "article_status" AS ENUM ('draft', 'review', 'published', 'scheduled', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "product_category" AS ENUM ('ai', 'streaming', 'software', 'game', 'gift_card', 'vpn', 'payment', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly', 'weekly', 'quarterly', 'one_time', 'lifetime', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "billing_platform" AS ENUM ('web', 'ios', 'android', 'steam', 'gift_card', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "price_type" AS ENUM ('list_price', 'promo_price', 'student_price', 'family_price', 'bundle_price', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "data_quality" AS ENUM ('verified', 'estimated', 'stale', 'pending_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "source_level" AS ENUM ('A', 'B', 'C', 'D', 'E'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "price_source_type" AS ENUM ('official_page', 'help_center', 'api', 'app_store', 'google_play', 'crawler', 'third_party', 'manual', 'user_submission'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "source_status" AS ENUM ('active', 'paused', 'deprecated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "risk_level" AS ENUM ('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "observation_status" AS ENUM ('pending', 'approved', 'rejected', 'ignored'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "tax_included" AS ENUM ('true', 'false', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "evidence_type" AS ENUM ('html', 'json', 'screenshot', 'text_snapshot', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "review_target_type" AS ENUM ('region_price', 'observation', 'product', 'seo', 'affiliate', 'ad_slot', 'article'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "review_status" AS ENUM ('pending', 'approved', 'rejected', 'resolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "severity" AS ENUM ('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "article_type" AS ENUM ('guide', 'how_to', 'comparison', 'ranking', 'news', 'methodology', 'faq_hub', 'review', 'announcement', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "block_type" AS ENUM ('paragraph', 'heading', 'image', 'table', 'callout', 'quote', 'code', 'price_table', 'product_card', 'country_card', 'affiliate_box', 'ad_slot', 'faq', 'toc', 'related_articles', 'custom_html'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "relation_type" AS ENUM ('related_product', 'related_plan', 'related_country', 'related_article', 'recommended_reading', 'source_reference', 'commercial_recommendation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ad_provider" AS ENUM ('adsense', 'ezoic', 'custom', 'affiliate', 'none'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "page_type" AS ENUM ('home', 'category', 'product', 'ranking', 'compare', 'article', 'global'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "affiliate_category" AS ENUM ('vpn', 'payment', 'official', 'service', 'gift_card', 'software', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "navigation_position" AS ENUM ('header', 'footer', 'sidebar', 'mobile', 'article_toc', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "structured_data_type" AS ENUM ('Article', 'BlogPosting', 'HowTo', 'FAQPage', 'NewsArticle', 'TechArticle', 'None'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "admin_role" AS ENUM ('owner', 'editor', 'viewer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "admin_status" AS ENUM ('active', 'disabled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role admin_role NOT NULL DEFAULT 'owner',
  status admin_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  uploaded_by_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_es TEXT,
  name_ja TEXT,
  currency TEXT NOT NULL,
  region TEXT,
  is_reference BOOLEAN NOT NULL DEFAULT FALSE,
  is_supported BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category product_category NOT NULL DEFAULT 'ai',
  provider TEXT,
  logo_file UUID,
  logo_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  logo_url TEXT,
  description TEXT,
  official_url TEXT,
  status publish_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  description TEXT,
  status publish_status NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, slug)
);

CREATE TABLE IF NOT EXISTS price_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_level source_level NOT NULL DEFAULT 'C',
  type price_source_type NOT NULL DEFAULT 'manual',
  provider TEXT,
  base_url TEXT,
  country_url_pattern TEXT,
  requires_javascript BOOLEAN NOT NULL DEFAULT FALSE,
  requires_account BOOLEAN NOT NULL DEFAULT FALSE,
  requires_geo BOOLEAN NOT NULL DEFAULT FALSE,
  terms_risk risk_level NOT NULL DEFAULT 'low',
  reliability_score INTEGER NOT NULL DEFAULT 60 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  status source_status NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate NUMERIC(18, 8) NOT NULL,
  source TEXT,
  rate_date DATE NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_latest BOOLEAN NOT NULL DEFAULT FALSE,
  sync_run_id UUID,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'stale',
    'archived'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (base_currency, quote_currency, rate_date, source)
);

CREATE TABLE IF NOT EXISTS exchange_rate_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  base_currency TEXT NOT NULL,
  quote_currencies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running',
    'succeeded',
    'partial',
    'failed'
  )),
  requested_url TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exchange_rates_sync_run_id_fkey'
  ) THEN
    ALTER TABLE exchange_rates
      ADD CONSTRAINT exchange_rates_sync_run_id_fkey
      FOREIGN KEY (sync_run_id)
      REFERENCES exchange_rate_sync_runs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS region_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  local_price NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  price_usd NUMERIC(12, 2) NOT NULL,
  us_base_price NUMERIC(12, 2),
  diff_vs_us_percent NUMERIC(8, 2),
  billing_platform billing_platform NOT NULL DEFAULT 'web',
  price_type price_type NOT NULL DEFAULT 'list_price',
  tax_note TEXT,
  availability_note TEXT,
  source_summary TEXT,
  primary_source_id UUID REFERENCES price_sources(id) ON DELETE SET NULL,
  confidence_score INTEGER NOT NULL DEFAULT 60 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  data_quality data_quality NOT NULL DEFAULT 'pending_review',
  status publish_status NOT NULL DEFAULT 'draft',
  last_checked_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, country_id, billing_platform, price_type)
);

CREATE TABLE IF NOT EXISTS price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
  source_id UUID REFERENCES price_sources(id) ON DELETE SET NULL,
  source_level source_level NOT NULL DEFAULT 'C',
  raw_price NUMERIC(12, 2),
  currency TEXT,
  converted_usd NUMERIC(12, 2),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_url TEXT,
  locale TEXT,
  ip_country TEXT,
  billing_platform billing_platform NOT NULL DEFAULT 'unknown',
  price_type price_type NOT NULL DEFAULT 'list_price',
  tax_included tax_included NOT NULL DEFAULT 'unknown',
  raw_payload JSONB,
  parser_version TEXT,
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  anomaly_flag BOOLEAN NOT NULL DEFAULT FALSE,
  anomaly_reason TEXT,
  status observation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES price_observations(id) ON DELETE CASCADE,
  evidence_type evidence_type NOT NULL DEFAULT 'html',
  storage_url TEXT,
  content_hash TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  http_status INTEGER,
  final_url TEXT,
  user_agent TEXT,
  country_context TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type review_target_type NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  severity severity NOT NULL DEFAULT 'medium',
  status review_status NOT NULL DEFAULT 'pending',
  assigned_to TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  article_id UUID,
  category_id UUID,
  locale locale NOT NULL DEFAULT 'zh',
  title TEXT NOT NULL,
  description TEXT,
  h1 TEXT,
  canonical_url TEXT,
  schema_type structured_data_type NOT NULL DEFAULT 'None',
  status publish_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  article_id UUID,
  locale locale NOT NULL DEFAULT 'zh',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category affiliate_category NOT NULL DEFAULT 'official',
  title TEXT NOT NULL,
  description TEXT,
  button_text TEXT,
  url TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'product_after_map',
  locale locale NOT NULL DEFAULT 'zh',
  priority INTEGER NOT NULL DEFAULT 0,
  status publish_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  page_type page_type NOT NULL DEFAULT 'product',
  provider ad_provider NOT NULL DEFAULT 'adsense',
  code TEXT,
  status publish_status NOT NULL DEFAULT 'draft',
  priority INTEGER NOT NULL DEFAULT 0,
  show_on_mobile BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_desktop BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS article_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  locale locale NOT NULL DEFAULT 'zh',
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES article_categories(id) ON DELETE SET NULL,
  seo_title TEXT,
  seo_description TEXT,
  status publish_status NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  locale locale NOT NULL DEFAULT 'zh',
  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  article_type article_type NOT NULL DEFAULT 'guide',
  category_id UUID REFERENCES article_categories(id) ON DELETE SET NULL,
  cover_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  author_name TEXT DEFAULT 'GeoSub Editor',
  body_markdown TEXT,
  body_html TEXT,
  body_json JSONB,
  status article_status NOT NULL DEFAULT 'draft',
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
  og_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  og_image_url TEXT,
  structured_data_type structured_data_type NOT NULL DEFAULT 'Article',
  toc_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  noindex BOOLEAN NOT NULL DEFAULT FALSE,
  nofollow BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS article_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  block_type block_type NOT NULL DEFAULT 'paragraph',
  sort_order INTEGER NOT NULL DEFAULT 0,
  heading_level INTEGER,
  title TEXT,
  content_markdown TEXT,
  content_html TEXT,
  content_json JSONB,
  image_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  image_url TEXT,
  image_alt TEXT,
  image_caption TEXT,
  linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  linked_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  linked_country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
  ad_slot_id UUID REFERENCES ad_slots(id) ON DELETE SET NULL,
  affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  status publish_status NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  locale locale NOT NULL DEFAULT 'zh',
  name TEXT NOT NULL,
  description TEXT,
  status publish_status NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slug, locale)
);

CREATE TABLE IF NOT EXISTS article_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES article_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS article_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  relation_type relation_type NOT NULL DEFAULT 'recommended_reading',
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  related_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status publish_status NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path TEXT NOT NULL UNIQUE,
  target_path TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301,
  locale locale,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale locale NOT NULL DEFAULT 'zh',
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  position navigation_position NOT NULL DEFAULT 'header',
  parent_id UUID REFERENCES navigation_items(id) ON DELETE SET NULL,
  icon TEXT,
  external BOOLEAN NOT NULL DEFAULT FALSE,
  status publish_status NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id UUID,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_url TEXT,
  anchor_text TEXT NOT NULL,
  locale locale NOT NULL DEFAULT 'zh',
  priority INTEGER NOT NULL DEFAULT 0,
  status publish_status NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_meta_article_id_fkey'
  ) THEN
    ALTER TABLE seo_meta
      ADD CONSTRAINT seo_meta_article_id_fkey
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_meta_category_id_fkey'
  ) THEN
    ALTER TABLE seo_meta
      ADD CONSTRAINT seo_meta_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES article_categories(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'faqs_article_id_fkey'
  ) THEN
    ALTER TABLE faqs
      ADD CONSTRAINT faqs_article_id_fkey
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS collector_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES price_sources(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'price_check' CHECK (job_type IN (
    'price_check',
    'steam_sync',
    'ai_pricing',
    'streaming_pricing',
    'exchange_rate',
    'screenshot',
    'other'
  )),
  schedule TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'paused',
    'failed',
    'archived'
  )),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parser_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES price_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  selector_config JSONB,
  regex_config JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'active',
    'deprecated'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category, status);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON media_assets(uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_plans_product_status ON plans(product_id, status);
CREATE INDEX IF NOT EXISTS idx_region_prices_plan_country ON region_prices(plan_id, country_id);
CREATE INDEX IF NOT EXISTS idx_region_prices_status ON region_prices(status);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_date ON exchange_rates(base_currency, quote_currency, rate_date DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_latest ON exchange_rates(base_currency, quote_currency, source) WHERE is_latest;
CREATE INDEX IF NOT EXISTS idx_exchange_rate_sync_runs_started_at ON exchange_rate_sync_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_observations_product_country ON price_observations(product_id, country_id);
CREATE INDEX IF NOT EXISTS idx_price_observations_status ON price_observations(status);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
CREATE INDEX IF NOT EXISTS idx_seo_meta_locale ON seo_meta(locale);
CREATE INDEX IF NOT EXISTS idx_seo_meta_article_id ON seo_meta(article_id);
CREATE INDEX IF NOT EXISTS idx_seo_meta_category_id ON seo_meta(category_id);
CREATE INDEX IF NOT EXISTS idx_faqs_locale_status ON faqs(locale, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_status ON affiliate_links(status);
CREATE INDEX IF NOT EXISTS idx_ad_slots_slot_key ON ad_slots(slot_key);
CREATE INDEX IF NOT EXISTS idx_article_categories_locale_status ON article_categories(locale, status);
CREATE INDEX IF NOT EXISTS idx_articles_locale_status ON articles(locale, status);
CREATE INDEX IF NOT EXISTS idx_articles_type_status ON articles(article_type, status);
CREATE INDEX IF NOT EXISTS idx_articles_category_status ON articles(category_id, status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_deleted_at ON articles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_article_blocks_article_sort ON article_blocks(article_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_article_tags_locale_status ON article_tags(locale, status);
CREATE INDEX IF NOT EXISTS idx_article_relations_article_type ON article_relations(article_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_article_relations_product_id ON article_relations(product_id);
CREATE INDEX IF NOT EXISTS idx_redirects_active ON redirects(is_active);
CREATE INDEX IF NOT EXISTS idx_navigation_items_locale_position ON navigation_items(locale, position, status);
CREATE INDEX IF NOT EXISTS idx_internal_links_source ON internal_links(source_type, source_id, locale);
CREATE INDEX IF NOT EXISTS idx_internal_links_target ON internal_links(target_type, target_id, locale);
CREATE INDEX IF NOT EXISTS idx_tracking_events_event_key ON tracking_events(event_key);

DROP TRIGGER IF EXISTS trg_countries_updated_at ON countries;
CREATE TRIGGER trg_countries_updated_at BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_price_sources_updated_at ON price_sources;
CREATE TRIGGER trg_price_sources_updated_at BEFORE UPDATE ON price_sources FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_exchange_rates_updated_at ON exchange_rates;
CREATE TRIGGER trg_exchange_rates_updated_at BEFORE UPDATE ON exchange_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_exchange_rate_sync_runs_updated_at ON exchange_rate_sync_runs;
CREATE TRIGGER trg_exchange_rate_sync_runs_updated_at BEFORE UPDATE ON exchange_rate_sync_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_region_prices_updated_at ON region_prices;
CREATE TRIGGER trg_region_prices_updated_at BEFORE UPDATE ON region_prices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_price_observations_updated_at ON price_observations;
CREATE TRIGGER trg_price_observations_updated_at BEFORE UPDATE ON price_observations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_review_queue_updated_at ON review_queue;
CREATE TRIGGER trg_review_queue_updated_at BEFORE UPDATE ON review_queue FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_seo_meta_updated_at ON seo_meta;
CREATE TRIGGER trg_seo_meta_updated_at BEFORE UPDATE ON seo_meta FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_faqs_updated_at ON faqs;
CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_affiliate_links_updated_at ON affiliate_links;
CREATE TRIGGER trg_affiliate_links_updated_at BEFORE UPDATE ON affiliate_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ad_slots_updated_at ON ad_slots;
CREATE TRIGGER trg_ad_slots_updated_at BEFORE UPDATE ON ad_slots FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_article_categories_updated_at ON article_categories;
CREATE TRIGGER trg_article_categories_updated_at BEFORE UPDATE ON article_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;
CREATE TRIGGER trg_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_article_blocks_updated_at ON article_blocks;
CREATE TRIGGER trg_article_blocks_updated_at BEFORE UPDATE ON article_blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_article_tags_updated_at ON article_tags;
CREATE TRIGGER trg_article_tags_updated_at BEFORE UPDATE ON article_tags FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_article_relations_updated_at ON article_relations;
CREATE TRIGGER trg_article_relations_updated_at BEFORE UPDATE ON article_relations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_redirects_updated_at ON redirects;
CREATE TRIGGER trg_redirects_updated_at BEFORE UPDATE ON redirects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_navigation_items_updated_at ON navigation_items;
CREATE TRIGGER trg_navigation_items_updated_at BEFORE UPDATE ON navigation_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_internal_links_updated_at ON internal_links;
CREATE TRIGGER trg_internal_links_updated_at BEFORE UPDATE ON internal_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_collector_jobs_updated_at ON collector_jobs;
CREATE TRIGGER trg_collector_jobs_updated_at BEFORE UPDATE ON collector_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_parser_rules_updated_at ON parser_rules;
CREATE TRIGGER trg_parser_rules_updated_at BEFORE UPDATE ON parser_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tracking_events_updated_at ON tracking_events;
CREATE TRIGGER trg_tracking_events_updated_at BEFORE UPDATE ON tracking_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON media_assets;
CREATE TRIGGER trg_media_assets_updated_at BEFORE UPDATE ON media_assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON site_settings;
CREATE TRIGGER trg_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION upsert_exchange_rate(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_rate NUMERIC,
  p_rate_date DATE,
  p_source TEXT,
  p_fetched_at TIMESTAMPTZ DEFAULT NOW(),
  p_sync_run_id UUID DEFAULT NULL,
  p_provider_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_rate_id UUID;
  v_base_currency TEXT := UPPER(TRIM(p_base_currency));
  v_quote_currency TEXT := UPPER(TRIM(p_quote_currency));
  v_source TEXT := NULLIF(TRIM(p_source), '');
BEGIN
  IF v_base_currency IS NULL OR v_quote_currency IS NULL THEN
    RAISE EXCEPTION 'base_currency and quote_currency are required';
  END IF;

  IF v_base_currency = v_quote_currency THEN
    RAISE EXCEPTION 'base_currency and quote_currency must be different';
  END IF;

  IF p_rate IS NULL OR p_rate <= 0 THEN
    RAISE EXCEPTION 'rate must be greater than zero';
  END IF;

  UPDATE exchange_rates
  SET is_latest = FALSE,
      status = CASE WHEN status = 'active' THEN 'stale' ELSE status END
  WHERE base_currency = v_base_currency
    AND quote_currency = v_quote_currency
    AND COALESCE(source, '') = COALESCE(v_source, '')
    AND is_latest = TRUE;

  INSERT INTO exchange_rates (
    base_currency,
    quote_currency,
    rate,
    source,
    rate_date,
    fetched_at,
    is_latest,
    sync_run_id,
    provider_payload,
    status
  )
  VALUES (
    v_base_currency,
    v_quote_currency,
    p_rate,
    v_source,
    p_rate_date,
    p_fetched_at,
    TRUE,
    p_sync_run_id,
    COALESCE(p_provider_payload, '{}'::jsonb),
    'active'
  )
  ON CONFLICT (base_currency, quote_currency, rate_date, source)
  DO UPDATE SET
    rate = EXCLUDED.rate,
    fetched_at = EXCLUDED.fetched_at,
    is_latest = TRUE,
    sync_run_id = EXCLUDED.sync_run_id,
    provider_payload = EXCLUDED.provider_payload,
    error_message = NULL,
    status = 'active',
    updated_at = NOW()
  RETURNING id INTO v_rate_id;

  UPDATE exchange_rates
  SET is_latest = FALSE,
      status = CASE WHEN status = 'active' THEN 'stale' ELSE status END
  WHERE base_currency = v_base_currency
    AND quote_currency = v_quote_currency
    AND COALESCE(source, '') = COALESCE(v_source, '')
    AND id <> v_rate_id
    AND is_latest = TRUE;

  RETURN v_rate_id;
END;
$$;

CREATE OR REPLACE VIEW latest_exchange_rates AS
SELECT DISTINCT ON (base_currency, quote_currency, source)
  id,
  base_currency,
  quote_currency,
  rate,
  source,
  rate_date,
  fetched_at,
  is_latest,
  status,
  sync_run_id,
  provider_payload,
  created_at,
  updated_at
FROM exchange_rates
WHERE status = 'active'
ORDER BY base_currency, quote_currency, source, is_latest DESC, rate_date DESC, fetched_at DESC;

CREATE OR REPLACE FUNCTION get_latest_exchange_rate(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  base_currency TEXT,
  quote_currency TEXT,
  rate NUMERIC,
  source TEXT,
  rate_date DATE,
  fetched_at TIMESTAMPTZ,
  is_latest BOOLEAN,
  status TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    er.id,
    er.base_currency,
    er.quote_currency,
    er.rate,
    er.source,
    er.rate_date,
    er.fetched_at,
    er.is_latest,
    er.status
  FROM exchange_rates er
  WHERE er.base_currency = UPPER(TRIM(p_base_currency))
    AND er.quote_currency = UPPER(TRIM(p_quote_currency))
    AND er.status = 'active'
    AND (
      p_source IS NULL
      OR COALESCE(er.source, '') = COALESCE(NULLIF(TRIM(p_source), ''), '')
    )
  ORDER BY er.is_latest DESC, er.rate_date DESC, er.fetched_at DESC
  LIMIT 1;
$$;

INSERT INTO countries (code, name_zh, name_en, currency, region, is_reference, sort_order)
VALUES
  ('US', '美国', 'United States', 'USD', 'North America', TRUE, 1),
  ('CA', '加拿大', 'Canada', 'CAD', 'North America', FALSE, 2),
  ('MX', '墨西哥', 'Mexico', 'MXN', 'North America', FALSE, 3),
  ('BR', '巴西', 'Brazil', 'BRL', 'South America', FALSE, 4),
  ('AR', '阿根廷', 'Argentina', 'ARS', 'South America', FALSE, 5),
  ('GB', '英国', 'United Kingdom', 'GBP', 'Europe', FALSE, 6),
  ('DE', '德国', 'Germany', 'EUR', 'Europe', FALSE, 7),
  ('FR', '法国', 'France', 'EUR', 'Europe', FALSE, 8),
  ('ES', '西班牙', 'Spain', 'EUR', 'Europe', FALSE, 9),
  ('IT', '意大利', 'Italy', 'EUR', 'Europe', FALSE, 10),
  ('NL', '荷兰', 'Netherlands', 'EUR', 'Europe', FALSE, 11),
  ('DK', '丹麦', 'Denmark', 'DKK', 'Europe', FALSE, 12),
  ('SE', '瑞典', 'Sweden', 'SEK', 'Europe', FALSE, 13),
  ('NO', '挪威', 'Norway', 'NOK', 'Europe', FALSE, 14),
  ('CH', '瑞士', 'Switzerland', 'CHF', 'Europe', FALSE, 15),
  ('TR', '土耳其', 'Turkey', 'TRY', 'Europe / Asia', FALSE, 16),
  ('JP', '日本', 'Japan', 'JPY', 'Asia', FALSE, 17),
  ('KR', '韩国', 'South Korea', 'KRW', 'Asia', FALSE, 18),
  ('CN', '中国大陆', 'China Mainland', 'CNY', 'Asia', FALSE, 19),
  ('HK', '中国香港', 'Hong Kong', 'HKD', 'Asia', FALSE, 20),
  ('TW', '中国台湾', 'Taiwan', 'TWD', 'Asia', FALSE, 21),
  ('SG', '新加坡', 'Singapore', 'SGD', 'Asia', FALSE, 22),
  ('PH', '菲律宾', 'Philippines', 'PHP', 'Asia', FALSE, 23),
  ('IN', '印度', 'India', 'INR', 'Asia', FALSE, 24),
  ('PK', '巴基斯坦', 'Pakistan', 'PKR', 'Asia', FALSE, 25),
  ('ID', '印度尼西亚', 'Indonesia', 'IDR', 'Asia', FALSE, 26),
  ('TH', '泰国', 'Thailand', 'THB', 'Asia', FALSE, 27),
  ('MY', '马来西亚', 'Malaysia', 'MYR', 'Asia', FALSE, 28),
  ('VN', '越南', 'Vietnam', 'VND', 'Asia', FALSE, 29),
  ('AU', '澳大利亚', 'Australia', 'AUD', 'Oceania', FALSE, 30),
  ('NZ', '新西兰', 'New Zealand', 'NZD', 'Oceania', FALSE, 31),
  ('EG', '埃及', 'Egypt', 'EGP', 'Africa', FALSE, 32),
  ('ZA', '南非', 'South Africa', 'ZAR', 'Africa', FALSE, 33),
  ('NG', '尼日利亚', 'Nigeria', 'NGN', 'Africa', FALSE, 34)
ON CONFLICT (code) DO NOTHING;

INSERT INTO tracking_events (event_key, event_name, description, enabled)
VALUES
  ('view_product_page', '查看产品页', '用户访问产品详情页', TRUE),
  ('select_plan', '切换套餐', '用户切换产品套餐', TRUE),
  ('click_country', '点击国家', '用户点击地图或表格中的国家', TRUE),
  ('open_share_modal', '打开分享弹窗', '用户打开价格分享图弹窗', TRUE),
  ('download_share_image', '下载分享图', '用户下载价格分享图', TRUE),
  ('click_affiliate', '点击联盟链接', '用户点击 Affiliate / 推荐链接', TRUE),
  ('click_ad', '点击广告', '用户点击广告位', TRUE),
  ('copy_link', '复制链接', '用户复制页面链接', TRUE),
  ('search_product', '搜索产品', '用户搜索产品', TRUE),
  ('language_switch', '切换语言', '用户切换站点语言', TRUE)
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO ad_slots (slot_key, name, position, page_type, provider, status, priority)
VALUES
  ('product_after_map', '产品页地图下方广告', 'after_map', 'product', 'adsense', 'draft', 10),
  ('product_after_table', '产品页价格表下方广告', 'after_table', 'product', 'adsense', 'draft', 20),
  ('product_before_faq', '产品页 FAQ 上方广告', 'before_faq', 'product', 'adsense', 'draft', 30),
  ('sidebar_card', '侧边栏推荐位', 'sidebar', 'product', 'affiliate', 'draft', 40),
  ('ranking_inline', '排行榜页中部广告', 'inline', 'ranking', 'adsense', 'draft', 50)
ON CONFLICT (slot_key) DO NOTHING;
