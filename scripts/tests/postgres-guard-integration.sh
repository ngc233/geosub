#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
T=$(mktemp -d)
export GEOSUB_GUARD_CONTAINER="geosub-guard-test-$$"
cleanup() {
  docker compose -f "$T/docker-compose.yml" down >/dev/null 2>&1 || true
  # Bind data may be owned by postgres. Remove only through its pinned test image.
  docker run --rm --network none --mount "type=bind,src=$T,dst=/test" --entrypoint sh postgres:16-alpine -c 'rm -rf /test/data' >/dev/null 2>&1 || true
  rm -rf "$T"
}
trap cleanup EXIT
cat > "$T/docker-compose.yml" <<YAML
name: $GEOSUB_GUARD_CONTAINER
services:
  postgres:
    image: postgres:16-alpine
    container_name: $GEOSUB_GUARD_CONTAINER
    network_mode: none
    environment:
      POSTGRES_HOST_AUTH_METHOD: trust
    volumes:
      - ./data:/var/lib/postgresql/data
    healthcheck:
      test: [CMD-SHELL, "pg_isready -U postgres"]
      interval: 1s
      timeout: 1s
      retries: 30
YAML
docker compose -f "$T/docker-compose.yml" up -d
for ((i=0;i<30;i++)); do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$GEOSUB_GUARD_CONTAINER")" = healthy ]] && break
  sleep 1
done
docker exec "$GEOSUB_GUARD_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -c 'CREATE TABLE guard_sentinel (id integer PRIMARY KEY); INSERT INTO guard_sentinel VALUES(42);'
ID=$(docker exec "$GEOSUB_GUARD_CONTAINER" sh -c 'LC_ALL=C pg_controldata "$PGDATA"' | sed -n 's/^Database system identifier:[[:space:]]*//p')
bash "$ROOT/geosub-backend/deploy/linux-arm64/install-postgres-guard.sh" apply "$T/state" "$ID" INSTALL_EXISTING_CLUSTER_GUARD
docker restart "$GEOSUB_GUARD_CONTAINER" >/dev/null
sleep 3
[[ "$(docker exec "$GEOSUB_GUARD_CONTAINER" psql -U postgres -Atc 'SELECT * FROM guard_sentinel')" = 42 ]]
bash "$ROOT/geosub-backend/deploy/linux-arm64/install-postgres-guard.sh" rollback "$T/state" "$ID" ROLLBACK_EXISTING_CLUSTER_GUARD
[[ "$(docker exec "$GEOSUB_GUARD_CONTAINER" psql -U postgres -Atc 'SELECT * FROM guard_sentinel')" = 42 ]]
echo 'Guard install, restart, and rollback preserved sentinel'
