-- Discovery source scan history.
-- A proactive scanner writes one row per source check.

ALTER TABLE discovery_sources
ADD COLUMN IF NOT EXISTS last_content_hash TEXT,
ADD COLUMN IF NOT EXISTS last_title TEXT,
ADD COLUMN IF NOT EXISTS last_candidate_id UUID REFERENCES product_discovery_candidates(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS discovery_source_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES discovery_sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'skipped')),
  http_status INTEGER,
  final_url TEXT,
  content_hash TEXT,
  title TEXT,
  summary TEXT,
  changed BOOLEAN NOT NULL DEFAULT FALSE,
  candidate_id UUID REFERENCES product_discovery_candidates(id) ON UPDATE CASCADE ON DELETE SET NULL,
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discovery_source_checks_source_checked_idx
  ON discovery_source_checks (source_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS discovery_source_checks_changed_idx
  ON discovery_source_checks (changed, checked_at DESC);
