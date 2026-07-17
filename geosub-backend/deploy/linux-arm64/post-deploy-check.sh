#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
FRONTEND_DIR="${GEOSUB_FRONTEND_DIR:-/opt/geosub/ai-price-site}"
DB_CONTAINER="${GEOSUB_DB_CONTAINER:-geosub-postgres}"
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"
WEB_HEALTH_URL="${GEOSUB_WEB_HEALTH_URL:-http://127.0.0.1:3000/zh/ai-pricing}"
MAX_EXCHANGE_RATE_AGE_HOURS="${GEOSUB_MAX_EXCHANGE_RATE_AGE_HOURS:-18}"
MIN_PUBLISHED_SUBSCRIPTION_USD="${GEOSUB_MIN_PUBLISHED_SUBSCRIPTION_USD:-1}"
MAX_PUBLISHED_PRICE_AGE_DAYS="${GEOSUB_MAX_PUBLISHED_PRICE_AGE_DAYS:-14}"
MAX_APP_STORE_PRODUCT_RUN_AGE_DAYS="${GEOSUB_MAX_APP_STORE_PRODUCT_RUN_AGE_DAYS:-8}"
LOGO_STORAGE_DIR="${GEOSUB_LOGO_STORAGE_DIR:-/var/lib/geosub/product-logos}"
BACKUP_DIR="${GEOSUB_BACKUP_DIR:-/opt/geosub/backups}"
MAX_BACKUP_AGE_HOURS="${GEOSUB_MAX_BACKUP_AGE_HOURS:-30}"

failures=0
warnings=0

pass() {
  printf 'OK    %s\n' "$1"
}

warn() {
  warnings=$((warnings + 1))
  printf 'WARN  %s\n' "$1"
}

fail() {
  failures=$((failures + 1))
  printf 'FAIL  %s\n' "$1"
}

psql_scalar() {
  local sql="$1"
  docker exec "$DB_CONTAINER" psql \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -qtAX \
    -c "$sql" | tr -d '\r' | tail -n 1
}

check_required_path() {
  local label="$1"
  local path="$2"

  if [[ -e "$path" ]]; then
    pass "$label exists: $path"
  else
    fail "$label missing: $path"
  fi
}

check_table() {
  local table="$1"
  local result

  result="$(psql_scalar "SELECT CASE WHEN to_regclass('public.${table}') IS NULL THEN 'missing' ELSE 'ok' END;")"
  if [[ "$result" == "ok" ]]; then
    pass "table public.${table}"
  else
    fail "table public.${table} missing"
  fi
}

check_relation() {
  local relation="$1"
  local result

  result="$(psql_scalar "SELECT CASE WHEN to_regclass('public.${relation}') IS NULL THEN 'missing' ELSE 'ok' END;")"
  if [[ "$result" == "ok" ]]; then
    pass "relation public.${relation}"
  else
    fail "relation public.${relation} missing"
  fi
}

check_index() {
  local index_name="$1"
  local result

  result="$(psql_scalar "SELECT CASE WHEN to_regclass('public.${index_name}') IS NULL THEN 'missing' ELSE 'ok' END;")"
  if [[ "$result" == "ok" ]]; then
    pass "index public.${index_name}"
  else
    fail "index public.${index_name} missing"
  fi
}

check_migration() {
  local filename="$1"
  local result

  result="$(psql_scalar "SELECT CASE WHEN EXISTS (SELECT 1 FROM geosub_schema_migrations WHERE filename = '${filename}') THEN 'ok' ELSE 'missing' END;")"
  if [[ "$result" == "ok" ]]; then
    pass "migration applied: $filename"
  else
    fail "migration missing: $filename"
  fi
}

check_unit_active() {
  local unit="$1"

  if ! command -v systemctl >/dev/null 2>&1; then
    warn "systemctl not available; skipped $unit"
    return
  fi

  if systemctl is-active --quiet "$unit"; then
    pass "systemd active: $unit"
  else
    fail "systemd inactive: $unit"
  fi
}

check_timer_enabled_active() {
  local timer="$1"

  if ! command -v systemctl >/dev/null 2>&1; then
    warn "systemctl not available; skipped $timer"
    return
  fi

  if systemctl is-enabled --quiet "$timer"; then
    pass "systemd enabled: $timer"
  else
    fail "systemd not enabled: $timer"
  fi

  if systemctl is-active --quiet "$timer"; then
    pass "systemd active: $timer"
  else
    fail "systemd inactive: $timer"
  fi
}

