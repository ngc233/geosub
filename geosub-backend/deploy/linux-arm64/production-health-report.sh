#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

REPO_DIR="${GEOSUB_REPO_DIR:-/opt/geosub/geosub}"
BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
DB_CONTAINER="${GEOSUB_DB_CONTAINER:-geosub-postgres}"
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"
LOCAL_URL="${GEOSUB_WEB_HEALTH_URL:-http://127.0.0.1:3000/zh/ai-pricing}"
PUBLIC_URL="${GEOSUB_PUBLIC_HEALTH_URL:-https://geosub.org/zh/ai-pricing}"
WEB_SERVICE="${GEOSUB_WEB_SERVICE:-geosub-web.service}"
SAMPLE_COUNT="${GEOSUB_HEALTH_SAMPLE_COUNT:-5}"
MAX_PRICE_AGE_DAYS="${GEOSUB_MAX_PUBLISHED_PRICE_AGE_DAYS:-14}"
MAX_FX_AGE_HOURS="${GEOSUB_MAX_EXCHANGE_RATE_AGE_HOURS:-18}"

if ! [[ "$SAMPLE_COUNT" =~ ^[1-9][0-9]*$ ]] || (( SAMPLE_COUNT > 20 )); then
  printf 'GEOSUB_HEALTH_SAMPLE_COUNT must be between 1 and 20.\n' >&2
  exit 2
fi

psql_scalar() {
  local sql="$1"
  docker exec "$DB_CONTAINER" psql \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -qtAX \
    -c "$sql" | tr -d '\r' | tail -n 1
}

psql_rows() {
  local sql="$1"
  docker exec "$DB_CONTAINER" psql \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -qtAX \
    -F '|' \
    -c "$sql" | tr -d '\r'
}

human_bytes() {
  local bytes="${1:-0}"
  awk -v bytes="$bytes" 'BEGIN {
    split("B KiB MiB GiB TiB", units, " ");
    value = bytes + 0;
    level = 1;
    while (value >= 1024 && level < 5) { value /= 1024; level += 1 }
    printf "%.1f %s", value, units[level]
  }'
}

probe_url() {
  local label="$1"
  local url="$2"
  local samples_file
  samples_file="$(mktemp)"

  for ((index = 1; index <= SAMPLE_COUNT; index += 1)); do
    curl --fail --silent --show-error --location \
      --output /dev/null \
      --write-out '%{http_code}|%{time_starttransfer}|%{time_total}\n' \
      --max-time 20 \
      "$url" >> "$samples_file" || printf '000|20|20\n' >> "$samples_file"
  done

  awk -F'|' -v label="$label" '
    BEGIN { ok = 1; total_ttfb = 0; total_time = 0; max_time = 0 }
    {
      if ($1 !~ /^2/) ok = 0;
      total_ttfb += $2;
      total_time += $3;
      if ($3 > max_time) max_time = $3;
      last_status = $1;
    }
    END {
      printf "%s|%s|%d|%.0f|%.0f|%.0f\n", label, ok ? "ok" : "failed", last_status,
        (total_ttfb / NR) * 1000, (total_time / NR) * 1000, max_time * 1000;
    }
  ' "$samples_file"
  rm -f "$samples_file"
}

read_version() {
  if [[ -f "$REPO_DIR/VERSION" ]]; then
    tr -d '\r\n' < "$REPO_DIR/VERSION"
  else
    printf 'unknown'
  fi
}

read_commit() {
  if git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$REPO_DIR" rev-parse --short HEAD
  else
    printf 'unknown'
  fi
}

generated_at="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
version="$(read_version)"
commit="$(read_commit)"
git_changes="unknown"
if git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_changes="$(git -C "$REPO_DIR" status --short | wc -l | tr -d ' ')"
fi

service_state="$(systemctl show "$WEB_SERVICE" --property=ActiveState --value 2>/dev/null || printf 'unknown')"
service_substate="$(systemctl show "$WEB_SERVICE" --property=SubState --value 2>/dev/null || printf 'unknown')"
service_restarts="$(systemctl show "$WEB_SERVICE" --property=NRestarts --value 2>/dev/null || printf 'unknown')"
service_started="$(systemctl show "$WEB_SERVICE" --property=ActiveEnterTimestamp --value 2>/dev/null || printf 'unknown')"
service_memory_bytes="$(systemctl show "$WEB_SERVICE" --property=MemoryCurrent --value 2>/dev/null || printf '0')"
[[ "$service_memory_bytes" =~ ^[0-9]+$ ]] || service_memory_bytes=0
service_memory="$(human_bytes "$service_memory_bytes")"
service_errors_24h="$(journalctl -u "$WEB_SERVICE" --since '-24 hours' --priority=err --no-pager --quiet 2>/dev/null | grep -cve '^-- No entries --$' || true)"

