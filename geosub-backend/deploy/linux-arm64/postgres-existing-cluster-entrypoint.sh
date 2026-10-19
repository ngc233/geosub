#!/bin/sh
# Production only: never let the upstream entrypoint initialize an absent cluster.
set -eu
fail() { printf '%s\n' "GeoSub PostgreSQL startup refused: $1" >&2; exit 78; }
data=${PGDATA:-/var/lib/postgresql/data}
identity=${GEOSUB_PG_SYSTEM_ID_FILE:-/run/geosub-postgres-system-id}
[ -s "$data/PG_VERSION" ] || fail 'PG_VERSION missing; preserve evidence and restore explicitly'
[ "$(cat "$data/PG_VERSION")" = 16 ] || fail 'unexpected PostgreSQL major version'
[ -s "$data/global/pg_control" ] || fail 'pg_control missing'
[ -d "$data/base" ] || fail 'base directory missing'
[ -f "$identity" ] && [ -r "$identity" ] || fail 'independent cluster identity missing'
expected=$(cat "$identity")
case "$expected" in ''|*[!0-9]*) fail 'invalid expected cluster identity' ;; esac
control=$(LC_ALL=C pg_controldata "$data") || fail 'pg_controldata failed'
actual=$(printf '%s\n' "$control" | sed -n 's/^Database system identifier:[[:space:]]*//p')
[ "$actual" = "$expected" ] || fail 'cluster identity mismatch'
if [ "${1:-}" = --check-only ]; then
  printf '%s\n' 'GeoSub PostgreSQL existing cluster verified'
  exit 0
fi
exec /usr/local/bin/docker-entrypoint.sh "$@"
