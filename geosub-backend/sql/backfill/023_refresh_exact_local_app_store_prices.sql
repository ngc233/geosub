-- GeoSub backfill migration. Split from sql/056_refresh_exact_local_app_store_prices.sql; see migration-layout.json.

SELECT refresh_matching_app_store_prices() AS refreshed_exact_local_prices;
