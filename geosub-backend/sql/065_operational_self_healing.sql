-- Collector self-healing and bounded retry state.
-- Page loads may still request reconciliation for fast feedback, but the
-- collector runner now calls this database cycle before every scheduled pass.

CREATE TABLE IF NOT EXISTS operational_recovery_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_kind TEXT NOT NULL DEFAULT 'collector_runner',
  stale_runs_failed INTEGER NOT NULL DEFAULT 0,
  stale_jobs_requeued INTEGER NOT NULL DEFAULT 0,
  transient_jobs_requeued INTEGER NOT NULL DEFAULT 0,
  permanent_jobs_quarantined INTEGER NOT NULL DEFAULT 0,
  exhausted_jobs_quarantined INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operational_recovery_cycles_created_idx
  ON operational_recovery_cycles(created_at DESC);

-- Keep the newest in-flight row when old deployments produced duplicates.
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

CREATE UNIQUE INDEX IF NOT EXISTS collector_job_runs_one_running_per_job_idx
  ON collector_job_runs(job_id)
  WHERE status = 'running';

CREATE OR REPLACE FUNCTION reconcile_stale_collector_runs(
  p_admin_start_timeout_minutes INTEGER DEFAULT 3,
  p_worker_timeout_minutes INTEGER DEFAULT 20,
  p_max_recovery_attempts INTEGER DEFAULT 3
)
RETURNS TABLE (
  stale_runs_failed INTEGER,
  jobs_requeued INTEGER,
  jobs_quarantined INTEGER
)
LANGUAGE sql
AS $$
  WITH stale_runs AS (
    UPDATE collector_job_runs run
    SET
      status = 'failed',
      finished_at = NOW(),
      duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - run.started_at)) * 1000)::int,
      error_message = COALESCE(
        run.error_message,
        CASE
          WHEN run.raw_payload ->> 'state' = 'queued_from_admin'
            THEN format('Collector process did not start reporting within %s minutes.', p_admin_start_timeout_minutes)
          ELSE format('Collector process did not finish within %s minutes.', p_worker_timeout_minutes)
        END
      ),
      raw_payload = COALESCE(run.raw_payload, '{}'::jsonb) || jsonb_build_object(
        'state', 'stale_running_marked_failed',
        'recovered_at', NOW(),
        'timeout_minutes', CASE
          WHEN run.raw_payload ->> 'state' = 'queued_from_admin'
            THEN p_admin_start_timeout_minutes
          ELSE p_worker_timeout_minutes
        END
      )
    WHERE run.status = 'running'
      AND (
        (
          run.raw_payload ->> 'state' = 'queued_from_admin'
          AND run.started_at < NOW() - make_interval(mins => p_admin_start_timeout_minutes)
        )
        OR (
          COALESCE(run.raw_payload ->> 'state', '') <> 'queued_from_admin'
          AND run.started_at < NOW() - make_interval(mins => p_worker_timeout_minutes)
        )
      )
    RETURNING run.job_id
  ), stale_job_failures AS (
    SELECT job_id, COUNT(*)::int AS failure_count
    FROM stale_runs
    GROUP BY job_id
  ), job_updates AS (
    SELECT
      job.id AS job_id,
      failures.failure_count,
      COALESCE((job.job_config ->> 'recovery_failure_count')::integer, 0) + failures.failure_count AS recovery_count,
      CASE
        WHEN COALESCE(job.job_config ->> 'collector_kind', 'unknown') NOT IN (
          'app_store', 'google_play', 'pricing_page', 'official_site'
        ) THEN TRUE
        WHEN job.job_config ->> 'collector_kind' = 'app_store'
          AND NULLIF(BTRIM(job.job_config ->> 'app_store_id'), '') IS NULL THEN TRUE
        WHEN job.job_config ->> 'collector_kind' = 'google_play'
          AND NULLIF(BTRIM(job.job_config ->> 'google_play_package'), '') IS NULL THEN TRUE
        ELSE FALSE
      END AS invalid_config
    FROM stale_job_failures failures
    JOIN collector_jobs job ON job.id = failures.job_id
    WHERE job.status <> 'archived'
  ), updated_jobs AS (
    UPDATE collector_jobs job
    SET
      status = CASE
        WHEN update_row.invalid_config OR update_row.recovery_count > p_max_recovery_attempts THEN 'failed'
        ELSE 'active'
      END,
      next_run_at = CASE
        WHEN update_row.invalid_config OR update_row.recovery_count > p_max_recovery_attempts THEN NULL
        ELSE NOW() + CASE LEAST(update_row.recovery_count, p_max_recovery_attempts)
          WHEN 1 THEN INTERVAL '15 minutes'
          WHEN 2 THEN INTERVAL '1 hour'
          ELSE INTERVAL '4 hours'
        END
      END,
      error_count = job.error_count + update_row.failure_count,
      last_error = 'Collector execution timed out and was recovered automatically.',
      job_config = COALESCE(job.job_config, '{}'::jsonb) || jsonb_build_object(
        'operational_state', CASE
          WHEN update_row.invalid_config THEN 'permanent_failure'
          WHEN update_row.recovery_count > p_max_recovery_attempts THEN 'retry_exhausted'
          ELSE 'recovery_retry_scheduled'
        END,
        'operational_note', CASE
          WHEN update_row.invalid_config THEN 'Collector configuration is incomplete or unsupported.'
          WHEN update_row.recovery_count > p_max_recovery_attempts THEN 'Automatic recovery attempts were exhausted.'
          ELSE 'A stale collector run was closed and scheduled for retry.'
        END,
        'recovery_failure_count', update_row.recovery_count,
        'last_recovered_at', NOW()
      ),
      updated_at = NOW()
    FROM job_updates update_row
    WHERE job.id = update_row.job_id
    RETURNING job.status
  )
  SELECT
    (SELECT COUNT(*)::int FROM stale_runs),
    COUNT(*) FILTER (WHERE status = 'active')::int,
    COUNT(*) FILTER (WHERE status = 'failed')::int
  FROM updated_jobs;
