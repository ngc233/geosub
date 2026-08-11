-- GeoSub schema migration. Split from sql/019_discovery_source_strategy.sql; see migration-layout.json.

-- Discovery source strategy.
-- Keeps source-specific classification rules configurable and deployable.

ALTER TABLE discovery_sources
ADD COLUMN IF NOT EXISTS strategy TEXT NOT NULL DEFAULT 'auto'
  CHECK (strategy IN (
    'auto',
    'pricing_page',
    'announcement_feed',
    'marketplace',
    'competitor_page',
    'search_result'
  )),
ADD COLUMN IF NOT EXISTS promote_threshold INTEGER NOT NULL DEFAULT 60
  CHECK (promote_threshold >= 0 AND promote_threshold <= 100),
ADD COLUMN IF NOT EXISTS watch_threshold INTEGER NOT NULL DEFAULT 40
  CHECK (watch_threshold >= 0 AND watch_threshold <= 100);

ALTER TABLE discovery_source_checks
ADD COLUMN IF NOT EXISTS source_strategy TEXT NOT NULL DEFAULT 'auto'
  CHECK (source_strategy IN (
    'auto',
    'pricing_page',
    'announcement_feed',
    'marketplace',
    'competitor_page',
    'search_result'
  ));

CREATE INDEX IF NOT EXISTS discovery_sources_strategy_idx
  ON discovery_sources (status, strategy, last_checked_at);

CREATE INDEX IF NOT EXISTS discovery_source_checks_strategy_idx
  ON discovery_source_checks (source_strategy, change_kind, importance_score DESC, checked_at DESC);
