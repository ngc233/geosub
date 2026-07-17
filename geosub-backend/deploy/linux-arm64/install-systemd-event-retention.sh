#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/install-systemd-event-retention.sh"
  exit 1
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"

chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-event-retention.sh"
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-event-retention.service" /etc/systemd/system/geosub-event-retention.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-event-retention.timer" /etc/systemd/system/geosub-event-retention.timer

systemctl daemon-reload
systemctl enable --now geosub-event-retention.timer

echo "Installed and started geosub-event-retention.timer."
echo "Preview local retention with:"
echo "  cd /opt/geosub/ai-price-site && node scripts/prune-event-logs.cjs"
