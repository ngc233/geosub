#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/install-systemd-collector-jobs.sh"
  exit 1
fi

BACKEND_DIR="${GEOSUB_BACKEND_DIR:-/opt/geosub/geosub-backend}"

install -d -m 0755 /etc/geosub
if [[ ! -f /etc/geosub/geosub.env ]]; then
  install -m 0640 "$BACKEND_DIR/deploy/linux-arm64/env.example" /etc/geosub/geosub.env
  echo "Created /etc/geosub/geosub.env. Review it before starting the timer."
fi

if ! id geosub >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /opt/geosub --shell /usr/sbin/nologin geosub
fi

if getent group docker >/dev/null 2>&1; then
  usermod -aG docker geosub
fi

chown -R geosub:geosub /opt/geosub
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-system-task.sh"
chmod +x "$BACKEND_DIR/deploy/linux-arm64/run-collector-jobs.sh"

install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-jobs.service" /etc/systemd/system/geosub-collector-jobs.service
install -m 0644 "$BACKEND_DIR/deploy/linux-arm64/systemd/geosub-collector-jobs.timer" /etc/systemd/system/geosub-collector-jobs.timer

systemctl daemon-reload
systemctl enable geosub-collector-jobs.timer

echo "Installed geosub-collector-jobs.timer."
echo "Test it with:"
echo "  sudo systemctl start geosub-collector-jobs.service"
echo "Then start the timer:"
echo "  sudo systemctl start geosub-collector-jobs.timer"
