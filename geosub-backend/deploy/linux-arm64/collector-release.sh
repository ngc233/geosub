#!/usr/bin/env bash
set -euo pipefail
set -a
source "${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
set +a
exec node "$(dirname "$0")/collector-release.mjs" "$@"
