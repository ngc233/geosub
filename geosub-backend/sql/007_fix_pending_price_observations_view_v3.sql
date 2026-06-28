DROP VIEW IF EXISTS pending_price_observations_view;

CREATE VIEW pending_price_observations_view AS
SELECT
  po.id,

  p.slug AS product_slug,
  pl.slug AS plan_slug,

  c.code AS country_code,
  c.name_zh AS country_name_zh,
  c.name_en AS country_name_en,

  po.billing_platform::text AS platform,
  po.source_level::text AS source_type,

  po.raw_price AS observed_local_price,
  po.currency AS observed_currency,

  CASE
    WHEN po.raw_price IS NOT NULL AND po.currency IS NOT NULL
      THEN po.raw_price::text || ' ' || po.currency
    ELSE NULL
  END AS observed_price_text,

  pl.billing_cycle::text AS observed_billing_cycle,
  po.converted_usd AS observed_price_usd,

  po.confidence_score,
  po.status::text AS review_status,

  po.source_url,
  NULL::text AS screenshot_url,

  po.observed_at,
  po.created_at
FROM price_observations po
LEFT JOIN products p ON p.id = po.product_id
LEFT JOIN plans pl ON pl.id = po.plan_id
LEFT JOIN countries c ON c.id = po.country_id
WHERE LOWER(po.status::text) NOT IN ('rejected', 'promoted')
ORDER BY po.observed_at DESC;