$$;

CREATE OR REPLACE FUNCTION recover_failed_collector_jobs(
  p_max_retry_attempts INTEGER DEFAULT 3
)
RETURNS TABLE (
  jobs_requeued INTEGER,
  permanent_jobs_quarantined INTEGER,
  exhausted_jobs_quarantined INTEGER
)
LANGUAGE sql
AS $$
  WITH candidates AS (
    SELECT
      job.id,
      job.error_count,
      job.next_run_at,
      COALESCE(job.job_config ->> 'operational_state', '') AS operational_state,
      CASE
        WHEN COALESCE(job.job_config ->> 'collector_kind', 'unknown') NOT IN (
          'app_store', 'google_play', 'pricing_page', 'official_site'
        ) THEN TRUE
        WHEN job.job_config ->> 'collector_kind' = 'app_store'
          AND NULLIF(BTRIM(job.job_config ->> 'app_store_id'), '') IS NULL THEN TRUE
        WHEN job.job_config ->> 'collector_kind' = 'google_play'
          AND NULLIF(BTRIM(job.job_config ->> 'google_play_package'), '') IS NULL THEN TRUE
        ELSE FALSE
      END AS invalid_config
    FROM collector_jobs job
    WHERE job.status = 'failed'
      AND job.status <> 'archived'
  ), updated_jobs AS (
    UPDATE collector_jobs job
    SET
      status = CASE
        WHEN candidate.invalid_config OR candidate.error_count > p_max_retry_attempts THEN 'failed'
        ELSE 'active'
      END,
      next_run_at = CASE
        WHEN candidate.invalid_config OR candidate.error_count > p_max_retry_attempts THEN NULL
        ELSE NOW()
      END,
      job_config = COALESCE(job.job_config, '{}'::jsonb) || jsonb_build_object(
        'operational_state', CASE
          WHEN candidate.invalid_config THEN 'permanent_failure'
          WHEN candidate.error_count > p_max_retry_attempts THEN 'retry_exhausted'
          ELSE 'auto_retry_queued'
        END,
        'operational_note', CASE
          WHEN candidate.invalid_config THEN 'Collector configuration is incomplete or unsupported.'
          WHEN candidate.error_count > p_max_retry_attempts THEN 'Automatic retry attempts were exhausted.'
          ELSE 'A legacy failed task was returned to the collector queue.'
        END,
        'last_recovered_at', NOW()
      ),
      updated_at = NOW()
    FROM candidates candidate
    WHERE job.id = candidate.id
      AND (
        (candidate.invalid_config AND candidate.operational_state <> 'permanent_failure')
        OR (
          candidate.error_count > p_max_retry_attempts
          AND candidate.operational_state <> 'retry_exhausted'
        )
        OR (
          NOT candidate.invalid_config
          AND candidate.error_count <= p_max_retry_attempts
          AND COALESCE(candidate.next_run_at, NOW()) <= NOW()
        )
      )
    RETURNING
      job.status,
      job.job_config ->> 'operational_state' AS operational_state
  )
  SELECT
    COUNT(*) FILTER (WHERE status = 'active')::int,
    COUNT(*) FILTER (WHERE operational_state = 'permanent_failure')::int,
    COUNT(*) FILTER (WHERE operational_state = 'retry_exhausted')::int
  FROM updated_jobs;
