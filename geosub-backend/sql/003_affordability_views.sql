-- GeoSub affordability views
-- Read-friendly views for frontend/admin preview

DROP VIEW IF EXISTS plan_affordability_summary_view;
DROP VIEW IF EXISTS plan_affordability_detail_view;
DROP VIEW IF EXISTS latest_plan_affordability_metrics;

CREATE OR REPLACE VIEW latest_plan_affordability_metrics AS
SELECT
  id,
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
  created_at,
  updated_at
FROM (
  SELECT
    pam.*,
    ROW_NUMBER() OVER (
      PARTITION BY pam.product_slug, pam.plan_slug, pam.country_code
      ORDER BY pam.data_year DESC, pam.updated_at DESC
    ) AS row_rank
  FROM plan_affordability_metrics pam
) ranked
WHERE row_rank = 1;

CREATE OR REPLACE VIEW plan_affordability_detail_view AS
SELECT
  p.slug AS product_slug,
  p.name AS product_name,
  pl.slug AS plan_slug,
  pl.name AS plan_name,
  c.code AS country_code,
  c.iso3 AS country_iso3,
  c.name_zh AS country_name_zh,
  c.name_en AS country_name_en,
  rp.local_price,
  rp.currency,
  rp.price_usd,
  rp.diff_vs_us_percent,
  rp.tax_note,
  rp.availability_note,
  pam.monthly_income_usd,
  pam.income_share_percent,
  pam.us_income_share_percent,
  pam.burden_vs_us,
  pam.affordability_level,
  pam.data_year,
  pam.source,
  pam.updated_at AS affordability_updated_at
FROM latest_plan_affordability_metrics pam
JOIN region_prices rp ON rp.id::text = pam.region_price_id
JOIN products p ON p.slug = pam.product_slug
JOIN plans pl ON pl.slug = pam.plan_slug AND pl.product_id = p.id
JOIN countries c ON UPPER(c.code) = UPPER(pam.country_code);

CREATE OR REPLACE VIEW plan_affordability_summary_view AS
SELECT
  product_slug,
  product_name,
  plan_slug,
  plan_name,
  COUNT(*) AS covered_regions,

  MIN(income_share_percent) AS min_income_share_percent,
  MAX(income_share_percent) AS max_income_share_percent,
  ROUND(AVG(income_share_percent)::numeric, 4) AS avg_income_share_percent,

  MIN(burden_vs_us) AS min_burden_vs_us,
  MAX(burden_vs_us) AS max_burden_vs_us,
  ROUND(AVG(burden_vs_us)::numeric, 2) AS avg_burden_vs_us,

  (ARRAY_AGG(country_code ORDER BY income_share_percent ASC))[1] AS lowest_burden_country,
  (ARRAY_AGG(country_code ORDER BY income_share_percent DESC))[1] AS highest_burden_country,

  MAX(data_year) AS data_year
FROM plan_affordability_detail_view
GROUP BY product_slug, product_name, plan_slug, plan_name;