local_probe="$(probe_url local "$LOCAL_URL")"
public_probe="$(probe_url public "$PUBLIC_URL")"

post_check_status="not-run"
post_check_failures="unknown"
post_check_warnings="unknown"
post_check_script="$BACKEND_DIR/deploy/linux-arm64/post-deploy-check.sh"
if [[ -x "$post_check_script" || -f "$post_check_script" ]]; then
  post_check_output="$(mktemp)"
  if bash "$post_check_script" > "$post_check_output" 2>&1; then
    post_check_status="passed"
  else
    post_check_status="failed"
  fi
  post_check_failures="$(grep -c '^FAIL  ' "$post_check_output" || true)"
  post_check_warnings="$(grep -c '^WARN  ' "$post_check_output" || true)"
  rm -f "$post_check_output"
fi

data_state="$(psql_scalar "SELECT
  (SELECT COUNT(*) FROM products WHERE status = 'published')::text || '|' ||
  (SELECT COUNT(*) FROM region_prices WHERE status = 'published')::text || '|' ||
  (SELECT COUNT(*) FROM price_observations WHERE status = 'pending')::text || '|' ||
  (SELECT COUNT(*) FROM region_prices WHERE status = 'published' AND billing_platform = 'ios' AND last_checked_at < NOW() - ('${MAX_PRICE_AGE_DAYS} days')::interval)::text || '|' ||
  (SELECT COUNT(*) FROM region_prices WHERE status = 'published' AND billing_platform = 'ios' AND price_usd IS NOT NULL AND price_usd < 1)::text;")"
IFS='|' read -r published_products published_prices pending_observations stale_prices low_prices <<< "$data_state"

fx_state="$(psql_scalar "SELECT
  COUNT(DISTINCT quote_currency)::text || '|' ||
  COALESCE(MAX(fetched_at)::text, 'missing') || '|' ||
  COUNT(*) FILTER (WHERE fetched_at < NOW() - ('${MAX_FX_AGE_HOURS} hours')::interval)::text
FROM latest_exchange_rates
WHERE base_currency = 'USD';")"
IFS='|' read -r fx_currencies fx_latest fx_stale <<< "$fx_state"

collector_state="$(psql_scalar "SELECT
  COALESCE(MAX(started_at)::text, 'missing') || '|' ||
  COUNT(*) FILTER (WHERE status = 'succeeded' AND started_at >= NOW() - INTERVAL '24 hours')::text || '|' ||
  COUNT(*) FILTER (WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '24 hours')::text || '|' ||
  COUNT(*) FILTER (WHERE status = 'running' AND started_at < NOW() - INTERVAL '20 minutes')::text
FROM collector_job_runs;")"
IFS='|' read -r collector_latest collector_succeeded_24h collector_failed_24h collector_stale_running <<< "$collector_state"

collector_failure_rows="$(psql_rows "SELECT
  COALESCE(product.slug, 'unknown'),
  COALESCE(run.collector_kind, 'unknown'),
  COUNT(*)::text,
  REPLACE(REPLACE(LEFT(COALESCE(run.error_message, 'No error message'), 140), E'\\n', ' '), '|', '/')
FROM collector_job_runs run
LEFT JOIN products product ON product.id = run.product_id
WHERE run.status = 'failed'
  AND run.started_at >= NOW() - INTERVAL '24 hours'
GROUP BY product.slug, run.collector_kind,
  REPLACE(REPLACE(LEFT(COALESCE(run.error_message, 'No error message'), 140), E'\\n', ' '), '|', '/')
ORDER BY COUNT(*) DESC, product.slug
LIMIT 10;")"

collector_failure_table=""
if [[ -n "$collector_failure_rows" ]]; then
  while IFS='|' read -r failure_product failure_kind failure_count failure_message; do
    collector_failure_table+="| ${failure_product} | ${failure_kind} | ${failure_count} | ${failure_message} |"$'\n'
  done <<< "$collector_failure_rows"
