-- GeoSub backfill migration. Split from sql/055_refresh_matching_app_store_prices.sql; see migration-layout.json.

SELECT refresh_matching_app_store_prices() AS refreshed_matching_prices;
