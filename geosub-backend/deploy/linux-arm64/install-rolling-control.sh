#!/usr/bin/env bash
# Install the reviewed control plane from an exact fetched release commit.
# This does not adopt the proxy, restart the application, or run migrations.
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 ]] || { echo 'Linux root required'; exit 1; }
ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
set -a
source "$ENV_FILE"
set +a
REPO="${GEOSUB_REPO_DIR:?GEOSUB_REPO_DIR required}"
ROOT="${GEOSUB_RELEASE_DIR:-/opt/geosub/releases}"
COMMIT="${1:-}"
[[ "$COMMIT" =~ ^[a-f0-9]{40}$ ]] || { echo 'Exact 40-character fetched commit required'; exit 1; }
[[ -f "$ROOT/current.env" ]] || { echo 'Successful release record required'; exit 1; }
[[ -z "$(sudo -u geosub git -C "$REPO" status --porcelain)" ]] || { echo 'Clean release repository required'; exit 1; }
sudo -u geosub git -C "$REPO" fetch origin "${GEOSUB_GIT_BRANCH:-main}"
[[ $(sudo -u geosub git -C "$REPO" rev-parse FETCH_HEAD) == "$COMMIT" ]] || { echo 'Commit differs from fetched release branch'; exit 1; }
node "$REPO/scripts/check-release-version.mjs" --root "$REPO" --ref "$COMMIT" --current "$ROOT/current.env"
if [[ -f "$ROOT/collector-current.env" ]] && ! grep -qx "GEOSUB_COMMIT=$COMMIT" "$ROOT/collector-current.env"; then
  node "$REPO/scripts/check-release-version.mjs" --root "$REPO" --ref "$COMMIT" --current "$ROOT/collector-current.env"
fi
install -d -m 0755 "$ROOT/controllers"
mkdir "$ROOT/rolling.lock" || { echo 'Another release/control operation is running'; exit 1; }
trap 'rmdir "$ROOT/rolling.lock"' EXIT
TARGET="$ROOT/controllers/$COMMIT"
[[ ! -e "$TARGET" ]] || { echo 'Control commit already installed; use its retained entry point'; exit 1; }
install -d -m 0755 "$TARGET"
sudo -u geosub git -C "$REPO" archive "$COMMIT" geosub-backend/deploy/linux-arm64 | tar -x -C "$TARGET" --strip-components=3
chown -R root:root "$TARGET"
chmod -R go-w "$TARGET"
for file in "$TARGET"/*.sh; do bash -n "$file"; done
node --test "$TARGET/rolling-release.test.mjs" "$TARGET/component-release.test.mjs"
ln -s "$TARGET" "$ROOT/control.pending"
mv -Tf "$ROOT/control.pending" "$ROOT/control"
printf 'Control installed from %s. Application and proxy unchanged.\n' "$COMMIT"
