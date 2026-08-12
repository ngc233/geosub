#!/usr/bin/env bash
set -euo pipefail
umask 077

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_CONTAINER="${GEOSUB_DB_CONTAINER:-geosub-postgres}"
PRODUCTION_DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"
BACKUP_FILE="${1:-}"
DRILL_DB_NAME="${2:-}"
CONFIRM="${3:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "$BACKUP_FILE" || -z "$DRILL_DB_NAME" || "$CONFIRM" != "CREATE_RESTORE_DRILL_DATABASE" ]]; then
  echo "Usage: $0 /path/to/backup.dump geosub_restore_drill_YYYYMMDD CREATE_RESTORE_DRILL_DATABASE"
  echo
  echo "The drill database name must start with 'geosub_restore_drill_'."
  echo "This script never drops or restores over the production database."
  exit 1
fi

if [[ ! "$DRILL_DB_NAME" =~ ^geosub_restore_drill_[a-zA-Z0-9_]+$ ]]; then
  echo "Unsafe drill database name: $DRILL_DB_NAME"
  exit 1
fi

if [[ "$DRILL_DB_NAME" == "$PRODUCTION_DB_NAME" ]]; then
  echo "Refusing to use the production database as the drill target."
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" || ! -s "$BACKUP_FILE" ]]; then
  echo "Backup file is missing or empty: $BACKUP_FILE"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Database container '$DB_CONTAINER' is not running."
  exit 1
fi

if [[ -f "$BACKUP_FILE.sha256" ]]; then
  expected_hash="$(awk 'NR == 1 { print $1 }' "$BACKUP_FILE.sha256")"
  actual_hash="$(sha256sum "$BACKUP_FILE" | cut -d ' ' -f1)"
  if [[ -z "$expected_hash" || "$expected_hash" != "$actual_hash" ]]; then
    echo "Backup checksum mismatch: $BACKUP_FILE"
    exit 1
  fi
  echo "Backup checksum verified."
else
  echo "Backup checksum sidecar is missing: $BACKUP_FILE.sha256"
  exit 1
fi

echo "Checking backup catalog"
docker exec -i "$DB_CONTAINER" pg_restore --list < "$BACKUP_FILE" >/dev/null

if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -Atqc \
  "SELECT 1 FROM pg_database WHERE datname = '$DRILL_DB_NAME'" | grep -qx 1; then
  echo "Drill database already exists; refusing to overwrite it: $DRILL_DB_NAME"
  exit 1
fi

echo "Creating independent drill database: $DRILL_DB_NAME"
docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$DRILL_DB_NAME"

restore_succeeded=false
cleanup_failed_restore() {
  if [[ "$restore_succeeded" != true ]]; then
    echo "Restore drill failed. Removing incomplete drill database: $DRILL_DB_NAME" >&2
    docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists --force "$DRILL_DB_NAME" >/dev/null 2>&1 || true
  fi
}
trap cleanup_failed_restore EXIT

echo "Restoring backup into: $DRILL_DB_NAME"
docker exec -i "$DB_CONTAINER" pg_restore \
  -U "$DB_USER" \
  -d "$DRILL_DB_NAME" \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  < "$BACKUP_FILE"

echo "Running read-only schema, foreign-key, view, function, and data checks"
docker exec -i "$DB_CONTAINER" psql \
  -U "$DB_USER" \
  -d "$DRILL_DB_NAME" \
  -X \
  -v ON_ERROR_STOP=1 \
  -f - \
  < "$SCRIPT_DIR/db-restore-validate.sql"

restored_counts_file="$(mktemp)"
trap 'rm -f "$restored_counts_file"; cleanup_failed_restore' EXIT
docker exec -i "$DB_CONTAINER" psql \
  -U "$DB_USER" \
  -d "$DRILL_DB_NAME" \
  -X \
  -v ON_ERROR_STOP=1 \
  -At \
  -F $'\t' \
  -f - \
  < "$SCRIPT_DIR/db-restore-counts.sql" \
  > "$restored_counts_file"

counts_file="${BACKUP_FILE%.dump}.counts.tsv"
meta_file="${BACKUP_FILE%.dump}.txt"
if [[ ! -f "$counts_file" || ! -s "$counts_file" ]]; then
  echo "Backup-time count snapshot is missing or empty: $counts_file"
  exit 1
fi
if [[ ! -f "$meta_file" || ! -s "$meta_file" ]]; then
  echo "Backup metadata is missing or empty: $meta_file"
  exit 1
fi

expected_counts_hash="$(awk -F= '$1 == "counts_sha256" { print $2; exit }' "$meta_file")"
actual_counts_hash="$(sha256sum "$counts_file" | cut -d ' ' -f1)"
if [[ -z "$expected_counts_hash" || "$expected_counts_hash" != "$actual_counts_hash" ]]; then
  echo "Backup-time count snapshot checksum mismatch: $counts_file"
  exit 1
fi

if ! diff -u "$counts_file" "$restored_counts_file"; then
  echo "Restored key-table counts do not match the backup-time counts."
  exit 1
fi
echo "Key-table counts match the backup-time snapshot."

restore_succeeded=true
echo
echo "Restore drill passed. Temporary database retained for human inspection:"
echo "  $DRILL_DB_NAME"
echo "Remove it after approval with:"
echo "  docker exec $DB_CONTAINER dropdb -U $DB_USER --if-exists --force $DRILL_DB_NAME"
