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

cd "$BACKEND_DIR"

pwsh -NoProfile -ExecutionPolicy Bypass \
  -File "$BACKEND_DIR/scripts/run-collector-jobs.ps1" \
  -ContainerName "$DB_CONTAINER" \
  -DbName "$DB_NAME" \
  -DbUser "$DB_USER" \
  -Limit "$LIMIT"
