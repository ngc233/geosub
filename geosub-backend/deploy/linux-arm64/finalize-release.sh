#!/usr/bin/env bash
# Register an already-serving candidate only after all original gates pass.
set -Eeuo pipefail
[[ $(id -u) == 0 ]] || { echo 'Linux root required'; exit 1; }
set -a
source "${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
set +a
[[ ${GEOSUB_DEPLOY_MODE:-rolling-v1} == rolling-v1 ]] || { echo 'Rolling mode required'; exit 1; }
exec node "$(dirname "$0")/rolling-release.mjs" finalize "$@"
