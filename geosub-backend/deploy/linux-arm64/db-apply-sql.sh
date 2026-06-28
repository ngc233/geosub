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
DB_CONTAINER="${GEOSUB_DB_CONTAINER:-geosub-postgres}"
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"
MODE="${1:-core}"

cd "$BACKEND_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Database container '$DB_CONTAINER' is not running."
  exit 1
fi

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -tc \
  "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | grep -q 1 ||
  docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$DB_NAME"

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS geosub_schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

core_files=(
  "schema.sql"
  "seed-chatgpt.sql"
  "sql/001_affordability_income_tables.sql"
  "sql/002_compute_plan_affordability.sql"
  "sql/003_affordability_views.sql"
  "sql/004_affordability_source_metadata.sql"
  "sql/004_affordability_source_metadata_fix.sql"
  "sql/006_price_observation_tables.sql"
  "sql/007_fix_pending_price_observations_view.sql"
  "sql/007_fix_pending_price_observations_view_v3.sql"
  "sql/008_price_observations_view_v4.sql"
  "sql/009_price_observation_review_functions.sql"
  "sql/010_refresh_affordability_function.sql"
  "sql/011_price_observations_history_view.sql"
  "sql/012_exchange_rate_sync_system.sql"
  "sql/013_price_auto_review_rules.sql"
  "sql/014_product_discovery_candidates.sql"
  "sql/015_discovery_sources.sql"
  "sql/016_discovery_source_checks.sql"
  "sql/017_discovery_change_classification.sql"
  "sql/018_discovery_feed_trigger_fields.sql"
  "sql/019_discovery_source_strategy.sql"
  "sql/020_discovery_collection_handoff.sql"
  "sql/021_collector_job_runs.sql"
)

content_files=(
  "content-system-tables.sql"
  "content-system-directus.sql"
  "register-directus.sql"
  "directus-zh.sql"
  "directus-cn-v2.sql"
  "directus-polish.sql"
  "fix_nav_categories_utf8.sql"
  "seed_footer_navigation_zh.sql"
  "seed_en_navigation_draft.sql"
  "publish_en_navigation.sql"
  "publish_footer_trust_pages.sql"
)

case "$MODE" in
  core)
    files=("${core_files[@]}")
    ;;
  content)
    files=("${content_files[@]}")
    ;;
  all)
    files=("${core_files[@]}" "${content_files[@]}")
    ;;
  *)
    echo "Usage: $0 [core|content|all]"
    exit 1
    ;;
esac

for file in "${files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing SQL file: $file"
    exit 1
  fi

  checksum="$(sha256sum "$file" | awk '{print $1}')"
  existing="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -qtAX -c "SELECT checksum FROM geosub_schema_migrations WHERE filename = '$file';")"

  if [[ -n "$existing" ]]; then
    if [[ "$existing" != "$checksum" ]]; then
      echo "Migration checksum changed after it was applied: $file"
      echo "Applied: $existing"
      echo "Current: $checksum"
      exit 1
    fi
    echo "Already applied: $file"
    continue
  fi

  echo "Applying: $file"
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$file"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO geosub_schema_migrations (filename, checksum) VALUES ('$file', '$checksum');" >/dev/null
done

echo "SQL migration complete for mode: $MODE"
