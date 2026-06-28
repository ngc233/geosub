-- Collector job execution history.
-- One row is written for each attempted collector job run.

CREATE TABLE IF NOT EXISTS collector_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES collector_jobs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
  source_id UUID REFERENCES price_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'skipped')),
  collector_kind TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  output_excerpt TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS collector_job_runs_job_started_idx
  ON collector_job_runs (job_id, started_at DESC);

CREATE INDEX IF NOT EXISTS collector_job_runs_status_started_idx
  ON collector_job_runs (status, started_at DESC);
