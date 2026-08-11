-- GeoSub backfill migration. Split from sql/064_data_quality_repair_cycles.sql; see migration-layout.json.

WITH ranked AS (
  SELECT
    job.id,
    ROW_NUMBER() OVER (
      PARTITION BY job.product_id
      ORDER BY job.priority DESC, job.created_at DESC, job.id DESC
    ) AS row_number
  FROM collector_jobs job
  WHERE job.product_id IS NOT NULL
    AND job.schedule = 'anomaly_watch'
    AND job.status <> 'archived'
)
UPDATE collector_jobs job
SET
  status = 'archived',
  last_error = 'Archived duplicate anomaly-watch job during repair lifecycle upgrade.',
  updated_at = NOW()
FROM ranked
WHERE job.id = ranked.id
  AND ranked.row_number > 1;

SELECT *
FROM run_data_quality_repair_cycle('migration');