else
  collector_failure_table="| None | - | 0 | No collector failures in the last 24 hours. |"$'\n'
fi

task_state="$(psql_scalar "SELECT
  COUNT(*) FILTER (WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '24 hours')::text || '|' ||
  COUNT(*) FILTER (WHERE status = 'running' AND started_at < NOW() - INTERVAL '6 hours')::text
FROM system_task_runs;")"
IFS='|' read -r system_failed_24h system_stale_running <<< "$task_state"

timers=(
  geosub-exchange-rate-sync.timer
  geosub-price-pipeline.timer
  geosub-collector-jobs.timer
  geosub-discovery-scan.timer
  geosub-analytics-aggregation.timer
  geosub-db-backup.timer
  geosub-event-retention.timer
)
timer_active=0
timer_failed=0
for timer in "${timers[@]}"; do
  if systemctl is-active --quiet "$timer" && systemctl is-enabled --quiet "$timer"; then
    timer_active=$((timer_active + 1))
  else
    timer_failed=$((timer_failed + 1))
  fi
done

disk_state="$(df -P "$REPO_DIR" | awk 'NR == 2 { print $5 "|" $4 }')"
IFS='|' read -r disk_used disk_available_kb <<< "$disk_state"
disk_available="$(human_bytes "$((disk_available_kb * 1024))")"

IFS='|' read -r _ local_status local_code local_ttfb local_average local_max <<< "$local_probe"
IFS='|' read -r _ public_status public_code public_ttfb public_average public_max <<< "$public_probe"

overall="healthy"
if [[ "$service_state" != "active" || "$local_status" != "ok" || "$public_status" != "ok" || "$post_check_failures" != "0" || "$timer_failed" != "0" ]]; then
  overall="unhealthy"
elif [[ "$post_check_warnings" != "0" || "$collector_failed_24h" != "0" || "$system_failed_24h" != "0" || "$stale_prices" != "0" ]]; then
  overall="attention"
fi

cat <<EOF
# GeoSub production health report

- Generated: $generated_at
- Overall: **$overall**
- Release: **v$version** at \`$commit\`
- Repository changes on server: $git_changes

## Public delivery

| Endpoint | Result | HTTP | Average TTFB | Average total | Slowest sample |
| --- | --- | ---: | ---: | ---: | ---: |
| Local origin | $local_status | $local_code | ${local_ttfb} ms | ${local_average} ms | ${local_max} ms |
| Public site | $public_status | $public_code | ${public_ttfb} ms | ${public_average} ms | ${public_max} ms |

Each row uses $SAMPLE_COUNT sequential requests. These timings establish an application baseline; they do not represent a full browser Core Web Vitals test.

## Runtime

- Web service: $service_state/$service_substate
- Started: $service_started
- Restarts since service start: $service_restarts
- Current memory: $service_memory
- Error-priority journal entries in 24 hours: $service_errors_24h
- Production timers: $timer_active/${#timers[@]} active and enabled
- Disk used: $disk_used; available: $disk_available

## Data freshness

- Published products: $published_products
- Published regional prices: $published_prices
- Pending observations: $pending_observations
- Published App Store prices older than $MAX_PRICE_AGE_DAYS days: $stale_prices
- Published App Store prices below USD 1: $low_prices
- USD exchange-rate currencies: $fx_currencies
- Latest exchange-rate fetch: $fx_latest
- Exchange-rate rows older than $MAX_FX_AGE_HOURS hours: $fx_stale

## Automation

- Latest collector run: $collector_latest
- Collector runs in 24 hours: $collector_succeeded_24h succeeded, $collector_failed_24h failed
- Stale collector runs: $collector_stale_running
- Failed system tasks in 24 hours: $system_failed_24h
- Stale system tasks: $system_stale_running

### Collector failure groups in 24 hours

| Product | Collector | Runs | Reason |
| --- | --- | ---: | --- |
$collector_failure_table
## Deployment gates

- Post-deploy check: $post_check_status
- Failures: $post_check_failures
- Warnings: $post_check_warnings

## Cache interpretation

v2.6.0 caches public pricing read models and exchange-rate reads. The report measures the resulting endpoint latency, but the current cache implementation does not expose a hit/miss counter. A true cache-hit ratio requires explicit telemetry and should be added before using hit rate as an operational target.
EOF
