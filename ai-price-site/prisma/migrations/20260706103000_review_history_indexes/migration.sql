-- Speed up admin review history queries. The history view reads non-pending
-- observations ordered by update time and grouped by product/status.

CREATE INDEX IF NOT EXISTS "price_observations_history_updated_idx"
ON "price_observations" ("updated_at" DESC)
WHERE "status" <> 'pending';

CREATE INDEX IF NOT EXISTS "price_observations_history_product_status_updated_idx"
ON "price_observations" ("product_id", "status", "updated_at" DESC)
WHERE "status" <> 'pending';
