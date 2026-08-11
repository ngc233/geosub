-- GeoSub schema migration. Split from sql/076_event_rate_limits.sql; see migration-layout.json.

CREATE TABLE IF NOT EXISTS event_rate_limits (
  key_hash CHAR(64) PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  window_started_at TIMESTAMPTZ(6) NOT NULL,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_rate_limits_updated_at_idx
  ON event_rate_limits (updated_at);
