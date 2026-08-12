SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'plans', COUNT(*) FROM plans
UNION ALL SELECT 'countries', COUNT(*) FROM countries
UNION ALL SELECT 'price_sources', COUNT(*) FROM price_sources
UNION ALL SELECT 'region_prices', COUNT(*) FROM region_prices
UNION ALL SELECT 'price_observations', COUNT(*) FROM price_observations
UNION ALL SELECT 'exchange_rates', COUNT(*) FROM exchange_rates
UNION ALL SELECT 'collector_jobs', COUNT(*) FROM collector_jobs
UNION ALL SELECT 'articles', COUNT(*) FROM articles
UNION ALL SELECT 'event_logs', COUNT(*) FROM event_logs
ORDER BY 1;