check_unit_not_failed() {
  local unit="$1"

  if ! command -v systemctl >/dev/null 2>&1; then
    warn "systemctl not available; skipped $unit failure state"
    return
  fi

  if systemctl is-failed --quiet "$unit"; then
    fail "systemd failed: $unit"
  else
    pass "systemd not failed: $unit"
  fi
}

printf 'GeoSub post-deploy check\n'
printf 'env=%s\n' "$ENV_FILE"
printf 'database=%s/%s\n\n' "$DB_CONTAINER" "$DB_NAME"

if [[ -f "$ENV_FILE" ]]; then
  pass "environment file loaded"
else
  warn "environment file not found: $ENV_FILE"
fi

check_required_path "backend directory" "$BACKEND_DIR"
check_required_path "frontend directory" "$FRONTEND_DIR"
check_required_path "product logo storage" "$LOGO_STORAGE_DIR"
check_required_path "database backup directory" "$BACKUP_DIR"

if sudo -u geosub test -w "$LOGO_STORAGE_DIR"; then
  pass "product logo storage writable by geosub"
else
  fail "product logo storage is not writable by geosub: $LOGO_STORAGE_DIR"
fi

if ! command -v docker >/dev/null 2>&1; then
  fail "docker command not found"
else
  pass "docker command available"
fi

if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    pass "database container running"
  else
    fail "database container not running: $DB_CONTAINER"
  fi
fi

