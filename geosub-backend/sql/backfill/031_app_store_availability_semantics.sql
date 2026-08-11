-- GeoSub backfill migration. Split from sql/067_app_store_availability_semantics.sql; see migration-layout.json.

UPDATE app_store_availability_checks
SET
  status = 'available_unmatched_items',
  reason = CASE
    WHEN NULLIF(BTRIM(reason), '') IS NULL
      THEN 'App Store in-app purchases were visible, but none matched the maintained subscription plan specification.'
    ELSE reason
  END,
  updated_at = NOW()
WHERE status = 'available_no_iap'
  AND item_count > 0
  AND subscription_item_count = 0;
