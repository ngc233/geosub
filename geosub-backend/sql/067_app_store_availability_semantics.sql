-- Keep parser/specification gaps retryable instead of treating them as proof
-- that a storefront has no subscription products.

ALTER TABLE app_store_availability_checks
  DROP CONSTRAINT IF EXISTS app_store_availability_checks_status_check;

ALTER TABLE app_store_availability_checks
  ADD CONSTRAINT app_store_availability_checks_status_check CHECK (status IN (
    'available_with_prices',
    'available_no_iap',
    'available_unmatched_items',
    'not_available',
    'blocked',
    'unknown_error'
  ));

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
