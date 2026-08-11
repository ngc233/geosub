-- GeoSub schema migration. Split from sql/066_public_product_lifecycle.sql; see migration-layout.json.

-- Keep public product, plan and price states aligned.
-- A reviewed price cannot be public while its owning plan or product remains
-- in draft/review. Archived records are never reactivated automatically.

CREATE OR REPLACE FUNCTION promote_public_product_from_region_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published'
    AND NEW.price_usd IS NOT NULL
    AND NEW.price_usd > 0
  THEN
    UPDATE plans
    SET
      status = 'published',
      updated_at = NOW()
    WHERE id = NEW.plan_id
      AND status IN ('draft', 'review');

    IF EXISTS (
      SELECT 1
      FROM plans plan
      WHERE plan.id = NEW.plan_id
        AND plan.status = 'published'
    ) THEN
      UPDATE products
      SET
        status = 'published',
        updated_at = NOW()
      WHERE id = NEW.product_id
        AND category IN ('ai', 'streaming')
        AND status IN ('draft', 'review');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promote_public_product_from_region_price_trigger
  ON region_prices;

CREATE TRIGGER promote_public_product_from_region_price_trigger
AFTER INSERT OR UPDATE OF status, price_usd, product_id, plan_id
ON region_prices
FOR EACH ROW
EXECUTE FUNCTION promote_public_product_from_region_price();

-- Reconcile products that already had public prices before this lifecycle rule.
