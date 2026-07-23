#!/usr/bin/env bash
set -Eeuo pipefail

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

REPO_DIR="${GEOSUB_REPO_DIR:-}"
if [[ -n "$REPO_DIR" ]]; then
  BACKEND_DIR="${GEOSUB_BACKEND_DIR:-$REPO_DIR/geosub-backend}"
  FRONTEND_DIR="${GEOSUB_FRONTEND_DIR:-$REPO_DIR/ai-price-site}"
else
  BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
  FRONTEND_DIR="${GEOSUB_FRONTEND_DIR:-/opt/geosub/ai-price-site}"
fi
BRANCH="${GEOSUB_GIT_BRANCH:-main}"
SKIP_GIT_PULL="${GEOSUB_SKIP_GIT_PULL:-false}"
RUN_CONTENT_MIGRATIONS="${GEOSUB_RUN_CONTENT_MIGRATIONS:-false}"
RELEASE_DIR="${GEOSUB_RELEASE_DIR:-/opt/geosub/releases}"
LOGO_STORAGE_DIR="${GEOSUB_LOGO_STORAGE_DIR:-/var/lib/geosub/product-logos}"
BACKUP_DIR="${GEOSUB_BACKUP_DIR:-/opt/geosub/backups}"
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DEPLOYMENT_ID="$(date -u +%Y%m%dT%H%M%SZ)"
ATTEMPT_DIR="$RELEASE_DIR/attempts/$DEPLOYMENT_ID"
ATTEMPT_FILE="$ATTEMPT_DIR/deployment.env"
CURRENT_STEP="initializing"
PREVIOUS_COMMIT="unknown"
TARGET_COMMIT="unknown"
PREVIOUS_BACKEND_COMMIT="unknown"
PREVIOUS_FRONTEND_COMMIT="unknown"
TARGET_BACKEND_COMMIT="unknown"
TARGET_FRONTEND_COMMIT="unknown"
BACKUP_PATH=""

log() {
  printf '\n==> %s\n' "$1"
}

run_as_geosub() {
  sudo -u geosub bash -lc "$1"
}

repo_commit() {
  local source_dir="$BACKEND_DIR"

  if [[ -n "$REPO_DIR" ]]; then
    source_dir="$REPO_DIR"
  fi

  if [[ -d "$source_dir/.git" ]]; then
    sudo -u geosub git -C "$source_dir" rev-parse HEAD 2>/dev/null || echo unknown
  elif [[ -d "$BACKEND_DIR/.git" ]]; then
    sudo -u geosub git -C "$BACKEND_DIR" rev-parse HEAD 2>/dev/null || echo unknown
  else
    echo unknown
  fi
}

directory_commit() {
  local directory="$1"

  if [[ -d "$directory/.git" ]]; then
    sudo -u geosub git -C "$directory" rev-parse HEAD 2>/dev/null || echo unknown
  else
    echo unknown
  fi
}

