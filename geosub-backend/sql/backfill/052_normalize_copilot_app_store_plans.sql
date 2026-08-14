-- Collapse localized Microsoft 365 Personal plan records into the canonical
-- Copilot Personal tier while retaining every collected observation.

BEGIN;

WITH copilot AS (
  SELECT id
  FROM products
  WHERE slug = 'microsoft-copilot'
  LIMIT 1
),
target AS (
  SELECT plan.id
  FROM plans plan
  JOIN copilot ON copilot.id = plan.product_id
  WHERE plan.slug = 'personal'
  LIMIT 1
),
legacy AS (
  SELECT plan.id
  FROM plans plan
  JOIN copilot ON copilot.id = plan.product_id
  WHERE plan.slug IN ('microsoft-365-personal', 'microsoft-365')
)
UPDATE price_observations observation
SET plan_id = target.id,
    updated_at = NOW()
FROM target
WHERE observation.plan_id IN (SELECT id FROM legacy);

WITH copilot AS (
  SELECT id
  FROM products
  WHERE slug = 'microsoft-copilot'
  LIMIT 1
),
target AS (
  SELECT plan.id
  FROM plans plan
  JOIN copilot ON copilot.id = plan.product_id
  WHERE plan.slug = 'personal'
  LIMIT 1
),
legacy AS (
  SELECT plan.id
  FROM plans plan
  JOIN copilot ON copilot.id = plan.product_id
  WHERE plan.slug IN ('microsoft-365-personal', 'microsoft-365')
)
UPDATE region_prices price
SET plan_id = target.id,
    source_summary = CONCAT_WS(
      ' ',
      NULLIF(price.source_summary, ''),
      'Normalized from a localized Microsoft 365 Personal App Store label.'
    ),
    updated_at = NOW()
FROM target
WHERE price.plan_id IN (SELECT id FROM legacy)
  AND NOT EXISTS (
    SELECT 1
    FROM region_prices existing
    WHERE existing.plan_id = target.id
      AND existing.country_id = price.country_id
      AND existing.billing_platform = price.billing_platform
      AND existing.price_type = price.price_type
      AND existing.id <> price.id
  );

WITH copilot AS (
  SELECT id
  FROM products
  WHERE slug = 'microsoft-copilot'
  LIMIT 1
)
UPDATE plans plan
SET status = 'archived'::publish_status,
    description = 'Archived localized duplicate of the canonical Microsoft 365 Personal tier.',
    sort_order = 990,
    updated_at = NOW()
FROM copilot
WHERE plan.product_id = copilot.id
  AND plan.slug IN ('microsoft-365-personal', 'microsoft-365');

WITH copilot AS (
  SELECT id
  FROM products
  WHERE slug = 'microsoft-copilot'
  LIMIT 1
)
UPDATE plans plan
SET name = CASE
      WHEN plan.slug = 'personal' THEN 'Microsoft 365 Personal'
      WHEN plan.slug = 'premium' THEN 'Microsoft 365 Premium'
      ELSE plan.name
    END,
    billing_cycle = 'monthly'::billing_cycle,
    sort_order = CASE
      WHEN plan.slug = 'personal' THEN 10
      WHEN plan.slug = 'premium' THEN 20
      ELSE plan.sort_order
    END,
    updated_at = NOW()
FROM copilot
WHERE plan.product_id = copilot.id
  AND plan.slug IN ('personal', 'premium');

COMMIT;
