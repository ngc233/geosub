#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="${GEOSUB_FRONTEND_DIR:-/opt/geosub/ai-price-site}"
WEB_SERVICE="${GEOSUB_WEB_SERVICE:-geosub-web.service}"
SINCE="-24 hours"
OUTPUT_JSON=false

for argument in "$@"; do
  case "$argument" in
    --since=*) SINCE="${argument#--since=}" ;;
    --service=*) WEB_SERVICE="${argument#--service=}" ;;
    --json) OUTPUT_JSON=true ;;
    *)
      printf 'Unknown argument: %s\n' "$argument" >&2
      exit 2
      ;;
  esac
done

SUMMARIZER="$FRONTEND_DIR/scripts/summarize-admin-performance.cjs"
if [[ ! -f "$SUMMARIZER" ]]; then
  printf 'Admin performance summarizer not found: %s\n' "$SUMMARIZER" >&2
  exit 1
fi

printf 'GeoSub admin performance profile\n'
printf 'service=%s\n' "$WEB_SERVICE"
printf 'since=%s\n\n' "$SINCE"

arguments=()
if [[ "$OUTPUT_JSON" == "true" ]]; then
  arguments+=(--json)
fi

journalctl \
  -u "$WEB_SERVICE" \
  --since "$SINCE" \
  --no-pager \
  --quiet \
  -o cat | node "$SUMMARIZER" "${arguments[@]}"