write_attempt_state() {
  local status="$1"
  local detail="${2:-}"

  install -d -m 0700 "$ATTEMPT_DIR"
  {
    printf 'GEOSUB_DEPLOYMENT_ID=%q\n' "$DEPLOYMENT_ID"
    printf 'GEOSUB_DEPLOYMENT_STATUS=%q\n' "$status"
    printf 'GEOSUB_DEPLOYMENT_STEP=%q\n' "$CURRENT_STEP"
    printf 'GEOSUB_PREVIOUS_COMMIT=%q\n' "$PREVIOUS_COMMIT"
    printf 'GEOSUB_TARGET_COMMIT=%q\n' "$TARGET_COMMIT"
    printf 'GEOSUB_PREVIOUS_BACKEND_COMMIT=%q\n' "$PREVIOUS_BACKEND_COMMIT"
    printf 'GEOSUB_PREVIOUS_FRONTEND_COMMIT=%q\n' "$PREVIOUS_FRONTEND_COMMIT"
    printf 'GEOSUB_TARGET_BACKEND_COMMIT=%q\n' "$TARGET_BACKEND_COMMIT"
    printf 'GEOSUB_TARGET_FRONTEND_COMMIT=%q\n' "$TARGET_FRONTEND_COMMIT"
    printf 'GEOSUB_BRANCH=%q\n' "$BRANCH"
    printf 'GEOSUB_BACKUP_PATH=%q\n' "$BACKUP_PATH"
    printf 'GEOSUB_DEPLOYMENT_DETAIL=%q\n' "$detail"
    printf 'GEOSUB_DEPLOYMENT_UPDATED_AT=%q\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  } > "$ATTEMPT_FILE"
  chmod 0600 "$ATTEMPT_FILE"
  ln -sfn "$ATTEMPT_FILE" "$RELEASE_DIR/latest-attempt.env"
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

deployment_failed() {
  local exit_code="$1"
  local failed_line="$2"

  trap - ERR
  set +e
  write_attempt_state "failed" "exit_code=$exit_code line=$failed_line"
  start_runtime_services
  printf '\nDeployment failed during step: %s\n' "$CURRENT_STEP" >&2
  printf 'Attempt evidence: %s\n' "$ATTEMPT_FILE" >&2
  printf 'Previous commit: %s\n' "$PREVIOUS_COMMIT" >&2
  printf 'Target commit: %s\n' "$TARGET_COMMIT" >&2
  printf 'Verified backup: %s\n' "${BACKUP_PATH:-not-created}" >&2
  printf 'Runtime services were restarted on a best-effort basis. Inspect the evidence before any rollback.\n' >&2
  exit "$exit_code"
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

record_release() {
  local version="unknown"
  local commit="unknown"
  local source_dir="$BACKEND_DIR"

  if [[ -n "$REPO_DIR" ]]; then
    source_dir="$REPO_DIR"
  fi

  if [[ -f "$source_dir/VERSION" ]]; then
    version="$(tr -d '[:space:]' < "$source_dir/VERSION")"
  elif [[ -f "$(dirname "$BACKEND_DIR")/VERSION" ]]; then
    version="$(tr -d '[:space:]' < "$(dirname "$BACKEND_DIR")/VERSION")"
  fi

  if [[ -d "$source_dir/.git" ]]; then
    commit="$(sudo -u geosub git -C "$source_dir" rev-parse --short HEAD 2>/dev/null || echo unknown)"
  elif [[ -d "$BACKEND_DIR/.git" ]]; then
    commit="$(sudo -u geosub git -C "$BACKEND_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
  fi

  mkdir -p "$RELEASE_DIR"
  cat > "$RELEASE_DIR/current.env" <<EOF
GEOSUB_VERSION=$version
GEOSUB_COMMIT=$commit
GEOSUB_BRANCH=$BRANCH
GEOSUB_DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
  printf '%s version=%s commit=%s branch=%s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$version" "$commit" "$BRANCH" >> "$RELEASE_DIR/history.log"
  echo "Recorded release: version=$version commit=$commit"
}

log "Checking project directories"
if [[ -n "$REPO_DIR" ]]; then
  ensure_repo "$REPO_DIR"
  if [[ ! -d "$BACKEND_DIR" ]]; then
    echo "Directory not found: $BACKEND_DIR"
    exit 1
  fi
  if [[ ! -d "$FRONTEND_DIR" ]]; then
    echo "Directory not found: $FRONTEND_DIR"
    exit 1
  fi
else
  ensure_repo "$BACKEND_DIR"
  ensure_repo "$FRONTEND_DIR"
fi

mkdir -p "$RELEASE_DIR"
PREVIOUS_COMMIT="$(repo_commit)"
TARGET_COMMIT="$PREVIOUS_COMMIT"
if [[ -n "$REPO_DIR" ]]; then
  PREVIOUS_BACKEND_COMMIT="$PREVIOUS_COMMIT"
  PREVIOUS_FRONTEND_COMMIT="$PREVIOUS_COMMIT"
else
  PREVIOUS_BACKEND_COMMIT="$(directory_commit "$BACKEND_DIR")"
  PREVIOUS_FRONTEND_COMMIT="$(directory_commit "$FRONTEND_DIR")"
fi
TARGET_BACKEND_COMMIT="$PREVIOUS_BACKEND_COMMIT"
TARGET_FRONTEND_COMMIT="$PREVIOUS_FRONTEND_COMMIT"
write_attempt_state "started" "pre-deploy checks complete"
trap 'deployment_failed "$?" "$LINENO"' ERR

CURRENT_STEP="persistent_storage"
write_attempt_state "running"
log "Preparing persistent product logo storage"
install -d -m 0755 -o geosub -g geosub "$LOGO_STORAGE_DIR"

CURRENT_STEP="stop_runtime"
write_attempt_state "running"
log "Stopping timers and web service"
systemctl stop geosub-price-pipeline.timer 2>/dev/null || true
systemctl stop geosub-collector-jobs.timer 2>/dev/null || true
systemctl stop geosub-discovery-scan.timer 2>/dev/null || true
systemctl stop geosub-exchange-rate-sync.timer 2>/dev/null || true
systemctl stop geosub-analytics-aggregation.timer 2>/dev/null || true
systemctl stop geosub-db-backup.timer 2>/dev/null || true
systemctl stop geosub-event-retention.timer 2>/dev/null || true
systemctl stop geosub-web.service 2>/dev/null || true

CURRENT_STEP="database_backup"
write_attempt_state "running"
log "Creating database backup"
bash "$BACKEND_DIR/deploy/linux-arm64/db-backup.sh"
BACKUP_PATH="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}_*.dump" -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d ' ' -f2-)"
if [[ -z "$BACKUP_PATH" || ! -f "$BACKUP_PATH.sha256" ]]; then
  echo "Verified deployment backup was not found after backup completed."
  exit 1
fi
sha256sum -c "$BACKUP_PATH.sha256" >/dev/null
write_attempt_state "running" "verified backup created"

CURRENT_STEP="source_update"
write_attempt_state "running"
if [[ -n "$REPO_DIR" ]]; then
  log "Updating repository"
  git_update "$REPO_DIR"
else
  log "Updating backend repository"
  git_update "$BACKEND_DIR"

  log "Updating frontend repository"
  git_update "$FRONTEND_DIR"
fi
TARGET_COMMIT="$(repo_commit)"
if [[ -n "$REPO_DIR" ]]; then
  TARGET_BACKEND_COMMIT="$TARGET_COMMIT"
  TARGET_FRONTEND_COMMIT="$TARGET_COMMIT"
else
  TARGET_BACKEND_COMMIT="$(directory_commit "$BACKEND_DIR")"
  TARGET_FRONTEND_COMMIT="$(directory_commit "$FRONTEND_DIR")"
fi
write_attempt_state "running" "source updated"

CURRENT_STEP="dependencies_and_build"
write_attempt_state "running"
log "Installing backend tool dependencies"
run_as_geosub "cd '$BACKEND_DIR' && npm ci --omit=dev"

log "Installing frontend dependencies and building Next.js"
run_as_geosub "set -a && source '$ENV_FILE' && set +a && cd '$FRONTEND_DIR' && npm ci && npx prisma generate && npm run build"

CURRENT_STEP="database_migrations"
write_attempt_state "running"
log "Applying core database migrations"
bash "$BACKEND_DIR/deploy/linux-arm64/db-apply-sql.sh" core

log "Applying Prisma database migrations"
run_as_geosub "set -a && source '$ENV_FILE' && set +a && cd '$FRONTEND_DIR' && npx prisma migrate deploy"

if [[ "$RUN_CONTENT_MIGRATIONS" == "true" ]]; then
  log "Applying content database migrations"
  bash "$BACKEND_DIR/deploy/linux-arm64/db-apply-sql.sh" content
else
  echo "Content migrations skipped. Set GEOSUB_RUN_CONTENT_MIGRATIONS=true when intentionally updating content seed SQL."
fi

CURRENT_STEP="product_logos"
write_attempt_state "running"
log "Synchronizing persistent product logos"
run_as_geosub "set -a && source '$ENV_FILE' && set +a && export NODE_ENV=production GEOSUB_LOGO_STORAGE_DIR='$LOGO_STORAGE_DIR' && cd '$FRONTEND_DIR' && npm run sync:logos"

CURRENT_STEP="systemd_units"
write_attempt_state "running"
log "Refreshing systemd units"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-system-task.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-price-pipeline.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-collector-jobs.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-discovery-scan.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-exchange-rate-sync.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-analytics-aggregation.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-event-retention.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/db-backup.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/post-deploy-check.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/rollback.sh"
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-web.service" /etc/systemd/system/geosub-web.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-exchange-rate-sync.service" /etc/systemd/system/geosub-exchange-rate-sync.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-exchange-rate-sync.timer" /etc/systemd/system/geosub-exchange-rate-sync.timer
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-price-pipeline.service" /etc/systemd/system/geosub-price-pipeline.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-price-pipeline.timer" /etc/systemd/system/geosub-price-pipeline.timer
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-jobs.service" /etc/systemd/system/geosub-collector-jobs.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-jobs.timer" /etc/systemd/system/geosub-collector-jobs.timer
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-discovery-scan.service" /etc/systemd/system/geosub-discovery-scan.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-discovery-scan.timer" /etc/systemd/system/geosub-discovery-scan.timer
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-analytics-aggregation.service" /etc/systemd/system/geosub-analytics-aggregation.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-analytics-aggregation.timer" /etc/systemd/system/geosub-analytics-aggregation.timer
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-db-backup.service" /etc/systemd/system/geosub-db-backup.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-db-backup.timer" /etc/systemd/system/geosub-db-backup.timer
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-event-retention.service" /etc/systemd/system/geosub-event-retention.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-event-retention.timer" /etc/systemd/system/geosub-event-retention.timer
systemctl daemon-reload
systemctl enable geosub-web.service
systemctl enable geosub-exchange-rate-sync.timer
systemctl enable geosub-price-pipeline.timer
systemctl enable geosub-collector-jobs.timer
systemctl enable geosub-discovery-scan.timer
systemctl enable geosub-analytics-aggregation.timer
systemctl enable geosub-db-backup.timer
systemctl enable geosub-event-retention.timer

CURRENT_STEP="database_smoke_check"
write_attempt_state "running"
log "Running database smoke check"
bash "$BACKEND_DIR/deploy/linux-arm64/db-smoke-check.sh"

CURRENT_STEP="service_start"
write_attempt_state "running"
log "Starting services"
start_runtime_services

log "Checking collector runner startup"
systemctl reset-failed geosub-collector-jobs.service 2>/dev/null || true
run_as_geosub "set -a && source '$ENV_FILE' && set +a && bash '$BACKEND_DIR/deploy/linux-arm64/run-collector-jobs.sh' -DryRun"

log "Refreshing exchange rates once"
systemctl start geosub-exchange-rate-sync.service 2>/dev/null || true

log "Refreshing analytics aggregates once"
systemctl start geosub-analytics-aggregation.service 2>/dev/null || true

CURRENT_STEP="post_deploy_health"
write_attempt_state "running"
log "Running post-deploy check"
bash "$BACKEND_DIR/deploy/linux-arm64/post-deploy-check.sh"

CURRENT_STEP="release_record"
write_attempt_state "running"
log "Recording deployed version"
record_release

CURRENT_STEP="complete"
write_attempt_state "succeeded" "all deployment gates passed"
trap - ERR

log "Upgrade complete"
systemctl --no-pager --full status geosub-web.service || true
