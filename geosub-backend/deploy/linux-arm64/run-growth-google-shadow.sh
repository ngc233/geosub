#!/usr/bin/env bash
set -euo pipefail
umask 077
ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi
if [[ "${GEOSUB_GROWTH_GOOGLE_ENABLED:-false}" != "true" ]]; then
  echo "Google growth shadow collector is disabled."
  exit 0
fi
BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
OUTPUT_DIR="${GEOSUB_GROWTH_OUTPUT_DIR:-/var/lib/geosub/growth}"
mkdir -p "$OUTPUT_DIR"
if [[ -z "${GEOSUB_GOOGLE_START_DATE:-}" && -z "${GEOSUB_GOOGLE_END_DATE:-}" ]]; then
  window="$(node "$BACKEND_DIR/scripts/growth-google-window.mjs")"
  read -r GEOSUB_GOOGLE_START_DATE GEOSUB_GOOGLE_END_DATE <<< "$window"
elif [[ -z "${GEOSUB_GOOGLE_START_DATE:-}" || -z "${GEOSUB_GOOGLE_END_DATE:-}" ]]; then
  echo "Configure both Google window dates or neither." >&2
  exit 1
fi
export GEOSUB_GOOGLE_START_DATE GEOSUB_GOOGLE_END_DATE
# Scheduled operation must exercise refresh credentials, not an expired one-hour token.
unset GEOSUB_GOOGLE_ACCESS_TOKEN GEOSUB_GOOGLE_TOKEN_FILE
export GEOSUB_GOOGLE_SITE_URL="${GEOSUB_GOOGLE_SITE_URL:-sc-domain:geosub.org}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output_file="$OUTPUT_DIR/google-shadow-$timestamp-$$.json"
export GEOSUB_GOOGLE_OUTPUT_FILE="$output_file"
node "$BACKEND_DIR/scripts/growth-google-shadow.mjs"
latest_tmp="$(mktemp "$OUTPUT_DIR/.google-shadow-latest.XXXXXX")"
trap 'rm -f "$latest_tmp"' EXIT
install -m 0600 "$output_file" "$latest_tmp"
mv -f "$latest_tmp" "$OUTPUT_DIR/google-shadow-latest.json"
echo "Google growth shadow snapshot written: $output_file"
