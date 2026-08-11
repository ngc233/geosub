-- GeoSub schema migration. Split from sql/052_collector_job_runs_running_status.sql; see migration-layout.json.

ALTER TABLE collector_job_runs
  DROP CONSTRAINT IF EXISTS collector_job_runs_status_check;

ALTER TABLE collector_job_runs
  ADD CONSTRAINT collector_job_runs_status_check
  CHECK (status IN ('running', 'succeeded', 'failed', 'skipped'));
