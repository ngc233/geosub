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
PRODUCT_SLUG="${GEOSUB_PRODUCT_SLUG:-chatgpt}"
COUNTRIES="${GEOSUB_COUNTRIES:-ALL}"
DB_CONTAINER="${GEOSUB_DB_CONTAINER:-geosub-postgres}"
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"
INCLUDE_WEB="${GEOSUB_INCLUDE_WEB_PRICES:-false}"
INCLUDE_GOOGLE_PLAY="${GEOSUB_INCLUDE_GOOGLE_PLAY:-false}"
RUN_STRICT_AUTO_REVIEW="${GEOSUB_RUN_STRICT_AUTO_REVIEW:-false}"

if [[ -z "${CHROME_PATH:-}" ]]; then
  CHROME_PATH="$(command -v chromium || command -v chromium-browser || command -v google-chrome || command -v microsoft-edge || true)"
fi

if [[ -z "$CHROME_PATH" ]]; then
  echo "No Chromium-compatible browser found. Install chromium or set CHROME_PATH in $ENV_FILE."
  exit 1
fi

cd "$BACKEND_DIR"

if [[ ! -d node_modules ]]; then
  npm ci --omit=dev
fi

export CHROME_PATH
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"

EXTRA_ARGS=()
if [[ "$INCLUDE_WEB" == "true" ]]; then
  EXTRA_ARGS+=("-IncludeWeb")
fi
if [[ "$INCLUDE_GOOGLE_PLAY" == "true" ]]; then
  EXTRA_ARGS+=("-IncludeGooglePlay")
fi
if [[ "$RUN_STRICT_AUTO_REVIEW" == "true" ]]; then
  EXTRA_ARGS+=("-RunStrictAutoReview")
fi

pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass \
  -File "$BACKEND_DIR/scripts/run-price-pipeline.ps1" \
  -ProductSlug "$PRODUCT_SLUG" \
  -CountryCodes "$COUNTRIES" \
  -ContainerName "$DB_CONTAINER" \
  -DbName "$DB_NAME" \
  -DbUser "$DB_USER" \
  "${EXTRA_ARGS[@]}"
