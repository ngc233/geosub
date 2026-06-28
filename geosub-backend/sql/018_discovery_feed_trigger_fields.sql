-- Feed-aware discovery checks.
-- These fields record the concrete feed item/article that triggered a check.

ALTER TABLE discovery_source_checks
ADD COLUMN IF NOT EXISTS trigger_url TEXT,
ADD COLUMN IF NOT EXISTS trigger_external_id TEXT,
ADD COLUMN IF NOT EXISTS trigger_published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trigger_payload JSONB;

CREATE INDEX IF NOT EXISTS discovery_source_checks_trigger_url_idx
  ON discovery_source_checks (trigger_url)
  WHERE trigger_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS discovery_source_checks_trigger_published_idx
  ON discovery_source_checks (trigger_published_at DESC)
  WHERE trigger_published_at IS NOT NULL;
