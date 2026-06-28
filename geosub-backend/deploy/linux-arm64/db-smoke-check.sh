#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_CONTAINER="${GEOSUB_DB_CONTAINER:-geosub-postgres}"
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Database container '$DB_CONTAINER' is not running."
  exit 1
fi

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
SELECT current_database() AS database_name;

SELECT
  to_regclass('public.products') IS NOT NULL AS has_products,
  to_regclass('public.plans') IS NOT NULL AS has_plans,
  to_regclass('public.region_prices') IS NOT NULL AS has_region_prices,
  to_regclass('public.price_observations') IS NOT NULL AS has_price_observations,
  to_regclass('public.exchange_rates') IS NOT NULL AS has_exchange_rates,
  to_regclass('public.product_discovery_candidates') IS NOT NULL AS has_discovery_candidates,
  to_regclass('public.discovery_sources') IS NOT NULL AS has_discovery_sources,
  to_regclass('public.discovery_source_checks') IS NOT NULL AS has_discovery_checks;

SELECT
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_price_observation') AS has_approve_function,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'run_price_auto_review') AS has_auto_review_function,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_plan_affordability_metrics') AS has_affordability_refresh;

SELECT
  (SELECT COUNT(*) FROM products) AS products,
  (SELECT COUNT(*) FROM plans) AS plans,
  (SELECT COUNT(*) FROM countries) AS countries,
  (SELECT COUNT(*) FROM region_prices) AS region_prices,
  (SELECT COUNT(*) FROM price_observations) AS price_observations,
  (SELECT COUNT(*) FROM product_discovery_candidates) AS discovery_candidates,
  (SELECT COUNT(*) FROM discovery_sources) AS discovery_sources,
  (SELECT COUNT(*) FROM discovery_source_checks) AS discovery_source_checks;

SELECT
  COUNT(*) FILTER (WHERE change_kind = 'price_change') AS price_change_checks,
  COUNT(*) FILTER (WHERE importance_score >= 60) AS important_checks
FROM discovery_source_checks;

SELECT slug, name, status
FROM products
WHERE slug = 'chatgpt';
SQL

echo "Database smoke check complete."
