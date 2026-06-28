-- GeoSub affordability snapshot
-- Compute local subscription burden from region_prices + latest_country_income_metrics

WITH price_income AS (
  SELECT
    rp.id::text AS region_price_id,
    p.slug AS product_slug,
    pl.slug AS plan_slug,
    UPPER(c.code) AS country_code,
    rp.price_usd::numeric AS price_usd,
    lci.id AS income_metric_id,
    lci.year AS data_year,
    lci.monthly_value_usd::numeric AS monthly_income_usd,
    lci.source AS source,
    ROUND((rp.price_usd::numeric / NULLIF(lci.monthly_value_usd::numeric, 0) * 100)::numeric, 4) AS income_share_percent
  FROM region_prices rp
  JOIN products p ON p.id = rp.product_id
  JOIN plans pl ON pl.id = rp.plan_id
  JOIN countries c ON c.id = rp.country_id
  JOIN latest_country_income_metrics lci
    ON UPPER(lci.country_code) = UPPER(c.code)
  WHERE rp.status = 'published'
    AND pl.status = 'published'
    AND p.slug IS NOT NULL
    AND pl.slug IS NOT NULL
    AND rp.price_usd IS NOT NULL
    AND lci.monthly_value_usd IS NOT NULL
),
us_benchmark AS (
  SELECT
    product_slug,
    plan_slug,
    income_share_percent AS us_income_share_percent
  FROM price_income
  WHERE country_code = 'US'
)
INSERT INTO plan_affordability_metrics (
  product_slug,
  plan_slug,
  country_code,
  region_price_id,
  income_metric_id,
  price_usd,
  monthly_income_usd,
  income_share_percent,
  us_income_share_percent,
  burden_vs_us,
  affordability_level,
  data_year,
  source,
  updated_at
)
SELECT
  pi.product_slug,
  pi.plan_slug,
  pi.country_code,
  pi.region_price_id,
  pi.income_metric_id,
  pi.price_usd,
  pi.monthly_income_usd,
  pi.income_share_percent,
  ub.us_income_share_percent,
  CASE
    WHEN ub.us_income_share_percent IS NULL OR ub.us_income_share_percent = 0 THEN NULL
    ELSE ROUND((pi.income_share_percent / ub.us_income_share_percent)::numeric, 2)
  END AS burden_vs_us,
  CASE
    WHEN pi.income_share_percent <= 0.5 THEN 'LOW'
    WHEN pi.income_share_percent <= 1.5 THEN 'MODERATE_LOW'
    WHEN pi.income_share_percent <= 3 THEN 'MODERATE'
    WHEN pi.income_share_percent <= 6 THEN 'HIGH'
    ELSE 'VERY_HIGH'
  END AS affordability_level,
  pi.data_year,
  pi.source,
  NOW()
FROM price_income pi
LEFT JOIN us_benchmark ub
  ON ub.product_slug = pi.product_slug
 AND ub.plan_slug = pi.plan_slug
ON CONFLICT (product_slug, plan_slug, country_code, data_year)
DO UPDATE SET
  region_price_id = EXCLUDED.region_price_id,
  income_metric_id = EXCLUDED.income_metric_id,
  price_usd = EXCLUDED.price_usd,
  monthly_income_usd = EXCLUDED.monthly_income_usd,
  income_share_percent = EXCLUDED.income_share_percent,
  us_income_share_percent = EXCLUDED.us_income_share_percent,
  burden_vs_us = EXCLUDED.burden_vs_us,
  affordability_level = EXCLUDED.affordability_level,
  source = EXCLUDED.source,
  updated_at = NOW();

SELECT
  product_slug,
  plan_slug,
  country_code,
  price_usd,
  monthly_income_usd,
  income_share_percent,
  us_income_share_percent,
  burden_vs_us,
  affordability_level,
  data_year
FROM plan_affordability_metrics
ORDER BY product_slug, plan_slug, income_share_percent DESC;