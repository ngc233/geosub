-- Manual discovery scan queue.
-- Keeps "run this source soon" separate from historical last_checked_at.

ALTER TABLE discovery_sources
ADD COLUMN IF NOT EXISTS manual_scan_requested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS discovery_sources_manual_scan_idx
  ON discovery_sources (manual_scan_requested_at)
  WHERE manual_scan_requested_at IS NOT NULL;
