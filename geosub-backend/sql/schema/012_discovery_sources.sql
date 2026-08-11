-- GeoSub schema migration. Split from sql/015_discovery_sources.sql; see migration-layout.json.

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
