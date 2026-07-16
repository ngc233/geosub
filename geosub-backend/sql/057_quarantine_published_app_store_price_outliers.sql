-- Keep legacy or externally promoted App Store prices from remaining public
-- when they are extreme against the same product and plan across peer regions.

CREATE OR REPLACE FUNCTION quarantine_published_app_store_price_outliers(
  p_min_peer_count INTEGER DEFAULT 8,
  p_low_multiplier NUMERIC DEFAULT 0.2,
  p_high_multiplier NUMERIC DEFAULT 3.5
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_quarantined INTEGER := 0;
BEGIN
  WITH published AS (
    SELECT region_price.*
    FROM region_prices region_price
    WHERE region_price.status = 'published'
      AND region_price.billing_platform = 'ios'
      AND region_price.price_usd IS NOT NULL
      AND region_price.price_usd >= 1
  ),
  peer_stats AS (
    SELECT
      product_id,
      plan_id,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price_usd)::NUMERIC AS median_usd,
      COUNT(*) AS peer_count
    FROM published
    GROUP BY product_id, plan_id
    HAVING COUNT(*) >= p_min_peer_count
  ),
  outliers AS (
    SELECT
      published.id,
      peer_stats.median_usd,
      peer_stats.peer_count
    FROM published
    JOIN peer_stats
      ON peer_stats.product_id = published.product_id
     AND peer_stats.plan_id = published.plan_id
    WHERE published.price_usd < peer_stats.median_usd * p_low_multiplier
       OR published.price_usd > peer_stats.median_usd * p_high_multiplier
  )
  UPDATE region_prices region_price
  SET
    status = 'review',
    data_quality = 'pending_review',
    source_summary = CONCAT_WS(
      ' ',
      NULLIF(region_price.source_summary, ''),
      FORMAT(
        'Automatically hidden because this App Store price is an extreme peer-region outlier (median %s USD across %s regions).',
        ROUND(outliers.median_usd, 2),
        outliers.peer_count
      )
    ),
    updated_at = NOW()
  FROM outliers
  WHERE region_price.id = outliers.id;

  GET DIAGNOSTICS v_quarantined = ROW_COUNT;
  RETURN v_quarantined;
END;
$$;

SELECT quarantine_published_app_store_price_outliers() AS quarantined_published_outliers;
SELECT refresh_plan_affordability_metrics() AS refreshed_affordability_rows;
