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
BACKUP_DIR="${GEOSUB_BACKUP_DIR:-/opt/geosub/backups}"
KEEP_DAYS="${GEOSUB_BACKUP_KEEP_DAYS:-14}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

backup_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.dump"
meta_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.txt"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Database container '$DB_CONTAINER' is not running."
  exit 1
fi

echo "Creating backup: $backup_file"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$backup_file"

sha256sum "$backup_file" > "$backup_file.sha256"

{
  echo "database=$DB_NAME"
  echo "container=$DB_CONTAINER"
  echo "created_at_utc=$timestamp"
  echo "format=pg_dump custom"
  echo "file=$backup_file"
  echo "sha256=$(cut -d ' ' -f1 "$backup_file.sha256")"
} > "$meta_file"

find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.dump" -mtime +"$KEEP_DAYS" -print -delete
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.dump.sha256" -mtime +"$KEEP_DAYS" -print -delete
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.txt" -mtime +"$KEEP_DAYS" -print -delete

echo "Backup complete:"
echo "$backup_file"
