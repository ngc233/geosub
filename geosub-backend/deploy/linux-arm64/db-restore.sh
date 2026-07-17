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

BACKUP_FILE="${1:-}"
CONFIRM="${2:-}"

if [[ -z "$BACKUP_FILE" || "$CONFIRM" != "DROP_AND_RESTORE" ]]; then
  echo "Usage: $0 /path/to/backup.dump DROP_AND_RESTORE"
  echo
  echo "This is destructive. It drops and recreates database '$DB_NAME'."
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file does not exist: $BACKUP_FILE"
  exit 1
fi

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "Backup file is empty: $BACKUP_FILE"
  exit 1
fi

if [[ -f "$BACKUP_FILE.sha256" ]]; then
  sha256sum -c "$BACKUP_FILE.sha256"
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Database container '$DB_CONTAINER' is not running."
  exit 1
fi

echo "Checking backup catalog before destructive restore"
docker exec -i "$DB_CONTAINER" pg_restore --list < "$BACKUP_FILE" >/dev/null

echo "Dropping and recreating database: $DB_NAME"
docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists --force "$DB_NAME"
docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$DB_NAME"

echo "Restoring from: $BACKUP_FILE"
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges < "$BACKUP_FILE"

echo "Restore complete."
