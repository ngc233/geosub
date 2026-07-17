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
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"
BACKUP_DIR="${GEOSUB_BACKUP_DIR:-/opt/geosub/backups}"
KEEP_DAYS="${GEOSUB_BACKUP_KEEP_DAYS:-14}"
MIRROR_DIR="${GEOSUB_BACKUP_MIRROR_DIR:-}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 0700 "$BACKUP_DIR"

backup_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.dump"
meta_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.txt"
partial_file="${backup_file}.partial"

cleanup() {
  rm -f "$partial_file"
}
trap cleanup EXIT

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Database container '$DB_CONTAINER' is not running."
  exit 1
fi

echo "Creating backup: $backup_file"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$partial_file"

if [[ ! -s "$partial_file" ]]; then
  echo "Backup is empty: $partial_file"
  exit 1
fi

echo "Verifying backup catalog"
docker exec -i "$DB_CONTAINER" pg_restore --list < "$partial_file" >/dev/null
mv "$partial_file" "$backup_file"

sha256sum "$backup_file" > "$backup_file.sha256"

{
  echo "database=$DB_NAME"
  echo "container=$DB_CONTAINER"
  echo "created_at_utc=$timestamp"
  echo "format=pg_dump custom"
  echo "file=$backup_file"
  echo "sha256=$(cut -d ' ' -f1 "$backup_file.sha256")"
} > "$meta_file"

if [[ -n "$MIRROR_DIR" ]]; then
  install -d -m 0700 "$MIRROR_DIR"
  cp -p "$backup_file" "$backup_file.sha256" "$meta_file" "$MIRROR_DIR/"
  echo "Backup mirrored to: $MIRROR_DIR"
fi

find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.dump" -mtime +"$KEEP_DAYS" -print -delete
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.dump.sha256" -mtime +"$KEEP_DAYS" -print -delete
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.txt" -mtime +"$KEEP_DAYS" -print -delete

if [[ -n "$MIRROR_DIR" ]]; then
  find "$MIRROR_DIR" -type f -name "${DB_NAME}_*.dump" -mtime +"$KEEP_DAYS" -print -delete
  find "$MIRROR_DIR" -type f -name "${DB_NAME}_*.dump.sha256" -mtime +"$KEEP_DAYS" -print -delete
  find "$MIRROR_DIR" -type f -name "${DB_NAME}_*.txt" -mtime +"$KEEP_DAYS" -print -delete
fi

echo "Backup complete:"
echo "$backup_file"
