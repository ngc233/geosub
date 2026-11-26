-- Extend the successful App Store collection publication gate to software products
-- so category='software' products can automatically transition from review/draft
-- to published once auto-review approves their first region price and collection finishes.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION promote_public_product_after_successful_collection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'succeeded'
    AND NEW.collector_kind = 'app_store'
    AND NEW.product_id IS NOT NULL
  THEN
    UPDATE plans plan
    SET
      status = 'published',
      updated_at = NOW()
    WHERE plan.product_id = NEW.product_id
      AND plan.status IN ('draft', 'review')
      AND EXISTS (
        SELECT 1
        FROM region_prices price
        WHERE price.plan_id = plan.id
          AND price.product_id = NEW.product_id
          AND price.status = 'published'
          AND price.price_usd IS NOT NULL
          AND price.price_usd > 0
      );

    UPDATE products product
    SET
      status = 'published',
      updated_at = NOW()
    WHERE product.id = NEW.product_id
      AND product.category IN ('ai', 'streaming', 'software')
      AND product.status IN ('draft', 'review')
      AND EXISTS (
        SELECT 1
        FROM plans plan
        JOIN region_prices price ON price.plan_id = plan.id
        WHERE plan.product_id = product.id
          AND plan.status = 'published'
          AND price.product_id = product.id
          AND price.status = 'published'
          AND price.price_usd IS NOT NULL
          AND price.price_usd > 0
      );
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
