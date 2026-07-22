-- Unified operational heartbeat for scheduled Linux services.
-- Task-specific tables remain the source of business results; this table answers
-- whether the scheduler actually started and finished each service command.

CREATE TABLE IF NOT EXISTS system_task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT NOT NULL,
  trigger_kind TEXT NOT NULL DEFAULT 'systemd',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running',
    'succeeded',
    'failed'
  )),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  exit_code INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_task_runs_task_started_idx
ON system_task_runs(task_key, started_at DESC);

CREATE INDEX IF NOT EXISTS system_task_runs_status_started_idx
ON system_task_runs(status, started_at DESC);

CREATE INDEX IF NOT EXISTS system_task_runs_running_started_idx
ON system_task_runs(started_at ASC)
WHERE status = 'running';

