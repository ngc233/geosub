-- GeoSub schema migration. Split from sql/075_serialize_app_store_auto_review.sql; see migration-layout.json.

-- Serialize App Store auto-review executions without slowing down collection.
-- Multiple collector workers may finish together; the review phase updates a
-- shared pending queue and must not process the same observation concurrently.

DO $$
BEGIN
  IF to_regprocedure(
    'run_app_store_stability_auto_review_unlocked(boolean,integer,integer,integer)'
  ) IS NULL THEN
    ALTER FUNCTION run_app_store_stability_auto_review(BOOLEAN, INTEGER, INTEGER, INTEGER)
      RENAME TO run_app_store_stability_auto_review_unlocked;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION run_app_store_stability_auto_review(
  p_dry_run BOOLEAN DEFAULT TRUE,
  p_required_samples INTEGER DEFAULT 3,
  p_min_confidence INTEGER DEFAULT 80,
  p_max_sample_age_days INTEGER DEFAULT 14
)
RETURNS TABLE (
  run_id UUID,
  decision TEXT,
  reason_code TEXT,
  reason TEXT,
  product_slug TEXT,
  plan_slug TEXT,
  country_code TEXT,
  source_count INTEGER,
  platforms TEXT[],
  observation_count INTEGER
)
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('geosub_app_store_stability_auto_review', 0)
  );

  RETURN QUERY
  SELECT
    review.run_id,
    review.decision,
    review.reason_code,
    review.reason,
    review.product_slug,
    review.plan_slug,
    review.country_code,
    review.source_count,
    review.platforms,
    review.observation_count
  FROM run_app_store_stability_auto_review_unlocked(
    p_dry_run,
    p_required_samples,
    p_min_confidence,
    p_max_sample_age_days
  ) AS review;
END;
$$;
