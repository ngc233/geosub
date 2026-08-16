-- Publish a product only after an App Store collection finishes successfully.
-- Partial observations from failed runs may still be reviewed and retained, but
-- they must not make a draft/review product public.

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
  END IF;

  RETURN NEW;
END;
$$;

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
      AND product.category IN ('ai', 'streaming')
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

DROP TRIGGER IF EXISTS promote_public_product_after_successful_collection_trigger
  ON collector_job_runs;

CREATE TRIGGER promote_public_product_after_successful_collection_trigger
AFTER INSERT OR UPDATE OF status
ON collector_job_runs
FOR EACH ROW
EXECUTE FUNCTION promote_public_product_after_successful_collection();
