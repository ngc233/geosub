#!/usr/bin/env bash
set -euo pipefail

db_container_override="${GEOSUB_DB_CONTAINER:-}"
production_db_override="${GEOSUB_DB_NAME:-}"
db_user_override="${GEOSUB_DB_USER:-}"
frontend_dir_override="${GEOSUB_FRONTEND_DIR:-}"
evidence_dir_override="${GEOSUB_EMPTY_EVIDENCE_DIR:-}"

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_CONTAINER="${db_container_override:-${GEOSUB_DB_CONTAINER:-geosub-postgres}}"
PRODUCTION_DB_NAME="${production_db_override:-${GEOSUB_DB_NAME:-geosub_app}}"
DB_USER="${db_user_override:-${GEOSUB_DB_USER:-geosub_admin}}"
FRONTEND_DIR="${frontend_dir_override:-${GEOSUB_FRONTEND_DIR:-/opt/geosub/ai-price-site}}"
EVIDENCE_DIR="${evidence_dir_override:-${GEOSUB_EMPTY_EVIDENCE_DIR:-/tmp/geosub-empty-schema-evidence}}"

EMPTY_DB="${1:-}"
CONFIRMATION="${2:-}"

if [[ -z "$EMPTY_DB" ]]; then
  echo "Usage: $0 geosub_b1_empty_<timestamp> VERIFY_B1_EMPTY"
  exit 1
fi
if [[ "$EMPTY_DB" != geosub_b1_empty_* ]]; then
  echo "Refusing database without the geosub_b1_empty_ prefix: $EMPTY_DB"
  exit 1
fi
if [[ "$EMPTY_DB" == "$PRODUCTION_DB_NAME" ]]; then
  echo "Refusing to run against the production database."
  exit 1
fi
if [[ "$CONFIRMATION" != "VERIFY_B1_EMPTY" ]]; then
  echo "Pass VERIFY_B1_EMPTY as the second argument."
  exit 1
fi
if [[ ! -d "$FRONTEND_DIR" || ! -f "$FRONTEND_DIR/package.json" ]]; then
  echo "Frontend migration workspace is missing: $FRONTEND_DIR"
  exit 1
fi
if ! docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -Atc \
  "SELECT datname FROM pg_database" | grep -Fxq "$EMPTY_DB"; then
  echo "Empty verification database does not exist: $EMPTY_DB"
  exit 1
fi

table_count="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$EMPTY_DB" -Atc \
  "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')")"
if [[ "$table_count" != "0" ]]; then
  echo "Verification database is not empty: $EMPTY_DB has $table_count public tables."
  exit 1
fi

mkdir -p "$EVIDENCE_DIR"
chmod 700 "$EVIDENCE_DIR"

database_url_for() {
  node - "$1" <<'NODE'
const databaseName = process.argv[2];
const url = new URL(process.env.DATABASE_URL);
url.pathname = `/${databaseName}`;
process.stdout.write(url.toString());
NODE
}

normalize_dump() {
  sed -E \
    -e '/^-- Dumped from database version /d' \
    -e '/^-- Dumped by pg_dump version /d' \
    -e '/^-- Started on /d' \
    -e '/^-- Completed on /d' \
    -e '/^\\(un)?restrict /d'
}

export DATABASE_URL="$(database_url_for "$EMPTY_DB")"
export GEOSUB_SCHEMA_MODE="complete-schema"

echo "Building a fresh database through the complete migration toolchain: $EMPTY_DB"
(
  cd "$FRONTEND_DIR"
  npm run db:migrate
) 2>&1 | tee "$EVIDENCE_DIR/first-pass.log"

echo "Running the migration toolchain a second time to prove idempotency"
(
  cd "$FRONTEND_DIR"
  npm run db:migrate
) 2>&1 | tee "$EVIDENCE_DIR/second-pass.log"

if ! grep -Eq \
  'SQL migration pass complete: [0-9]+ checked, 0 applied, [0-9]+ compatible\.' \
  "$EVIDENCE_DIR/second-pass.log"; then
  echo "The second SQL migration pass was not a zero-apply run."
  exit 1
fi
if ! grep -Fq 'No pending migrations to apply.' "$EVIDENCE_DIR/second-pass.log"; then
  echo "Prisma was not idempotent on the second migration pass."
  exit 1
fi

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$EMPTY_DB" \
  --schema-only --no-owner --no-privileges |
  normalize_dump > "$EVIDENCE_DIR/empty-final.sql"

schema_hash="$(sha256sum "$EVIDENCE_DIR/empty-final.sql" | awk '{print $1}')"
cat > "$EVIDENCE_DIR/result.txt" <<EOF
empty_database=$EMPTY_DB
schema_sha256=$schema_hash
second_sql_applied=0
second_prisma_pending=0
result=passed
EOF

echo "B1 empty database verification passed; the second migration pass made no changes."
