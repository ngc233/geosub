-- Discovery source configuration.
-- Sources define where future proactive discovery jobs should look.

DO $$
BEGIN
  CREATE TYPE discovery_source_status AS ENUM (
    'active',
    'paused',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS discovery_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type discovery_candidate_source_type NOT NULL DEFAULT 'other',
  url TEXT NOT NULL,
  category_hint TEXT,
  query TEXT,
  scan_interval_hours INTEGER NOT NULL DEFAULT 24 CHECK (scan_interval_hours >= 1 AND scan_interval_hours <= 720),
  status discovery_source_status NOT NULL DEFAULT 'active',
  reliability_score INTEGER NOT NULL DEFAULT 60 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  note TEXT,
  raw_config JSONB,
  created_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS discovery_sources_url_key
  ON discovery_sources (url);

CREATE INDEX IF NOT EXISTS discovery_sources_status_idx
  ON discovery_sources (status, source_type, last_checked_at);

DROP TRIGGER IF EXISTS trg_discovery_sources_updated_at ON discovery_sources;

CREATE TRIGGER trg_discovery_sources_updated_at
BEFORE UPDATE ON discovery_sources
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();

INSERT INTO discovery_sources (
  name,
  source_type,
  url,
  category_hint,
  query,
  scan_interval_hours,
  status,
  reliability_score,
  note,
  raw_config
)
VALUES
  (
    'DeepSeek official pricing',
    'official_site'::discovery_candidate_source_type,
    'https://api-docs.deepseek.com/quick_start/pricing',
    'ai',
    'DeepSeek pricing',
    24,
    'active'::discovery_source_status,
    80,
    'Seed source for validating official pricing page monitoring.',
    jsonb_build_object('seeded_by', '015_discovery_sources.sql')
  ),
  (
    'Product Hunt AI products',
    'search'::discovery_candidate_source_type,
    'https://www.producthunt.com/categories/artificial-intelligence',
    'ai',
    'new AI products',
    24,
    'paused'::discovery_source_status,
    55,
    'Candidate discovery source. Keep paused until parser rules are implemented.',
    jsonb_build_object('seeded_by', '015_discovery_sources.sql')
  )
ON CONFLICT (url) DO NOTHING;
