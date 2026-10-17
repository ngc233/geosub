#!/usr/bin/env bash
# One-time registration of an already running, verified release.
set -Eeuo pipefail
[[ $(id -u) == 0 ]] || { echo 'Linux root required'; exit 1; }
export GEOSUB_ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
set -a
source "$GEOSUB_ENV_FILE"
set +a
exec node "$(dirname "$0")/rolling-release.mjs" adopt "$@"
