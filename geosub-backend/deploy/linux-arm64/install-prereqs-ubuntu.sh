#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/linux-arm64/install-prereqs-ubuntu.sh"
  exit 1
fi

apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  unzip \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils

apt-get install -y libasound2t64 || apt-get install -y libasound2

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

if ! command -v pwsh >/dev/null 2>&1; then
  curl -fsSL https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb -o /tmp/packages-microsoft-prod.deb
  dpkg -i /tmp/packages-microsoft-prod.deb
  apt-get update
  apt-get install -y powershell
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "Prerequisites installed."
echo "Chromium path: $(command -v chromium || command -v chromium-browser || true)"
echo "Node: $(node --version)"
echo "PowerShell: $(pwsh --version)"
echo "Docker: $(docker --version)"
