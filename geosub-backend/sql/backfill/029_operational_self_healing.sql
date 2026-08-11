-- GeoSub backfill migration. Split from sql/065_operational_self_healing.sql; see migration-layout.json.

WITH ranked_running AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY started_at DESC, created_at DESC, id DESC) AS row_number
  FROM collector_job_runs
  WHERE status = 'running'
)
UPDATE collector_job_runs run
SET
  status = 'failed',
  finished_at = NOW(),
  duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - run.started_at)) * 1000)::int,
  error_message = COALESCE(run.error_message, 'Duplicate in-flight collector run was closed during migration.'),
  raw_payload = COALESCE(run.raw_payload, '{}'::jsonb) || jsonb_build_object(
    'state', 'duplicate_running_row_closed',
    'recovered_at', NOW()
  )
FROM ranked_running ranked
WHERE run.id = ranked.id
  AND ranked.row_number > 1;
