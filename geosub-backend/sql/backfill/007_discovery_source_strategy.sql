-- GeoSub backfill migration. Split from sql/019_discovery_source_strategy.sql; see migration-layout.json.

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
