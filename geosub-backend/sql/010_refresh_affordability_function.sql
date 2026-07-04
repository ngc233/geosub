CREATE OR REPLACE FUNCTION refresh_plan_affordability_metrics(
  arg_product_slug TEXT DEFAULT NULL,
  arg_plan_slug TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row_count INTEGER := 0;
BEGIN
  WITH published_prices AS (
    SELECT DISTINCT ON (p.slug, pl.slug, c.code)
      p.slug AS product_slug,
      pl.slug AS plan_slug,
      c.code AS country_code,
      rp.id::TEXT AS region_price_id,
      rp.price_usd::NUMERIC AS price_usd,
      rp.billing_platform,
      rp.last_checked_at,
      rp.updated_at
    FROM region_prices rp
    JOIN products p ON p.id = rp.product_id
    JOIN plans pl ON pl.id = rp.plan_id
    JOIN countries c ON c.id = rp.country_id
    WHERE rp.status = 'published'
      AND rp.price_usd IS NOT NULL
      AND (arg_product_slug IS NULL OR p.slug = arg_product_slug)
      AND (arg_plan_slug IS NULL OR pl.slug = arg_plan_slug)
    ORDER BY
      p.slug,
      pl.slug,
      c.code,
      CASE
        WHEN rp.billing_platform = 'ios' THEN 0
        WHEN rp.billing_platform = 'web' THEN 1
        ELSE 2
      END,
      rp.last_checked_at DESC NULLS LAST,
      rp.updated_at DESC
  ),

  ranked_income AS (
    SELECT
      cim.id,
      cim.country_code,
      cim.metric_type,
      cim.year,
      cim.monthly_value_usd,
      ROW_NUMBER() OVER (
        PARTITION BY cim.country_code
        ORDER BY
          CASE cim.metric_type
            WHEN 'GNI_PPP' THEN 1
            WHEN 'GNI_ATLAS' THEN 2
            WHEN 'GDP_NOMINAL' THEN 3
            ELSE 9
          END,
          cim.year DESC
      ) AS income_rank
    FROM country_income_metrics cim
    WHERE cim.monthly_value_usd IS NOT NULL
      AND cim.monthly_value_usd > 0
  ),

  price_with_income AS (
    SELECT
      pp.product_slug,
      pp.plan_slug,
      pp.country_code,
      pp.region_price_id,
      ri.id AS income_metric_id,
      pp.price_usd,
      ri.monthly_value_usd,
      ri.year AS data_year,
      ROUND((pp.price_usd / ri.monthly_value_usd) * 100, 4) AS income_share_percent
    FROM published_prices pp
    JOIN ranked_income ri
      ON UPPER(ri.country_code) = UPPER(pp.country_code)
     AND ri.income_rank = 1
  ),

  us_baseline AS (
    SELECT
      product_slug,
      plan_slug,
      income_share_percent AS us_income_share_percent
    FROM price_with_income
    WHERE country_code = 'US'
  ),

  computed AS (
    SELECT
      pwi.product_slug,
      pwi.plan_slug,
      pwi.country_code,
      pwi.region_price_id,
      pwi.income_metric_id,
      pwi.price_usd,
      pwi.monthly_value_usd,
      pwi.income_share_percent,
      ub.us_income_share_percent,
      CASE
        WHEN ub.us_income_share_percent IS NULL OR ub.us_income_share_percent = 0 THEN NULL
        ELSE ROUND(pwi.income_share_percent / ub.us_income_share_percent, 2)
      END AS burden_vs_us,
      CASE
        WHEN pwi.income_share_percent <= 0.5 THEN 'LOW'
        WHEN pwi.income_share_percent <= 1.5 THEN 'MODERATE_LOW'
        WHEN pwi.income_share_percent <= 3 THEN 'MODERATE'
        WHEN pwi.income_share_percent <= 6 THEN 'HIGH'
        ELSE 'VERY_HIGH'
      END AS affordability_level,
      pwi.data_year
    FROM price_with_income pwi
    LEFT JOIN us_baseline ub
      ON ub.product_slug = pwi.product_slug
     AND ub.plan_slug = pwi.plan_slug
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
    created_at,
    updated_at
  )
  SELECT
    product_slug,
    plan_slug,
    country_code,
    region_price_id,
    income_metric_id,
    price_usd,
    monthly_value_usd,
    income_share_percent,
    us_income_share_percent,
    burden_vs_us,
    affordability_level,
    data_year,
    'World Bank',
    NOW(),
    NOW()
  FROM computed
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

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  RETURN v_row_count;
END;
$$;