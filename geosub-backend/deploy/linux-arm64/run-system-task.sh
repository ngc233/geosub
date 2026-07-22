#!/usr/bin/env bash
set -uo pipefail

ENV_FILE="${GEOSUB_ENV_FILE:-/etc/geosub/geosub.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_CONTAINER="${GEOSUB_DB_CONTAINER:-geosub-postgres}"
DB_NAME="${GEOSUB_DB_NAME:-geosub_app}"
DB_USER="${GEOSUB_DB_USER:-geosub_admin}"
TRIGGER_KIND="${GEOSUB_TASK_TRIGGER:-systemd}"

usage() {
  echo "Usage: $0 <task-key> -- <command> [args...]" >&2
  exit 2
}

[[ $# -ge 3 ]] || usage
TASK_KEY="$1"
shift
[[ "$1" == "--" ]] || usage
shift
[[ $# -gt 0 ]] || usage

if [[ ! "$TASK_KEY" =~ ^[a-z0-9_]+$ ]]; then
  echo "Invalid task key: $TASK_KEY" >&2
  exit 2
fi

if [[ ! "$TRIGGER_KIND" =~ ^[a-z0-9_-]+$ ]]; then
  TRIGGER_KIND="systemd"
fi

psql_value() {
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -qtAX -c "$1"
}

RUN_ID=""
if command -v docker >/dev/null 2>&1; then
  RUN_ID="$(psql_value "
    WITH stale AS (
      UPDATE system_task_runs
      SET
        status = 'failed',
        finished_at = NOW(),
        exit_code = 124,
        error_message = COALESCE(error_message, 'Previous run did not finish before the next scheduler attempt.')
      WHERE task_key = '$TASK_KEY'
        AND status = 'running'
        AND started_at < NOW() - INTERVAL '6 hours'
    ), inserted AS (
      INSERT INTO system_task_runs (task_key, trigger_kind, status)
      VALUES ('$TASK_KEY', '$TRIGGER_KIND', 'running')
      RETURNING id
    )
    SELECT id FROM inserted;
  " 2>/dev/null || true)"
fi

if [[ -z "$RUN_ID" ]]; then
  echo "Warning: could not record the start of system task '$TASK_KEY'." >&2
fi

set +e
"$@"
EXIT_CODE=$?
set -e

if [[ -n "$RUN_ID" ]]; then
  if [[ "$EXIT_CODE" -eq 0 ]]; then
    FINISH_SQL="
      UPDATE system_task_runs
      SET status = 'succeeded', finished_at = NOW(), exit_code = 0
      WHERE id = '$RUN_ID'::uuid;
    "
  else
    FINISH_SQL="
      UPDATE system_task_runs
      SET
        status = 'failed',
        finished_at = NOW(),
        exit_code = $EXIT_CODE,
        error_message = 'Process exited with code $EXIT_CODE.'
      WHERE id = '$RUN_ID'::uuid;
    "
  fi

  if ! psql_value "$FINISH_SQL" >/dev/null 2>&1; then
    echo "Warning: could not record the result of system task '$TASK_KEY'." >&2
  fi
fi

exit "$EXIT_CODE"

