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
MODE="${1:-core}"
MANIFEST_SCRIPT="$BACKEND_DIR/scripts/migration-manifest.cjs"

cd "$BACKEND_DIR"

if [[ ! -f "$MANIFEST_SCRIPT" ]]; then
  echo "Migration manifest is missing: $MANIFEST_SCRIPT"
  exit 1
fi

node "$MANIFEST_SCRIPT" validate --frontend-dir="$FRONTEND_DIR"
mapfile -t files < <(
  node "$MANIFEST_SCRIPT" list "$MODE" --frontend-dir="$FRONTEND_DIR"
)
mapfile -t baseline_files < <(
  node "$MANIFEST_SCRIPT" list baseline --frontend-dir="$FRONTEND_DIR"
)

if (( ${#files[@]} == 0 )); then
  echo "Migration manifest returned no files for mode: $MODE"
  exit 1
fi

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

baseline_legacy_migrations() {
  local cutover_file="sql/063_system_task_runs.sql"
  local cutover_registered
  cutover_registered="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -qtAX -c \
    "SELECT EXISTS (SELECT 1 FROM geosub_schema_migrations WHERE filename = '$cutover_file');")"

  if [[ "$cutover_registered" != "t" ]]; then
    return 0
  fi

  local schema_ready
  schema_ready="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -qtAX -c \
    "SELECT to_regclass('public.products') IS NOT NULL
       AND to_regclass('public.collector_jobs') IS NOT NULL
       AND to_regprocedure('queue_app_store_coverage_gap_rechecks(integer,integer,integer)') IS NOT NULL;")"
  if [[ "$schema_ready" != "t" ]]; then
    echo "Refusing to baseline legacy migrations: pre-cutover schema guards are incomplete."
    exit 1
  fi

  local baselined=0
  local file checksum existing
  for file in "${baseline_files[@]}"; do
    existing="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -qtAX -c \
      "SELECT checksum FROM geosub_schema_migrations WHERE filename = '$file';")"
    if [[ -n "$existing" ]]; then
      continue
    fi
    checksum="$(normalized_sql_checksum "$file")"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO geosub_schema_migrations (filename, checksum) VALUES ('$file', '$checksum');" >/dev/null
    echo "Baselined legacy migration: $file"
    baselined=$((baselined + 1))
  done
  echo "Legacy migration baseline complete: $baselined registered."
}

if [[ "$MODE" != "content" ]]; then
  baseline_legacy_migrations
fi

for file in "${files[@]}"; do
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

echo "SQL migration complete for mode: $MODE (${#files[@]} files from the canonical manifest)"
