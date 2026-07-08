CREATE INDEX IF NOT EXISTS collector_jobs_admin_queue_idx
  ON collector_jobs (status, priority DESC, next_run_at, created_at DESC)
  WHERE status <> 'archived';

CREATE INDEX IF NOT EXISTS collector_job_runs_started_idx
  ON collector_job_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS collector_job_runs_product_started_idx
  ON collector_job_runs (product_id, started_at DESC);

CREATE INDEX IF NOT EXISTS collector_job_runs_running_started_idx
  ON collector_job_runs (started_at DESC)
  WHERE status = 'running';
