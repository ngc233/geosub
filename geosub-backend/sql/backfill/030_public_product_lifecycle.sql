-- GeoSub backfill migration. Split from sql/066_public_product_lifecycle.sql; see migration-layout.json.

UPDATE plans plan
SET
  status = 'published',
  updated_at = NOW()
WHERE plan.status IN ('draft', 'review')
  AND EXISTS (
    SELECT 1
    FROM region_prices price
    WHERE price.plan_id = plan.id
      AND price.status = 'published'
      AND price.price_usd IS NOT NULL
      AND price.price_usd > 0
  );

UPDATE products product
SET
  status = 'published',
  updated_at = NOW()
WHERE product.category IN ('ai', 'streaming')
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
