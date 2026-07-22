#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/rollback.sh --attempt latest --confirm DEPLOYMENT_ID"
  exit 1
fi

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

REPO_DIR="${GEOSUB_REPO_DIR:-}"
if [[ -n "$REPO_DIR" ]]; then
  BACKEND_DIR="${GEOSUB_BACKEND_DIR:-$REPO_DIR/geosub-backend}"
  FRONTEND_DIR="${GEOSUB_FRONTEND_DIR:-$REPO_DIR/ai-price-site}"
else
  BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
  FRONTEND_DIR="${GEOSUB_FRONTEND_DIR:-/opt/geosub/ai-price-site}"
fi
RELEASE_DIR="${GEOSUB_RELEASE_DIR:-/opt/geosub/releases}"
RELEASE_ROOT="$(readlink -f "$RELEASE_DIR" 2>/dev/null || printf '%s' "$RELEASE_DIR")"
ATTEMPT_REF=""
CONFIRM_ID=""
ROLLBACK_STEP="initializing"
EVIDENCE_FILE=""

usage() {
  cat <<'EOF'
Usage:
  sudo bash deploy/linux-arm64/rollback.sh --attempt latest --confirm DEPLOYMENT_ID
  sudo bash deploy/linux-arm64/rollback.sh --attempt 20260721T120000Z --confirm 20260721T120000Z

This command rolls application code back to the commits recorded before the
selected deployment, rebuilds the app and runs the normal post-deploy checks.
It verifies but does not restore the database backup. Database restoration is
intentionally a separate destructive operation.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --attempt)
      ATTEMPT_REF="${2:-}"
      shift 2
      ;;
    --confirm)
      CONFIRM_ID="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$ATTEMPT_REF" || -z "$CONFIRM_ID" ]]; then
  usage
  exit 1
fi

if [[ "$ATTEMPT_REF" == "latest" ]]; then
  ATTEMPT_FILE="$(readlink -f "$RELEASE_DIR/latest-attempt.env" 2>/dev/null || true)"