if (( failures == 0 )); then
  db_name="$(psql_scalar "SELECT current_database();")"
  pass "database reachable: $db_name"

  for table in \
    geosub_schema_migrations \
    products \
    plans \
    countries \
    exchange_rates \
    exchange_rate_sync_runs \
    collector_jobs \
    collector_job_runs \
    price_observations \
    region_prices \
    site_settings; do
    check_table "$table"
  done
  check_table "admin_login_attempts"
  check_relation "latest_exchange_rates"

  for migration in \
    "schema.sql" \
    "sql/012_exchange_rate_sync_system.sql" \
    "sql/021_collector_job_runs.sql" \
    "sql/023_app_store_stability_auto_review.sql" \
    "sql/033_app_store_stability_auto_review_v2.sql" \
    "sql/043_app_store_collection_schedule_policy.sql" \
    "sql/052_collector_job_runs_running_status.sql" \
    "sql/053_admin_collection_performance.sql" \
    "sql/054_refresh_affordability_app_store_scope.sql" \
    "sql/055_refresh_matching_app_store_prices.sql" \
    "sql/056_refresh_exact_local_app_store_prices.sql" \
    "sql/057_quarantine_published_app_store_price_outliers.sql" \
    "sql/058_normalize_disney_app_store_plans.sql" \
    "sql/059_stale_app_store_price_lifecycle.sql"; do
    check_migration "$migration"
  done

  for index_name in \
    "collector_jobs_admin_queue_idx" \
    "collector_job_runs_started_idx" \
    "collector_job_runs_product_started_idx" \
    "collector_job_runs_running_started_idx"; do
    check_index "$index_name"
  done

  constraint_def="$(psql_scalar "SELECT COALESCE((SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'collector_job_runs_status_check' LIMIT 1), 'missing');")"
  if [[ "$constraint_def" == *"running"* ]]; then
    pass "collector_job_runs status supports running"
  else
    fail "collector_job_runs status constraint does not support running"
  fi

  fx_state="$(psql_scalar "SELECT CASE WHEN MAX(fetched_at) IS NULL THEN 'missing' WHEN MAX(fetched_at) < NOW() - ('${MAX_EXCHANGE_RATE_AGE_HOURS} hours')::interval THEN 'stale' ELSE 'ok' END || '|' || COALESCE(MAX(fetched_at)::text, '') || '|' || COALESCE(MAX(rate)::text, '') FROM latest_exchange_rates WHERE base_currency = 'USD' AND quote_currency = 'CNY';")"
  IFS='|' read -r fx_status fx_fetched_at fx_rate <<< "$fx_state"
  case "$fx_status" in
    ok)
      pass "USD/CNY exchange rate fresh: $fx_rate at $fx_fetched_at"
      ;;
    stale)
      fail "USD/CNY exchange rate stale: $fx_rate at $fx_fetched_at"
      ;;
    *)
      fail "USD/CNY exchange rate missing"
      ;;
  esac

  stale_running="$(psql_scalar "SELECT COUNT(*) FROM collector_job_runs WHERE status = 'running' AND (((raw_payload ->> 'state') = 'queued_from_admin' AND started_at < NOW() - INTERVAL '3 minutes') OR started_at < NOW() - INTERVAL '20 minutes');")"
  if [[ "$stale_running" == "0" ]]; then
    pass "no stale running collector runs"
  else
    fail "stale running collector runs: $stale_running"
  fi

  collector_summary="$(psql_scalar "SELECT COUNT(*)::text || '|' || COUNT(*) FILTER (WHERE status = 'active')::text || '|' || COUNT(*) FILTER (WHERE status = 'active' AND (next_run_at IS NULL OR next_run_at <= NOW()))::text FROM collector_jobs;")"
  IFS='|' read -r collector_total collector_active collector_due <<< "$collector_summary"
  if [[ "${collector_total:-0}" == "0" ]]; then
    warn "no collector jobs configured"
  else
    pass "collector jobs total=$collector_total active=$collector_active due=$collector_due"
  fi

  latest_collector_run="$(psql_scalar "SELECT COALESCE(MAX(started_at)::text, 'missing') FROM collector_job_runs;")"
  if [[ "$latest_collector_run" == "missing" ]]; then
    warn "no collector run history yet"
  else
    pass "latest collector run: $latest_collector_run"
  fi

  data_summary="$(psql_scalar "SELECT (SELECT COUNT(*) FROM products)::text || '|' || (SELECT COUNT(*) FROM region_prices WHERE status = 'published')::text || '|' || (SELECT COUNT(*) FROM price_observations WHERE status = 'pending')::text;")"
  IFS='|' read -r products_count published_prices pending_observations <<< "$data_summary"
  pass "data summary products=$products_count published_prices=$published_prices pending_observations=$pending_observations"

  app_store_product_gaps="$(psql_scalar "WITH tracked AS (SELECT DISTINCT products.id, products.slug FROM products JOIN collector_jobs ON collector_jobs.product_id = products.id WHERE collector_jobs.status = 'active' AND collector_jobs.job_config ->> 'collector_kind' = 'app_store'), coverage AS (SELECT tracked.slug, COUNT(region_prices.id) FILTER (WHERE region_prices.status = 'published' AND region_prices.billing_platform = 'ios' AND region_prices.price_usd IS NOT NULL) AS published_prices FROM tracked LEFT JOIN region_prices ON region_prices.product_id = tracked.id GROUP BY tracked.slug) SELECT COUNT(*) FROM coverage WHERE published_prices = 0;")"
  if [[ "$app_store_product_gaps" == "0" ]]; then
    pass "all active App Store products have published coverage"
  else
    fail "active App Store products missing published prices: $app_store_product_gaps"
  fi

  app_store_products_without_recent_success="$(psql_scalar "WITH tracked AS (SELECT DISTINCT products.id FROM products JOIN collector_jobs ON collector_jobs.product_id = products.id WHERE collector_jobs.status = 'active' AND collector_jobs.job_config ->> 'collector_kind' = 'app_store') SELECT COUNT(*) FROM tracked WHERE NOT EXISTS (SELECT 1 FROM collector_job_runs runs WHERE runs.product_id = tracked.id AND runs.collector_kind = 'app_store' AND runs.status = 'succeeded' AND runs.started_at >= NOW() - ('${MAX_APP_STORE_PRODUCT_RUN_AGE_DAYS} days')::interval);")"
  if [[ "$app_store_products_without_recent_success" == "0" ]]; then
    pass "all active App Store products collected within ${MAX_APP_STORE_PRODUCT_RUN_AGE_DAYS} days"
  else
    fail "active App Store products without a recent successful collection: $app_store_products_without_recent_success"
  fi

  low_published_prices="$(psql_scalar "SELECT COUNT(*) FROM region_prices WHERE status = 'published' AND billing_platform = 'ios' AND price_usd IS NOT NULL AND price_usd < ${MIN_PUBLISHED_SUBSCRIPTION_USD};")"
  if [[ "$low_published_prices" == "0" ]]; then
    pass "no sub-dollar published App Store subscription prices"
  else
    fail "sub-dollar published App Store prices: $low_published_prices"
  fi

  published_outliers="$(psql_scalar "WITH published AS (SELECT rp.* FROM region_prices rp WHERE rp.status = 'published' AND rp.billing_platform = 'ios' AND rp.price_usd IS NOT NULL AND rp.price_usd >= ${MIN_PUBLISHED_SUBSCRIPTION_USD}), stats AS (SELECT product_id, plan_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY price_usd)::numeric AS median_usd, COUNT(*) AS region_count FROM published GROUP BY product_id, plan_id HAVING COUNT(*) >= 8) SELECT COUNT(*) FROM published JOIN stats ON stats.product_id = published.product_id AND stats.plan_id = published.plan_id WHERE published.price_usd < stats.median_usd * 0.2 OR published.price_usd > stats.median_usd * 3.5;")"
  if [[ "$published_outliers" == "0" ]]; then
    pass "no extreme published App Store price outliers"
  else
    fail "extreme published App Store price outliers: $published_outliers"
  fi

  stale_published_prices="$(psql_scalar "SELECT COUNT(*) FROM region_prices WHERE status = 'published' AND billing_platform = 'ios' AND price_usd IS NOT NULL AND last_checked_at < NOW() - ('${MAX_PUBLISHED_PRICE_AGE_DAYS} days')::interval;")"
  if [[ "$stale_published_prices" == "0" ]]; then
    pass "no published App Store prices older than ${MAX_PUBLISHED_PRICE_AGE_DAYS} days"
  else
    warn "published App Store prices older than ${MAX_PUBLISHED_PRICE_AGE_DAYS} days: $stale_published_prices"
  fi

  unrefreshed_exact_local_prices="$(psql_scalar "WITH candidates AS (SELECT DISTINCT ON (published.id) published.id FROM region_prices published JOIN price_observations observation ON observation.product_id = published.product_id AND observation.plan_id = published.plan_id AND observation.country_id = published.country_id AND observation.billing_platform = published.billing_platform AND observation.price_type = published.price_type WHERE published.status = 'published' AND published.billing_platform = 'ios' AND observation.billing_platform = 'ios' AND (observation.status = 'pending' OR (observation.status = 'ignored' AND observation.raw_payload ->> 'auto_review_reason_code' = 'superseded_by_published_price')) AND COALESCE(observation.anomaly_flag, FALSE) = FALSE AND observation.observed_at > COALESCE(published.last_checked_at, '-infinity'::timestamptz) AND published.currency IS NOT DISTINCT FROM observation.currency AND published.local_price IS NOT DISTINCT FROM observation.raw_price AND observation.converted_usd IS NOT NULL AND observation.converted_usd >= ${MIN_PUBLISHED_SUBSCRIPTION_USD} ORDER BY published.id, observation.observed_at DESC, observation.created_at DESC) SELECT COUNT(*) FROM candidates;")"
  if [[ "$unrefreshed_exact_local_prices" == "0" ]]; then
    pass "no unrefreshed exact-local App Store prices"
  else
    fail "published App Store prices have newer exact-local observations: $unrefreshed_exact_local_prices"
  fi
