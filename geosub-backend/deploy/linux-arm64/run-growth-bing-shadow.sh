#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ "${GEOSUB_GROWTH_BING_ENABLED:-false}" != "true" ]]; then
  echo "Bing growth shadow collector is disabled."
  exit 0
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
OUTPUT_DIR="${GEOSUB_GROWTH_OUTPUT_DIR:-/var/lib/geosub/growth}"
mkdir -p "$OUTPUT_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output_file="$OUTPUT_DIR/bing-shadow-$timestamp.json"

export GEOSUB_BING_OUTPUT_FILE="$output_file"
node "$BACKEND_DIR/scripts/growth-bing-shadow.mjs"
install -m 0600 "$output_file" "$OUTPUT_DIR/bing-shadow-latest.json"
echo "Bing growth shadow snapshot written: $output_file"
