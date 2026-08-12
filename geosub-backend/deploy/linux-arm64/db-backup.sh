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

if [[ ! "$KEEP_DAYS" =~ ^[1-9][0-9]*$ ]]; then
  echo "GEOSUB_BACKUP_KEEP_DAYS must be a positive integer, got: $KEEP_DAYS"
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 0700 "$BACKUP_DIR"

backup_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.dump"
meta_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.txt"
counts_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.counts.tsv"
checksum_file="$backup_file.sha256"
partial_file="${backup_file}.partial"
counts_partial_file="${counts_file}.partial"
catalog_file="${backup_file}.catalog.partial"
checksum_partial_file="${checksum_file}.partial"
meta_partial_file="${meta_file}.partial"

cleanup() {
  rm -f \
    "$partial_file" \
    "$counts_partial_file" \
    "$catalog_file" \
    "$checksum_partial_file" \
    "$meta_partial_file"
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
docker exec -i "$DB_CONTAINER" pg_restore --list < "$partial_file" > "$catalog_file"

for required_entry in \
  'TABLE public products' \
  'TABLE DATA public products' \
  'TABLE public plans' \
  'TABLE DATA public plans' \
  'TABLE public region_prices' \
  'TABLE DATA public region_prices'; do
  if ! grep -Fq "$required_entry" "$catalog_file"; then
    echo "Backup catalog is missing required entry: $required_entry"
    exit 1
  fi
done

echo "Recording key table row counts"
docker exec -i "$DB_CONTAINER" psql \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -X \
  -v ON_ERROR_STOP=1 \
  -At \
  -F $'\t' \
  -f - \
  < "$(dirname "$0")/db-restore-counts.sql" \
  > "$counts_partial_file"

backup_hash="$(sha256sum "$partial_file" | cut -d ' ' -f1)"
counts_hash="$(sha256sum "$counts_partial_file" | cut -d ' ' -f1)"
printf '%s  %s\n' "$backup_hash" "$backup_file" > "$checksum_partial_file"

{
  echo "database=$DB_NAME"
  echo "container=$DB_CONTAINER"
  echo "created_at_utc=$timestamp"
  echo "format=pg_dump custom"
  echo "file=$backup_file"
  echo "sha256=$backup_hash"
  echo "counts_file=$counts_file"
  echo "counts_sha256=$counts_hash"
  echo "keep_days=$KEEP_DAYS"
  echo "mirror_dir=${MIRROR_DIR:-NOT_CONFIGURED}"
} > "$meta_partial_file"

mv "$partial_file" "$backup_file"
mv "$counts_partial_file" "$counts_file"
mv "$checksum_partial_file" "$checksum_file"
mv "$meta_partial_file" "$meta_file"

if [[ -n "$MIRROR_DIR" ]]; then
  install -d -m 0700 "$MIRROR_DIR"
  cp -p "$backup_file" "$checksum_file" "$meta_file" "$counts_file" "$MIRROR_DIR/"
  mirror_backup="$MIRROR_DIR/$(basename "$backup_file")"
  source_hash="$(sha256sum "$backup_file" | cut -d ' ' -f1)"
  mirror_hash="$(sha256sum "$mirror_backup" | cut -d ' ' -f1)"
  if [[ "$source_hash" != "$mirror_hash" ]]; then
    echo "Mirrored backup checksum mismatch: $mirror_backup"
    rm -f "$mirror_backup" "$MIRROR_DIR/$(basename "$checksum_file")" "$MIRROR_DIR/$(basename "$meta_file")" "$MIRROR_DIR/$(basename "$counts_file")"
    exit 1
  fi
  echo "Backup mirrored to: $MIRROR_DIR"
fi

retention_minutes="$((KEEP_DAYS * 24 * 60))"
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.dump" -mmin +"$retention_minutes" -print -delete
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.dump.sha256" -mmin +"$retention_minutes" -print -delete
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.counts.tsv" -mmin +"$retention_minutes" -print -delete
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.txt" -mmin +"$retention_minutes" -print -delete

if [[ -n "$MIRROR_DIR" ]]; then
  find "$MIRROR_DIR" -type f -name "${DB_NAME}_*.dump" -mmin +"$retention_minutes" -print -delete
  find "$MIRROR_DIR" -type f -name "${DB_NAME}_*.dump.sha256" -mmin +"$retention_minutes" -print -delete
  find "$MIRROR_DIR" -type f -name "${DB_NAME}_*.counts.tsv" -mmin +"$retention_minutes" -print -delete
  find "$MIRROR_DIR" -type f -name "${DB_NAME}_*.txt" -mmin +"$retention_minutes" -print -delete
fi

echo "Backup complete:"
echo "$backup_file"
