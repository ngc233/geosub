#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/install-web-service.sh"
  exit 1
fi

FRONTEND_DIR="${GEOSUB_FRONTEND_DIR:-/opt/geosub/ai-price-site}"
BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"

if ! id geosub >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /opt/geosub --shell /usr/sbin/nologin geosub
fi

chown -R geosub:geosub /opt/geosub

sudo -u geosub bash -lc "cd '$FRONTEND_DIR' && npm ci && npm run build"

install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-web.service" /etc/systemd/system/geosub-web.service

systemctl daemon-reload
systemctl enable geosub-web.service

echo "Installed geosub-web.service."
echo "Start it with:"
echo "  sudo systemctl start geosub-web.service"
