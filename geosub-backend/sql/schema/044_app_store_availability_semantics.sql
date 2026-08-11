-- GeoSub schema migration. Split from sql/067_app_store_availability_semantics.sql; see migration-layout.json.

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
