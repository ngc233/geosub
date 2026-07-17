#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/install-systemd-db-backup.sh"
  exit 1
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"
BACKUP_DIR="${GEOSUB_BACKUP_DIR:-/opt/geosub/backups}"

install -d -m 0700 "$BACKUP_DIR"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/db-backup.sh"

install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-db-backup.service" /etc/systemd/system/geosub-db-backup.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-db-backup.timer" /etc/systemd/system/geosub-db-backup.timer

systemctl daemon-reload
systemctl enable --now geosub-db-backup.timer

echo "Installed and started geosub-db-backup.timer."
echo "Create a verified backup now with:"
echo "  sudo systemctl start geosub-db-backup.service"
