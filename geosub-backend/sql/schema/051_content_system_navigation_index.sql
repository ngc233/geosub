-- GeoSub schema migration. Split from content-system-directus.sql.
-- Directus metadata helpers and label changes remain in explicit backfills.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_navigation_locale_position_href_label
ON navigation_items(locale, position, href, label);
