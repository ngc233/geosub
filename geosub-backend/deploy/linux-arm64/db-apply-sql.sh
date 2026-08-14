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
MODE="${1:-schema}"
MANIFEST_SCRIPT="$BACKEND_DIR/scripts/migration-manifest.cjs"

case "$MODE" in
  core) MODE="schema" ;;
  content) MODE="backfill" ;;
  schema|complete-schema|post-cutover|backfill|all) ;;
  *) echo "Mode must be schema, complete-schema, post-cutover, backfill or all."; exit 1 ;;
esac

cd "$BACKEND_DIR"

if [[ ! -f "$MANIFEST_SCRIPT" ]]; then
  echo "Migration manifest is missing: $MANIFEST_SCRIPT"
  exit 1
fi

node "$MANIFEST_SCRIPT" validate --frontend-dir="$FRONTEND_DIR"
mapfile -t entries < <(
  node "$MANIFEST_SCRIPT" entries "$MODE" --frontend-dir="$FRONTEND_DIR"
)
if (( ${#entries[@]} == 0 )); then
  echo "Migration manifest returned no entries for mode: $MODE"
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

if [[ "$MODE" == "backfill" || "$MODE" == "all" ]]; then
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS geosub_backfill_migrations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL
fi

normalized_sql_checksum() {
  tr -d '\r' < "$1" | sha256sum | awk '{print $1}'
}

raw_sql_checksum() {
  sha256sum "$1" | awk '{print $1}'
}

crlf_sql_checksum() {
  awk '{ sub(/\r$/, ""); printf "%s\r\n", $0 }' "$1" | sha256sum | awk '{print $1}'
}

registry_for_file() {
  if [[ "$1" == sql/backfill/* ]]; then
    printf '%s\n' "geosub_backfill_migrations"
  else
    printf '%s\n' "geosub_schema_migrations"
  fi
}

registered_checksum() {
  local registry="$1"
  local filename="$2"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -qtAX -c \
    "SELECT checksum FROM $registry WHERE filename = '$filename';"
}

checksum_is_listed() {
  local checksum="$1"
  local csv="$2"
  [[ ",$csv," == *",$checksum,"* ]]
}

register_canonical() {
  local registry="$1"
  local filename="$2"
  local checksum="$3"
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO $registry (filename, checksum) VALUES ('$filename', '$checksum') ON CONFLICT (filename) DO NOTHING;" >/dev/null
}

legacy_baseline_ready=0
check_legacy_baseline() {
  local cutover_file="sql/063_system_task_runs.sql"
  local cutover_registered
  cutover_registered="$(registered_checksum geosub_schema_migrations "$cutover_file")"
  if [[ -z "$cutover_registered" ]]; then
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

  legacy_baseline_ready=1
}

check_legacy_baseline

for entry in "${entries[@]}"; do
  IFS=$'\t' read -r file legacy legacy_checksums is_baseline <<<"$entry"
  registry="$(registry_for_file "$file")"
  checksum="$(normalized_sql_checksum "$file")"
  existing="$(registered_checksum "$registry" "$file")"

  if [[ -n "$existing" ]]; then
    raw_checksum="$(raw_sql_checksum "$file")"
    crlf_checksum="$(crlf_sql_checksum "$file")"
    if [[ "$existing" != "$checksum" && "$existing" != "$raw_checksum" && "$existing" != "$crlf_checksum" ]]; then
      echo "Migration checksum changed after it was applied: $file"
      echo "Applied: $existing"
      echo "Current: $checksum"
      exit 1
    fi
    echo "Already applied: $file"
    continue
  fi

  legacy_existing="$(registered_checksum geosub_schema_migrations "$legacy")"
  if [[ -n "$legacy_existing" ]]; then
    if ! checksum_is_listed "$legacy_existing" "$legacy_checksums"; then
      echo "Legacy migration checksum drift: $legacy"
      echo "Applied: $legacy_existing"
      exit 1
    fi
    echo "Legacy-compatible: $legacy -> $file"
    continue
  fi

  if [[ "$legacy_baseline_ready" == "1" && "$is_baseline" == "1" ]]; then
    echo "Legacy baseline-compatible: $file"
    continue
  fi

  compatibility_sql="$(node "$MANIFEST_SCRIPT" compatibility-sql "$file" --frontend-dir="$FRONTEND_DIR")"
  if [[ -n "$compatibility_sql" ]]; then
    structure_compatible="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -qtAX -c "$compatibility_sql")"
    if [[ "$structure_compatible" == "t" ]]; then
      echo "Structure-compatible: $file"
      continue
    fi
  fi

  echo "Applying: $file"
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$file"
  register_canonical "$registry" "$file" "$checksum"
done

echo "SQL migration complete for mode: $MODE (${#entries[@]} entries from the canonical layout)"
