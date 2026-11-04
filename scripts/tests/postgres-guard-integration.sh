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
readiness_failure() {
  printf 'PostgreSQL readiness failed: %s\n' "$*" >&2
  docker logs "$GEOSUB_GUARD_CONTAINER" >&2 || true
  return 1
}
wait_ready() {
  local phase=$1 deadline=$((SECONDS + 30)) state status health
  while ((SECONDS < deadline)); do
    if ! state=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$GEOSUB_GUARD_CONTAINER"); then
      readiness_failure "$phase: cannot inspect container"
      return 1
    fi
    read -r status health <<< "$state"
    case "$status" in
      exited|dead)
        readiness_failure "$phase: container is $status"
        return 1
        ;;
    esac
    if [[ "$status" = running && "$health" = healthy ]]; then
      printf 'PostgreSQL ready after %s (TCP healthcheck).\n' "$phase"
      return 0
    fi
    sleep 1
  done
  readiness_failure "$phase: timed out after 30 seconds (last state: ${state:-unknown})"
  return 1
}
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
      # The initialization-only server listens on a socket, never on TCP.
      test: [CMD-SHELL, "pg_isready -h 127.0.0.1 -U postgres"]
      interval: 1s
      timeout: 1s
      retries: 30
YAML
docker compose -f "$T/docker-compose.yml" up -d
wait_ready 'initial start'
docker exec "$GEOSUB_GUARD_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -c 'CREATE TABLE guard_sentinel (id integer PRIMARY KEY); INSERT INTO guard_sentinel VALUES(42);'
ID=$(docker exec "$GEOSUB_GUARD_CONTAINER" sh -c 'LC_ALL=C pg_controldata "$PGDATA"' | sed -n 's/^Database system identifier:[[:space:]]*//p')
bash "$ROOT/geosub-backend/deploy/linux-arm64/install-postgres-guard.sh" apply "$T/state" "$ID" INSTALL_EXISTING_CLUSTER_GUARD
docker restart "$GEOSUB_GUARD_CONTAINER" >/dev/null
wait_ready 'restart'
[[ "$(docker exec "$GEOSUB_GUARD_CONTAINER" psql -U postgres -Atc 'SELECT * FROM guard_sentinel')" = 42 ]]
bash "$ROOT/geosub-backend/deploy/linux-arm64/install-postgres-guard.sh" rollback "$T/state" "$ID" ROLLBACK_EXISTING_CLUSTER_GUARD
[[ "$(docker exec "$GEOSUB_GUARD_CONTAINER" psql -U postgres -Atc 'SELECT * FROM guard_sentinel')" = 42 ]]
docker compose -f "$T/docker-compose.yml" stop postgres
a=$(stat -c %i "$T/data")
mv "$T/data" "$T/preserved-data"
if docker compose -f "$T/docker-compose.yml" -f "$T/state/override.json" run --rm --no-deps postgres --check-only > "$T/missing-path.log" 2>&1; then
  echo 'Missing data path incorrectly accepted' >&2; exit 1
fi
[[ ! -e "$T/data" ]]
mv "$T/preserved-data" "$T/data"
[[ "$(stat -c %i "$T/data")" = "$a" ]]
echo 'Guard install, restart, rollback, and missing-bind refusal passed'
