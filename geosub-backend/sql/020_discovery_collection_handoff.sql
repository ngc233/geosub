-- Discovery to collection handoff.
-- Collector jobs can now be traced back to discovery candidates and carry
-- structured collector configuration.

ALTER TABLE collector_jobs
ADD COLUMN IF NOT EXISTS discovery_candidate_id UUID
  REFERENCES product_discovery_candidates(id) ON UPDATE CASCADE ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discovery_source_id UUID
  REFERENCES discovery_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS job_config JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 50
  CHECK (priority >= 0 AND priority <= 100);

CREATE INDEX IF NOT EXISTS collector_jobs_discovery_candidate_idx
  ON collector_jobs (discovery_candidate_id, status, next_run_at);

CREATE INDEX IF NOT EXISTS collector_jobs_product_status_idx
  ON collector_jobs (product_id, status, next_run_at);

CREATE INDEX IF NOT EXISTS collector_jobs_config_gin_idx
  ON collector_jobs USING GIN (job_config);
