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
BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
for flag in GEOSUB_INCLUDE_WEB_PRICES GEOSUB_INCLUDE_GOOGLE_PLAY GEOSUB_RUN_STRICT_AUTO_REVIEW; do
  if [[ "${!flag:-false}" != "false" ]]; then
    echo "Legacy optional collection/review flags require a separate configured collector job."
    exit 2
  fi
done

# No direct collector call, dependency install or independent lock here.
# The canonical wrapper reloads the selected release after acquiring its lock.
exec /bin/bash "$BACKEND_DIR/deploy/linux-arm64/run-collector-jobs.sh" \
  -ProductSlug "${GEOSUB_PRODUCT_SLUG:-chatgpt}" \
  -CollectorKind app_store -PrimarySourceOnly \
  -CountryCodes "${GEOSUB_COUNTRIES:-ALL}" "$@"
