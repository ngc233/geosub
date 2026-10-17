# Shared PostgreSQL transport. Docker remains the production default.
# Native transport is useful for an isolated VM with an external PostgreSQL service.
geosub_db_ready() {
  case "${GEOSUB_DB_TRANSPORT:-docker}" in
    docker) docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER" ;;
    native) pg_isready -q -U "$DB_USER" -d "$DB_NAME" ;;
    *) echo 'Unknown database transport' >&2; return 1 ;;
  esac
}
geosub_db_exec() {
  case "${GEOSUB_DB_TRANSPORT:-docker}" in
    docker) docker exec -i "$DB_CONTAINER" "$@" ;;
    native) "$@" ;;
    *) echo 'Unknown database transport' >&2; return 1 ;;
  esac
}
