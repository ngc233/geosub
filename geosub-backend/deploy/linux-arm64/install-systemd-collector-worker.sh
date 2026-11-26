#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/install-systemd-collector-worker.sh"
  exit 1
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"

install -d -m 0755 /etc/geosub
if [[ ! -f /etc/geosub/geosub.env ]]; then
  install -m 0640 "$BACKEND_DIR/deploy/linux-arm64/env.example" /etc/geosub/geosub.env
  echo "Created /etc/geosub/geosub.env. Review it before starting the worker."
fi

chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-collector-jobs.sh"
install -m 0644 \
  "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-worker.service" \
  /etc/systemd/system/geosub-collector-worker.service

systemctl daemon-reload
systemctl enable geosub-collector-worker.service

echo "Installed geosub-collector-worker.service."
echo "Start it with:"
echo "  sudo systemctl start geosub-collector-worker.service"
echo "After verifying the worker is healthy, set GEOSUB_COLLECTOR_DISPATCH_MODE=queue in /etc/geosub/geosub.env."
