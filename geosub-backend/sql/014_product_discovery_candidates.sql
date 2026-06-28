-- Product discovery candidates.
-- This is separate from the manual product library and formal price collectors.

DO $$
BEGIN
  CREATE TYPE discovery_candidate_status AS ENUM (
    'new',
    'watching',
    'promoted',
    'ignored',
    'merged'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE discovery_candidate_source_type AS ENUM (
    'manual_tip',
    'official_site',
    'app_store',
    'google_play',
    'rss',
    'search',
    'competitor',
    'social',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS product_discovery_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  suggested_slug TEXT,
  suggested_category product_category NOT NULL DEFAULT 'ai',
  provider TEXT,
  official_url TEXT,
  app_store_url TEXT,
  app_store_id TEXT,
  google_play_url TEXT,
  google_play_package TEXT,
  pricing_url TEXT,
  source_type discovery_candidate_source_type NOT NULL DEFAULT 'other',
  source_name TEXT,
  source_url TEXT,
  discovery_reason TEXT,
  confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  status discovery_candidate_status NOT NULL DEFAULT 'new',
  matched_product_id UUID REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
  promoted_product_id UUID REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
  reviewed_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  raw_payload JSONB,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_discovery_candidates_suggested_slug_key
  ON product_discovery_candidates (suggested_slug)
  WHERE suggested_slug IS NOT NULL AND status IN ('new', 'watching');

CREATE INDEX IF NOT EXISTS product_discovery_candidates_status_idx
  ON product_discovery_candidates (status, confidence_score DESC, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS product_discovery_candidates_source_idx
  ON product_discovery_candidates (source_type, last_seen_at DESC);

CREATE TRIGGER trg_product_discovery_candidates_updated_at
BEFORE UPDATE ON product_discovery_candidates
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();

INSERT INTO product_discovery_candidates (
  name,
  suggested_slug,
  suggested_category,
  provider,
  official_url,
  pricing_url,
  source_type,
  source_name,
  source_url,
  discovery_reason,
  confidence_score,
  status,
  raw_payload
)
VALUES (
  'DeepSeek',
  'deepseek',
  'ai'::product_category,
  'DeepSeek',
  'https://www.deepseek.com/',
  'https://api-docs.deepseek.com/quick_start/pricing',
  'manual_tip'::discovery_candidate_source_type,
  'GeoSub initial candidate',
  'https://www.deepseek.com/',
  'User-mentioned AI service. Add to candidate pool before formal product onboarding.',
  78,
  'new'::discovery_candidate_status,
  jsonb_build_object(
    'seeded_by', '014_product_discovery_candidates.sql',
    'next_step', 'Review official URL, pricing URL, app store sources, then promote to product library.'
  )
)
ON CONFLICT DO NOTHING;
