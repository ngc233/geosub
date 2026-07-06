-- Speed up the admin review cockpit. These indexes target the high-volume paths
-- used by pending observation review, collector freshness, and review history.

CREATE INDEX IF NOT EXISTS "price_observations_pending_ios_observed_idx"
ON "price_observations" ("observed_at" DESC, "product_id", "plan_id", "country_id")
WHERE "status" = 'pending' AND "billing_platform" = 'ios';

CREATE INDEX IF NOT EXISTS "price_observations_product_status_platform_idx"
ON "price_observations" ("product_id", "status", "billing_platform", "observed_at" DESC);

CREATE INDEX IF NOT EXISTS "price_observations_product_plan_country_platform_idx"
ON "price_observations" (
  "product_id",
  "plan_id",
  "country_id",
  "billing_platform",
  "price_type",
  "observed_at" DESC
);

CREATE INDEX IF NOT EXISTS "region_prices_product_plan_country_platform_status_idx"
ON "region_prices" (
  "product_id",
  "plan_id",
  "country_id",
  "billing_platform",
  "price_type",
  "status"
);

CREATE INDEX IF NOT EXISTS "region_prices_product_status_platform_idx"
ON "region_prices" ("product_id", "status", "billing_platform");

CREATE INDEX IF NOT EXISTS "collector_jobs_product_status_type_idx"
ON "collector_jobs" ("product_id", "status", "job_type");

CREATE INDEX IF NOT EXISTS "collector_jobs_source_status_type_updated_idx"
ON "collector_jobs" ("source_id", "status", "job_type", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "price_sources_type_status_idx"
ON "price_sources" ("type", "status");

DO $$
BEGIN
  IF to_regclass('public.collector_job_runs') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "collector_job_runs_job_started_idx" ON "collector_job_runs" ("job_id", "started_at" DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "collector_job_runs_status_started_idx" ON "collector_job_runs" ("status", "started_at" DESC)';
  END IF;

  IF to_regclass('public.price_auto_review_runs') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "price_auto_review_runs_started_idx" ON "price_auto_review_runs" ("started_at" DESC)';
  END IF;

  IF to_regclass('public.price_auto_review_decisions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "price_auto_review_decisions_run_decision_idx" ON "price_auto_review_decisions" ("run_id", "decision", "reason_code")';
  END IF;
END $$;
