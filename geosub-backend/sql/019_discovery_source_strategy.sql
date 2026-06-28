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

UPDATE discovery_sources
SET strategy = CASE
  WHEN source_type = 'rss' THEN 'announcement_feed'
  WHEN source_type = 'official_site' AND (
    LOWER(name) LIKE '%pricing%'
    OR LOWER(url) LIKE '%pricing%'
    OR LOWER(COALESCE(query, '')) LIKE '%pricing%'
  ) THEN 'pricing_page'
  WHEN source_type IN ('app_store', 'google_play') THEN 'marketplace'
  WHEN source_type = 'competitor' THEN 'competitor_page'
  WHEN source_type = 'search' THEN 'search_result'
  ELSE strategy
END
WHERE strategy = 'auto';

UPDATE discovery_sources
SET
  promote_threshold = CASE
    WHEN strategy = 'pricing_page' THEN 60
    WHEN strategy = 'announcement_feed' THEN 65
    WHEN strategy = 'marketplace' THEN 70
    WHEN strategy = 'competitor_page' THEN 70
    WHEN strategy = 'search_result' THEN 75
    ELSE promote_threshold
  END,
  watch_threshold = CASE
    WHEN strategy = 'search_result' THEN 50
    ELSE watch_threshold
  END;

CREATE INDEX IF NOT EXISTS discovery_sources_strategy_idx
  ON discovery_sources (status, strategy, last_checked_at);

CREATE INDEX IF NOT EXISTS discovery_source_checks_strategy_idx
  ON discovery_source_checks (source_strategy, change_kind, importance_score DESC, checked_at DESC);
