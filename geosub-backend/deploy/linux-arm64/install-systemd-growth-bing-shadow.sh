#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/install-systemd-growth-bing-shadow.sh"
  exit 1
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"

install -d -m 0750 -o geosub -g geosub /var/lib/geosub/growth
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-growth-bing-shadow.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-system-task.sh"

install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-growth-bing-shadow.service" /etc/systemd/system/geosub-growth-bing-shadow.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-growth-bing-shadow.timer" /etc/systemd/system/geosub-growth-bing-shadow.timer

systemctl daemon-reload
systemctl enable geosub-growth-bing-shadow.timer
echo "Installed geosub-growth-bing-shadow.timer."
echo "Start the first run with: sudo systemctl start geosub-growth-bing-shadow.service"
