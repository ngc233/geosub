#!/usr/bin/env bash
set -euo pipefail

db_container_override="${GEOSUB_DB_CONTAINER:-}"
production_db_override="${GEOSUB_DB_NAME:-}"
db_user_override="${GEOSUB_DB_USER:-}"
frontend_dir_override="${GEOSUB_FRONTEND_DIR:-}"
evidence_dir_override="${GEOSUB_SHADOW_EVIDENCE_DIR:-}"

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
EVIDENCE_DIR="${evidence_dir_override:-${GEOSUB_SHADOW_EVIDENCE_DIR:-/tmp/geosub-shadow-evidence}}"

SHADOW_DB="${1:-}"
CONFIRMATION="${2:-}"

if [[ -z "$SHADOW_DB" ]]; then
  echo "Usage: $0 geosub_b1_shadow_<timestamp> VERIFY_B1_SHADOW"
  exit 1
fi
if [[ "$SHADOW_DB" != geosub_b1_shadow_* ]]; then
  echo "Refusing database without the geosub_b1_shadow_ prefix: $SHADOW_DB"
  exit 1
fi
if [[ "$SHADOW_DB" == "$PRODUCTION_DB_NAME" ]]; then
  echo "Refusing to run against the production database."
  exit 1
fi
if [[ "$CONFIRMATION" != "VERIFY_B1_SHADOW" ]]; then
  echo "Pass VERIFY_B1_SHADOW as the second argument."
  exit 1
fi
if [[ ! -d "$FRONTEND_DIR" || ! -f "$FRONTEND_DIR/package.json" ]]; then
  echo "Frontend migration workspace is missing: $FRONTEND_DIR"
  exit 1
fi
if ! docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -Atc \
  "SELECT datname FROM pg_database" | grep -Fxq "$SHADOW_DB"; then
  echo "Shadow database does not exist: $SHADOW_DB"
  exit 1
fi

mkdir -p "$EVIDENCE_DIR"
chmod 700 "$EVIDENCE_DIR"

normalize_dump() {
  sed -E \
    -e '/^-- Dumped from database version /d' \
    -e '/^-- Dumped by pg_dump version /d' \
    -e '/^-- Started on /d' \
    -e '/^-- Completed on /d' \
    -e '/^\\(un)?restrict /d'
}

geosub_schema_hash() {
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SHADOW_DB" \
    --schema-only --no-owner --no-privileges \
    --exclude-table='public.directus_*' |
    normalize_dump |
    tee "$1" |
    sha256sum |
    awk '{print $1}'
}

directus_schema_hash() {
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SHADOW_DB" \
    --schema-only --no-owner --no-privileges \
    --table='public.directus_*' |
    normalize_dump |
    tee "$1" |
    sha256sum |
    awk '{print $1}'
}

data_hash() {
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SHADOW_DB" \
    --data-only --no-owner --no-privileges |
    normalize_dump |
    sha256sum |
    awk '{print $1}'
}

database_url_for() {
  node - "$1" <<'NODE'
const databaseName = process.argv[2];
const url = new URL(process.env.DATABASE_URL);
url.pathname = `/${databaseName}`;
process.stdout.write(url.toString());
NODE
}

before_schema="$EVIDENCE_DIR/geosub-before.sql"
after_schema="$EVIDENCE_DIR/geosub-after.sql"
before_directus_schema="$EVIDENCE_DIR/directus-before.sql"
after_directus_schema="$EVIDENCE_DIR/directus-after.sql"
log_file="$EVIDENCE_DIR/migration.log"

echo "Hashing the shadow database before migration"
before_schema_hash="$(geosub_schema_hash "$before_schema")"
before_directus_schema_hash="$(directus_schema_hash "$before_directus_schema")"
before_data_hash="$(data_hash)"

export DATABASE_URL="$(database_url_for "$SHADOW_DB")"
echo "Running the migration toolchain against: $SHADOW_DB"
(
  cd "$FRONTEND_DIR"
  npm run db:migrate
) 2>&1 | tee "$log_file"

if ! grep -Eq \
  'SQL migration pass complete: [0-9]+ checked, 0 applied, [0-9]+ compatible\.' \
  "$log_file"; then
  echo "The SQL migration pass was not a zero-apply run."
  exit 1
fi
if ! grep -Fq 'No pending migrations to apply.' "$log_file"; then
  echo "Prisma reported pending or newly applied migrations."
  exit 1
fi

echo "Hashing the shadow database after migration"
after_schema_hash="$(geosub_schema_hash "$after_schema")"
after_directus_schema_hash="$(directus_schema_hash "$after_directus_schema")"
after_data_hash="$(data_hash)"

if [[ "$before_schema_hash" != "$after_schema_hash" ]]; then
  diff -u "$before_schema" "$after_schema" > "$EVIDENCE_DIR/geosub-schema.diff" || true
  echo "GeoSub-owned shadow schema changed during migration."
  exit 1
fi
if [[ "$before_directus_schema_hash" != "$after_directus_schema_hash" ]]; then
  diff -u "$before_directus_schema" "$after_directus_schema" > "$EVIDENCE_DIR/directus-schema.diff" || true
  echo "Externally owned Directus schema changed during migration."
  exit 1
fi
if [[ "$before_data_hash" != "$after_data_hash" ]]; then
  echo "Shadow data changed during migration."
  exit 1
fi

cat > "$EVIDENCE_DIR/result.txt" <<EOF
shadow_database=$SHADOW_DB
schema_sha256=$after_schema_hash
directus_schema_sha256=$after_directus_schema_hash
data_sha256=$after_data_hash
sql_applied=0
prisma_pending=0
ownership_policy=geosub_strict_directus_external
result=passed
EOF

echo "B1 shadow verification passed with unchanged GeoSub, Directus and data hashes."