$$;

CREATE OR REPLACE FUNCTION run_operational_recovery_cycle(
  p_trigger_kind TEXT DEFAULT 'collector_runner'
)
RETURNS TABLE (
  cycle_id UUID,
  stale_runs_failed INTEGER,
  stale_jobs_requeued INTEGER,
  transient_jobs_requeued INTEGER,
  permanent_jobs_quarantined INTEGER,
  exhausted_jobs_quarantined INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_stale_runs_failed INTEGER := 0;
  v_stale_jobs_requeued INTEGER := 0;
  v_stale_jobs_quarantined INTEGER := 0;
  v_transient_jobs_requeued INTEGER := 0;
  v_permanent_jobs_quarantined INTEGER := 0;
  v_exhausted_jobs_quarantined INTEGER := 0;
  v_cycle_id UUID;
BEGIN
  SELECT result.stale_runs_failed, result.jobs_requeued, result.jobs_quarantined
  INTO v_stale_runs_failed, v_stale_jobs_requeued, v_stale_jobs_quarantined
  FROM reconcile_stale_collector_runs(3, 20, 3) result;

  SELECT result.jobs_requeued, result.permanent_jobs_quarantined, result.exhausted_jobs_quarantined
  INTO v_transient_jobs_requeued, v_permanent_jobs_quarantined, v_exhausted_jobs_quarantined
  FROM recover_failed_collector_jobs(3) result;

  v_permanent_jobs_quarantined := v_permanent_jobs_quarantined + v_stale_jobs_quarantined;

  INSERT INTO operational_recovery_cycles (
    trigger_kind,
    stale_runs_failed,
    stale_jobs_requeued,
    transient_jobs_requeued,
    permanent_jobs_quarantined,
    exhausted_jobs_quarantined,
    details
  )
  SELECT
    COALESCE(NULLIF(BTRIM(p_trigger_kind), ''), 'collector_runner'),
    v_stale_runs_failed,
    v_stale_jobs_requeued,
    v_transient_jobs_requeued,
    v_permanent_jobs_quarantined,
    v_exhausted_jobs_quarantined,
    jsonb_build_object('max_retry_attempts', 3, 'worker_timeout_minutes', 20)
  WHERE
    v_stale_runs_failed
      + v_stale_jobs_requeued
      + v_transient_jobs_requeued
      + v_permanent_jobs_quarantined
      + v_exhausted_jobs_quarantined > 0
    OR NOT EXISTS (
      SELECT 1
      FROM operational_recovery_cycles cycle
      WHERE cycle.created_at >= NOW() - INTERVAL '12 hours'
    )
  RETURNING id INTO v_cycle_id;

  RETURN QUERY SELECT
    v_cycle_id,
    v_stale_runs_failed,
    v_stale_jobs_requeued,
    v_transient_jobs_requeued,
    v_permanent_jobs_quarantined,
    v_exhausted_jobs_quarantined;
END;
$$;
