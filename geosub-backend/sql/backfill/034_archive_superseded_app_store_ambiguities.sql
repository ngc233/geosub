-- GeoSub backfill migration. Split from sql/071_archive_superseded_app_store_ambiguities.sql; see migration-layout.json.

SELECT archive_superseded_app_store_ambiguities()
  AS archived_superseded_app_store_ambiguities;