elif [[ "$ATTEMPT_REF" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  ATTEMPT_FILE="$RELEASE_DIR/attempts/$ATTEMPT_REF/deployment.env"
else
  echo "Invalid deployment attempt ID: $ATTEMPT_REF"
  exit 1
fi

ATTEMPT_FILE="$(readlink -f "$ATTEMPT_FILE" 2>/dev/null || true)"

case "$ATTEMPT_FILE" in
  "$RELEASE_ROOT"/attempts/*/deployment.env) ;;
  *)
    echo "Deployment evidence must be inside $RELEASE_DIR/attempts."
    exit 1
    ;;
esac

if [[ ! -f "$ATTEMPT_FILE" ]]; then
  echo "Deployment evidence not found: $ATTEMPT_FILE"
  exit 1
fi

if [[ "$(stat -c %u "$ATTEMPT_FILE")" != "0" || "$(stat -c %a "$ATTEMPT_FILE")" != "600" ]]; then
  echo "Deployment evidence must be owned by root with mode 0600: $ATTEMPT_FILE"
  exit 1
fi

# The evidence file is root-owned, mode 0600 and written by upgrade.sh.
# shellcheck disable=SC1090
source "$ATTEMPT_FILE"

if [[ "$CONFIRM_ID" != "${GEOSUB_DEPLOYMENT_ID:-}" ]]; then
  echo "Confirmation mismatch. Re-run with --confirm ${GEOSUB_DEPLOYMENT_ID:-DEPLOYMENT_ID}."
  exit 1
fi

if [[ -z "${GEOSUB_BACKUP_PATH:-}" || ! -f "$GEOSUB_BACKUP_PATH" || ! -f "$GEOSUB_BACKUP_PATH.sha256" ]]; then
  echo "The deployment's verified database backup is missing. Refusing rollback."
  exit 1
fi
sha256sum -c "$GEOSUB_BACKUP_PATH.sha256" >/dev/null

EVIDENCE_FILE="$(dirname "$ATTEMPT_FILE")/rollback.env"

write_rollback_state() {
  local status="$1"
  local detail="${2:-}"

  {
    printf 'GEOSUB_ROLLBACK_DEPLOYMENT_ID=%q\n' "$GEOSUB_DEPLOYMENT_ID"
    printf 'GEOSUB_ROLLBACK_STATUS=%q\n' "$status"
    printf 'GEOSUB_ROLLBACK_STEP=%q\n' "$ROLLBACK_STEP"
    printf 'GEOSUB_ROLLBACK_DETAIL=%q\n' "$detail"
    printf 'GEOSUB_ROLLBACK_DATABASE_RESTORED=%q\n' "false"
    printf 'GEOSUB_ROLLBACK_UPDATED_AT=%q\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  } > "$EVIDENCE_FILE"
  chmod 0600 "$EVIDENCE_FILE"
}

start_runtime_services() {
  systemctl start geosub-web.service 2>/dev/null || true
  systemctl start geosub-exchange-rate-sync.timer 2>/dev/null || true
  systemctl start geosub-price-pipeline.timer 2>/dev/null || true
  systemctl start geosub-collector-jobs.timer 2>/dev/null || true
  systemctl start geosub-discovery-scan.timer 2>/dev/null || true
  systemctl start geosub-analytics-aggregation.timer 2>/dev/null || true
  systemctl start geosub-db-backup.timer 2>/dev/null || true
  systemctl start geosub-event-retention.timer 2>/dev/null || true
}

stop_runtime_services() {
  systemctl stop geosub-price-pipeline.timer 2>/dev/null || true
  systemctl stop geosub-collector-jobs.timer 2>/dev/null || true
  systemctl stop geosub-discovery-scan.timer 2>/dev/null || true
  systemctl stop geosub-exchange-rate-sync.timer 2>/dev/null || true
  systemctl stop geosub-analytics-aggregation.timer 2>/dev/null || true
  systemctl stop geosub-db-backup.timer 2>/dev/null || true
  systemctl stop geosub-event-retention.timer 2>/dev/null || true
  systemctl stop geosub-web.service 2>/dev/null || true
}

rollback_failed() {
  local exit_code="$1"
  local failed_line="$2"

  trap - ERR
  set +e
  write_rollback_state "failed" "exit_code=$exit_code line=$failed_line"
  start_runtime_services
  printf '\nRollback failed during step: %s\n' "$ROLLBACK_STEP" >&2
  printf 'Rollback evidence: %s\n' "$EVIDENCE_FILE" >&2
  printf 'Database was not restored. Verified backup remains at: %s\n' "$GEOSUB_BACKUP_PATH" >&2
  exit "$exit_code"
}

validate_commit() {
  local directory="$1"
  local commit="$2"

  if [[ ! "$commit" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
    echo "No valid rollback commit recorded for $directory: $commit"
    exit 1
  fi
  sudo -u geosub git -C "$directory" cat-file -e "$commit^{commit}"
}

checkout_commit() {
  local directory="$1"
  local commit="$2"

  validate_commit "$directory" "$commit"
  sudo -u geosub git -C "$directory" checkout --detach "$commit"
}

write_rollback_state "started" "confirmation and backup checksum verified"
trap 'rollback_failed "$?" "$LINENO"' ERR

ROLLBACK_STEP="stop_runtime"
write_rollback_state "running"
stop_runtime_services

ROLLBACK_STEP="checkout_previous_code"
write_rollback_state "running"
if [[ -n "$REPO_DIR" ]]; then
  checkout_commit "$REPO_DIR" "${GEOSUB_PREVIOUS_COMMIT:-unknown}"
else
  checkout_commit "$BACKEND_DIR" "${GEOSUB_PREVIOUS_BACKEND_COMMIT:-unknown}"
  checkout_commit "$FRONTEND_DIR" "${GEOSUB_PREVIOUS_FRONTEND_COMMIT:-unknown}"
fi

ROLLBACK_STEP="dependencies_and_build"
write_rollback_state "running"
sudo -u geosub bash -lc "cd '$BACKEND_DIR' && npm ci --omit=dev"
sudo -u geosub bash -lc "set -a && source '$ENV_FILE' && set +a && cd '$FRONTEND_DIR' && npm ci && npx prisma generate && npm run build"

ROLLBACK_STEP="service_start"
write_rollback_state "running"
start_runtime_services

ROLLBACK_STEP="post_rollback_health"
write_rollback_state "running"
bash "$BACKEND_DIR/deploy/linux-arm64/post-deploy-check.sh"

ROLLBACK_STEP="release_record"
write_rollback_state "running"
ROLLBACK_SOURCE_DIR="$BACKEND_DIR"
if [[ -n "$REPO_DIR" ]]; then
  ROLLBACK_SOURCE_DIR="$REPO_DIR"
fi
ROLLBACK_VERSION="unknown"
if [[ -f "$ROLLBACK_SOURCE_DIR/VERSION" ]]; then
  ROLLBACK_VERSION="$(tr -d '[:space:]' < "$ROLLBACK_SOURCE_DIR/VERSION")"
elif [[ -f "$(dirname "$BACKEND_DIR")/VERSION" ]]; then
  ROLLBACK_VERSION="$(tr -d '[:space:]' < "$(dirname "$BACKEND_DIR")/VERSION")"
fi
ROLLBACK_COMMIT="${GEOSUB_PREVIOUS_COMMIT:-split-repositories}"
if [[ -z "$REPO_DIR" ]]; then
  ROLLBACK_COMMIT="backend:${GEOSUB_PREVIOUS_BACKEND_COMMIT:-unknown},frontend:${GEOSUB_PREVIOUS_FRONTEND_COMMIT:-unknown}"
fi
cat > "$RELEASE_DIR/current.env" <<EOF
GEOSUB_VERSION=$ROLLBACK_VERSION
GEOSUB_COMMIT=$ROLLBACK_COMMIT
GEOSUB_BRANCH=detached-rollback
GEOSUB_DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

ROLLBACK_STEP="complete"
write_rollback_state "succeeded" "application code restored; database unchanged"
printf '%s rollback deployment=%s target=%s database_restored=false\n' \
  "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  "$GEOSUB_DEPLOYMENT_ID" \
  "$ROLLBACK_COMMIT" >> "$RELEASE_DIR/history.log"
trap - ERR

echo "Rollback complete."
echo "Application code was rebuilt from the recorded previous commit."
echo "Database was not restored; verified backup retained at: $GEOSUB_BACKUP_PATH"
echo "Evidence: $EVIDENCE_FILE"
