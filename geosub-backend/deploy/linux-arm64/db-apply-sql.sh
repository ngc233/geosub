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

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS geosub_schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

normalized_sql_checksum() {
  tr -d '\r' < "$1" | sha256sum | awk '{print $1}'
}

raw_sql_checksum() {
  sha256sum "$1" | awk '{print $1}'
}

crlf_sql_checksum() {
  awk '{ sub(/\r$/, ""); printf "%s\r\n", $0 }' "$1" | sha256sum | awk '{print $1}'
}

is_known_line_ending_checksum() {
  local filename="$1"
  local existing_checksum="$2"

  case "${filename}:${existing_checksum}" in
    "sql/002_compute_plan_affordability.sql:b6a4e9ab30620ccf05f4895f0f55d119565e96a39d8ef8ef9cf2722df10c5913")
      return 0
      ;;
  esac

  return 1
}

core_files=(
  "schema.sql"
  "seed-chatgpt.sql"
  "sql/001_affordability_income_tables.sql"
  "sql/002_compute_plan_affordability.sql"
  "sql/003_affordability_views.sql"
  # 004_affordability_source_metadata.sql used CREATE OR REPLACE for a view
  # with incompatible columns; the fix file below drops and recreates it safely.
  "sql/004_affordability_source_metadata_fix.sql"
  # schema.sql owns the current price_observations table. Earlier 006/007
  # migrations targeted a superseded slug-based observation model.
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
  "sql/022_discovery_manual_scan_queue.sql"
  "sql/023_app_store_stability_auto_review.sql"
  "sql/024_app_store_availability_status.sql"
  "sql/025_archive_non_subscription_plans.sql"
  "sql/026_clear_legacy_multisource_review_notes.sql"
  "sql/027_archive_capacity_only_app_store_items.sql"
  "sql/028_country_tax_profiles.sql"
  "sql/029_country_app_store_risk_profiles.sql"
  "sql/030_country_app_store_risk_model.sql"
  "sql/031_app_store_country_coverage.sql"
  "sql/032_country_tax_profile_v2.sql"
  "sql/033_app_store_stability_auto_review_v2.sql"
  "sql/034_affordability_metric_precision.sql"
  "sql/035_country_tax_profile_sync_system.sql"
  "sql/036_product_plan_specs_seed.sql"
  "sql/037_inferred_app_store_tax_profiles.sql"
  "sql/038_common_app_store_tax_profiles.sql"
  "sql/039_relax_claude_max_app_store_range.sql"
  "sql/040_gemini_app_store_collector.sql"
  "sql/041_merge_gemini_advanced_into_pro.sql"
  "sql/042_price_observation_evidence_view.sql"
  "sql/043_app_store_collection_schedule_policy.sql"
  "sql/052_collector_job_runs_running_status.sql"
  "sql/053_admin_collection_performance.sql"
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
  "sql/045_article_soft_delete_trash.sql"
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

  checksum="$(normalized_sql_checksum "$file")"
  existing="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -qtAX -c "SELECT checksum FROM geosub_schema_migrations WHERE filename = '$file';")"

  if [[ -n "$existing" ]]; then
    if [[ "$existing" != "$checksum" ]]; then
      raw_checksum="$(raw_sql_checksum "$file")"
      crlf_checksum="$(crlf_sql_checksum "$file")"

      if [[ "$existing" == "$raw_checksum" || "$existing" == "$crlf_checksum" ]] ||
        is_known_line_ending_checksum "$file" "$existing"; then
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
          "UPDATE geosub_schema_migrations SET checksum = '$checksum' WHERE filename = '$file';" >/dev/null
        echo "Already applied: $file (normalized stored checksum)"
        continue
      fi

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
