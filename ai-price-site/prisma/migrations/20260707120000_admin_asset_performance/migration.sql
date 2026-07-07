-- Keep admin asset pages responsive as product, plan, and regional price data grows.
-- These indexes support product-level summary cards without loading every price row.

CREATE INDEX IF NOT EXISTS "products_sort_created_name_idx"
ON "products" ("sort_order", "created_at", "name");

CREATE INDEX IF NOT EXISTS "plans_product_sort_created_idx"
ON "plans" ("product_id", "sort_order", "created_at");

CREATE INDEX IF NOT EXISTS "region_prices_product_quality_source_checked_idx"
ON "region_prices" (
  "product_id",
  "data_quality",
  "primary_source_id",
  "last_checked_at" DESC,
  "updated_at" DESC
);

CREATE INDEX IF NOT EXISTS "region_prices_product_country_idx"
ON "region_prices" ("product_id", "country_id");

CREATE INDEX IF NOT EXISTS "region_prices_product_plan_idx"
ON "region_prices" ("product_id", "plan_id");

DO $$
BEGIN
  IF to_regclass('public.product_discovery_candidates') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "product_discovery_candidates_promoted_product_idx" ON "product_discovery_candidates" ("promoted_product_id")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "product_discovery_candidates_matched_product_idx" ON "product_discovery_candidates" ("matched_product_id")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "product_discovery_candidates_status_seen_idx" ON "product_discovery_candidates" ("status", "last_seen_at" DESC)';
  END IF;
END $$;
