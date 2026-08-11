-- GeoSub backfill migration. Split from sql/057_quarantine_published_app_store_price_outliers.sql; see migration-layout.json.

SELECT quarantine_published_app_store_price_outliers() AS quarantined_published_outliers;
SELECT refresh_plan_affordability_metrics() AS refreshed_affordability_rows;
