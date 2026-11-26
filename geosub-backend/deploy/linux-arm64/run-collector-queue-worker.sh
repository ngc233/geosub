#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -n "${GEOSUB_COLLECTOR_ENV_FILE:-}" && -f "$GEOSUB_COLLECTOR_ENV_FILE" ]]; then
  ENV_FILE="$GEOSUB_COLLECTOR_ENV_FILE"
fi
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKEND_DIR="$(readlink -f "${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}")"
export GEOSUB_BACKEND_DIR="$BACKEND_DIR"
cd "$BACKEND_DIR"

exec node "$BACKEND_DIR/scripts/collector-queue-worker.mjs" "$@"
