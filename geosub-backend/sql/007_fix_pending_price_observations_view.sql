CREATE OR REPLACE VIEW pending_price_observations_view AS
SELECT
  po.id,
  po.product_slug,
  po.plan_slug,
  po.country_code,
  c.name_zh AS country_name_zh,
  c.name_en AS country_name_en,
  po.platform,
  po.source_type,
  po.observed_local_price,
  po.observed_currency,
  po.observed_price_text,
  po.observed_billing_cycle,
  po.observed_price_usd,
  po.confidence_score,
  po.review_status,
  po.source_url,
  po.screenshot_url,
  po.observed_at,
  po.created_at
FROM price_observations po
LEFT JOIN countries c ON UPPER(c.code) = UPPER(po.country_code)
WHERE po.review_status = 'pending'
ORDER BY po.observed_at DESC;