fi

check_unit_active "geosub-web.service"
check_timer_enabled_active "geosub-exchange-rate-sync.timer"
check_timer_enabled_active "geosub-price-pipeline.timer"
check_timer_enabled_active "geosub-collector-jobs.timer"
check_unit_not_failed "geosub-collector-jobs.service"
check_timer_enabled_active "geosub-discovery-scan.timer"
check_timer_enabled_active "geosub-analytics-aggregation.timer"
check_timer_enabled_active "geosub-db-backup.timer"
check_timer_enabled_active "geosub-event-retention.timer"

latest_backup="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}_*.dump" -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n 1 | cut -d ' ' -f2-)"
if [[ -z "$latest_backup" ]]; then
  fail "no database backup found in $BACKUP_DIR"
else
  backup_age_seconds=$(( $(date +%s) - $(stat -c %Y "$latest_backup") ))
  backup_age_hours=$(( backup_age_seconds / 3600 ))

  if (( backup_age_hours <= MAX_BACKUP_AGE_HOURS )); then
    pass "latest database backup age: ${backup_age_hours}h"
  else
    fail "latest database backup is stale: ${backup_age_hours}h"
  fi

  if [[ -f "$latest_backup.sha256" ]] && sha256sum -c "$latest_backup.sha256" >/dev/null; then
    pass "latest database backup checksum"
  else
    fail "latest database backup checksum missing or invalid: $latest_backup"
  fi
fi

if command -v curl >/dev/null 2>&1; then
  if curl -fsS --max-time 10 "$WEB_HEALTH_URL" >/dev/null; then
    pass "web health URL reachable: $WEB_HEALTH_URL"
  else
    fail "web health URL failed: $WEB_HEALTH_URL"
  fi
else
  warn "curl not available; skipped web health URL"
fi

printf '\nPost-deploy check finished: failures=%s warnings=%s\n' "$failures" "$warnings"
if (( failures > 0 )); then
  exit 1
fi
