#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"

install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-jobs.service" /etc/systemd/system/geosub-collector-jobs.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-jobs.timer" /etc/systemd/system/geosub-collector-jobs.timer

systemctl daemon-reload
systemctl enable --now geosub-collector-jobs.timer

echo "Installed and started geosub-collector-jobs.timer"
