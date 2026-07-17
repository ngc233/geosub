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
LIMIT="${GEOSUB_COLLECTOR_JOB_LIMIT:-5}"
LOCK_DIR="${GEOSUB_COLLECTOR_LOCK_DIR:-${XDG_RUNTIME_DIR:-/tmp}/geosub-${UID}}"
LOCK_FILE="${GEOSUB_COLLECTOR_LOCK_FILE:-$LOCK_DIR/collector-jobs.lock}"
EXTRA_ARGS=("$@")

cd "$BACKEND_DIR"

if ! command -v flock >/dev/null 2>&1; then
  echo "flock is required to serialize collector runs."
  exit 1
fi

install -d -m 0700 "$LOCK_DIR"
exec 9>"$LOCK_FILE"
flock 9

pwsh -NoProfile -ExecutionPolicy Bypass \
  -File "$BACKEND_DIR/scripts/run-collector-jobs.ps1" \
  -ContainerName "$DB_CONTAINER" \
  -DbName "$DB_NAME" \
  -DbUser "$DB_USER" \
  -Limit "$LIMIT" \
  "${EXTRA_ARGS[@]}"
