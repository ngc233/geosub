CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN (
    'owner',
    'editor',
    'viewer'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'disabled'
  )),
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
  category TEXT NOT NULL DEFAULT 'ai' CHECK (category IN (
    'ai',
    'streaming',
    'software',
    'game',
    'gift_card',
    'vpn',
    'payment',
    'other'
  )),
  provider TEXT,
  logo_file UUID,
  logo_url TEXT,
  description TEXT,
  official_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'review',
    'published',
    'archived'
  )),
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
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN (
    'monthly',
    'yearly',
    'weekly',
    'quarterly',
    'one_time',
    'lifetime',
    'unknown'
  )),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'review',
    'published',
    'archived'
  )),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, slug)
);

CREATE TABLE IF NOT EXISTS price_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_level TEXT NOT NULL DEFAULT 'C' CHECK (source_level IN (
    'A',
    'B',
    'C',
    'D',
    'E'
  )),
  type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN (
    'official_page',
    'help_center',
    'api',
    'app_store',
    'google_play',
    'crawler',
    'third_party',
    'manual',
    'user_submission'
  )),
  provider TEXT,
  base_url TEXT,
  country_url_pattern TEXT,
  requires_javascript BOOLEAN NOT NULL DEFAULT FALSE,
  requires_account BOOLEAN NOT NULL DEFAULT FALSE,
  requires_geo BOOLEAN NOT NULL DEFAULT FALSE,
  terms_risk TEXT NOT NULL DEFAULT 'low' CHECK (terms_risk IN (
    'low',
    'medium',
    'high'
  )),
  reliability_score INTEGER NOT NULL DEFAULT 60 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'paused',
    'deprecated'
  )),
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
  billing_platform TEXT NOT NULL DEFAULT 'web' CHECK (billing_platform IN (
    'web',
    'ios',
    'android',
    'steam',
    'gift_card',
    'unknown'
  )),
  price_type TEXT NOT NULL DEFAULT 'list_price' CHECK (price_type IN (
    'list_price',
    'promo_price',
    'student_price',
    'family_price',
    'bundle_price',
    'unknown'
  )),
  tax_note TEXT,
  availability_note TEXT,
  source_summary TEXT,
  primary_source_id UUID REFERENCES price_sources(id) ON DELETE SET NULL,
  confidence_score INTEGER NOT NULL DEFAULT 60 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  data_quality TEXT NOT NULL DEFAULT 'pending_review' CHECK (data_quality IN (
    'verified',
    'estimated',
    'stale',
    'pending_review'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'review',
    'published',
    'archived'
  )),
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
  source_level TEXT NOT NULL DEFAULT 'C' CHECK (source_level IN (
    'A',
    'B',
    'C',
    'D',
    'E'
  )),
  raw_price NUMERIC(12, 2),
  currency TEXT,
  converted_usd NUMERIC(12, 2),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_url TEXT,
  locale TEXT,
  ip_country TEXT,
  billing_platform TEXT NOT NULL DEFAULT 'unknown' CHECK (billing_platform IN (
    'web',
    'ios',
    'android',
    'steam',
    'gift_card',
    'unknown'
  )),
  price_type TEXT NOT NULL DEFAULT 'list_price' CHECK (price_type IN (
    'list_price',
    'promo_price',
    'student_price',
    'family_price',
    'bundle_price',
    'unknown'
  )),
  tax_included TEXT NOT NULL DEFAULT 'unknown' CHECK (tax_included IN (
    'true',
    'false',
    'unknown'
  )),
  raw_payload JSONB,
  parser_version TEXT,
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  anomaly_flag BOOLEAN NOT NULL DEFAULT FALSE,
  anomaly_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'ignored'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES price_observations(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'html' CHECK (evidence_type IN (
    'html',
    'json',
    'screenshot',
    'text_snapshot',
    'other'
  )),
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
  target_type TEXT NOT NULL CHECK (target_type IN (
    'region_price',
    'observation',
    'product',
    'seo',
    'affiliate',
    'ad_slot'
  )),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN (
    'low',
    'medium',
    'high'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'resolved'
  )),
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
  locale TEXT NOT NULL DEFAULT 'zh' CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),
  title TEXT NOT NULL,
  description TEXT,
  h1 TEXT,
  canonical_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'review',
    'published'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'zh' CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'official' CHECK (category IN (
    'vpn',
    'payment',
    'official',
    'service',
    'gift_card',
    'software',
    'other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  button_text TEXT,
  url TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'product_after_map',
  locale TEXT NOT NULL DEFAULT 'zh' CHECK (locale IN (
    'zh',
    'en',
    'es',
    'ja',
    'ko',
    'de'
  )),
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'product' CHECK (page_type IN (
    'home',
    'category',
    'product',
    'ranking',
    'compare',
    'article',
    'global'
  )),
  provider TEXT NOT NULL DEFAULT 'adsense' CHECK (provider IN (
    'adsense',
    'ezoic',
    'custom',
    'affiliate',
    'none'
  )),
  code TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'published',
    'archived'
  )),
  priority INTEGER NOT NULL DEFAULT 0,
  show_on_mobile BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_desktop BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_faqs_locale_status ON faqs(locale, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_status ON affiliate_links(status);
CREATE INDEX IF NOT EXISTS idx_ad_slots_slot_key ON ad_slots(slot_key);
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

DROP TRIGGER IF EXISTS trg_collector_jobs_updated_at ON collector_jobs;
CREATE TRIGGER trg_collector_jobs_updated_at BEFORE UPDATE ON collector_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_parser_rules_updated_at ON parser_rules;
CREATE TRIGGER trg_parser_rules_updated_at BEFORE UPDATE ON parser_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tracking_events_updated_at ON tracking_events;
CREATE TRIGGER trg_tracking_events_updated_at BEFORE UPDATE ON tracking_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
