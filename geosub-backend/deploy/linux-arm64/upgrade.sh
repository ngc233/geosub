#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/upgrade.sh"
  exit 1
fi

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
FRONTEND_DIR="${GEOSUB_FRONTEND_DIR:-/opt/geosub/ai-price-site}"
BRANCH="${GEOSUB_GIT_BRANCH:-main}"
SKIP_GIT_PULL="${GEOSUB_SKIP_GIT_PULL:-false}"
RUN_CONTENT_MIGRATIONS="${GEOSUB_RUN_CONTENT_MIGRATIONS:-false}"

log() {
  printf '\n==> %s\n' "$1"
}

run_as_geosub() {
  sudo -u geosub bash -lc "$1"
}

ensure_repo() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "Directory not found: $dir"
    exit 1
  fi
  if [[ ! -d "$dir/.git" && "$SKIP_GIT_PULL" != "true" ]]; then
    echo "Git repository not found in $dir. Set GEOSUB_SKIP_GIT_PULL=true to upgrade from already-copied files."
    exit 1
  fi
}

git_update() {
  local dir="$1"
  if [[ "$SKIP_GIT_PULL" == "true" ]]; then
    echo "Skipping git pull for $dir."
    return
  fi

  run_as_geosub "cd '$dir' && git fetch --all --prune && git checkout '$BRANCH' && git pull --ff-only origin '$BRANCH'"
}

log "Checking project directories"
ensure_repo "$BACKEND_DIR"
ensure_repo "$FRONTEND_DIR"

log "Stopping timers and web service"
systemctl stop geosub-price-pipeline.timer 2>/dev/null || true
systemctl stop geosub-collector-jobs.timer 2>/dev/null || true
systemctl stop geosub-discovery-scan.timer 2>/dev/null || true
systemctl stop geosub-web.service 2>/dev/null || true

log "Creating database backup"
bash "$BACKEND_DIR/deploy/linux-arm64/db-backup.sh"

log "Updating backend repository"
git_update "$BACKEND_DIR"

log "Updating frontend repository"
git_update "$FRONTEND_DIR"

log "Installing backend tool dependencies"
run_as_geosub "cd '$BACKEND_DIR' && npm ci --omit=dev"

log "Installing frontend dependencies and building Next.js"
run_as_geosub "cd '$FRONTEND_DIR' && npm ci && npm run build"

log "Applying core database migrations"
bash "$BACKEND_DIR/deploy/linux-arm64/db-apply-sql.sh" core

if [[ "$RUN_CONTENT_MIGRATIONS" == "true" ]]; then
  log "Applying content database migrations"
  bash "$BACKEND_DIR/deploy/linux-arm64/db-apply-sql.sh" content
else
  echo "Content migrations skipped. Set GEOSUB_RUN_CONTENT_MIGRATIONS=true when intentionally updating content seed SQL."
fi

log "Refreshing systemd units"
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-web.service" /etc/systemd/system/geosub-web.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-price-pipeline.service" /etc/systemd/system/geosub-price-pipeline.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-price-pipeline.timer" /etc/systemd/system/geosub-price-pipeline.timer
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-jobs.service" /etc/systemd/system/geosub-collector-jobs.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-jobs.timer" /etc/systemd/system/geosub-collector-jobs.timer
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-discovery-scan.service" /etc/systemd/system/geosub-discovery-scan.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-discovery-scan.timer" /etc/systemd/system/geosub-discovery-scan.timer
systemctl daemon-reload

log "Running database smoke check"
bash "$BACKEND_DIR/deploy/linux-arm64/db-smoke-check.sh"

log "Starting services"
systemctl start geosub-web.service
systemctl start geosub-price-pipeline.timer 2>/dev/null || true
systemctl start geosub-collector-jobs.timer 2>/dev/null || true
systemctl start geosub-discovery-scan.timer 2>/dev/null || true

log "Upgrade complete"
systemctl --no-pager --full status geosub-web.service || true
