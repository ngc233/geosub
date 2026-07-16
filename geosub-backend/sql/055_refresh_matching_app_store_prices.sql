-- A matching App Store observation still proves that a published price was
-- rechecked. Keep its freshness and FX conversion current before the
-- stability reviewer archives the duplicate observation.

CREATE OR REPLACE FUNCTION refresh_matching_app_store_prices()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_refreshed_count INTEGER := 0;
  v_plan_ids UUID[];
BEGIN
  WITH matching_observations AS (
    SELECT DISTINCT ON (published.id)
      published.id AS region_price_id,
      published.plan_id,
      observation.source_id,
      observation.observed_at,
      observation.converted_usd,
      observation.confidence_score,
      observation.parser_version
    FROM region_prices published
    JOIN price_observations observation
      ON observation.product_id = published.product_id
     AND observation.plan_id = published.plan_id
     AND observation.country_id = published.country_id
     AND observation.billing_platform = published.billing_platform
     AND observation.price_type = published.price_type
    WHERE published.status = 'published'
      AND published.billing_platform = 'ios'
      AND observation.billing_platform = 'ios'
      AND (
        observation.status = 'pending'
        OR (
          observation.status = 'ignored'
          AND observation.raw_payload ->> 'auto_review_reason_code' = 'superseded_by_published_price'
        )
      )
      AND COALESCE(observation.anomaly_flag, FALSE) = FALSE
      AND observation.observed_at > COALESCE(published.last_checked_at, '-infinity'::timestamptz)
      AND published.currency IS NOT DISTINCT FROM observation.currency
      AND published.local_price IS NOT DISTINCT FROM observation.raw_price
      AND observation.converted_usd IS NOT NULL
      AND observation.converted_usd >= 1
      AND (
        published.price_usd IS NULL
        OR published.price_usd = 0
        OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
      )
    ORDER BY published.id, observation.observed_at DESC, observation.created_at DESC
  ),
  refreshed AS (
    UPDATE region_prices published
    SET
      price_usd = matching.converted_usd,
      primary_source_id = COALESCE(matching.source_id, published.primary_source_id),
      confidence_score = GREATEST(published.confidence_score, matching.confidence_score),
      source_summary = 'Revalidated matching App Store observation: '
        || COALESCE(matching.parser_version, 'collector'),
      last_checked_at = matching.observed_at,
      updated_at = NOW()
    FROM matching_observations matching
    WHERE published.id = matching.region_price_id
    RETURNING published.plan_id
  )
  SELECT
    COUNT(*)::INTEGER,
    ARRAY_AGG(DISTINCT plan_id)
  INTO v_refreshed_count, v_plan_ids
  FROM refreshed;

  IF v_refreshed_count > 0 THEN
    WITH us_prices AS (
      SELECT DISTINCT ON (price.plan_id, price.price_type)
        price.plan_id,
        price.price_type,
        price.price_usd
      FROM region_prices price
      JOIN countries country ON country.id = price.country_id
      WHERE price.plan_id = ANY(v_plan_ids)
        AND price.status = 'published'
        AND price.billing_platform = 'ios'
        AND price.price_usd IS NOT NULL
        AND UPPER(country.code) = 'US'
      ORDER BY
        price.plan_id,
        price.price_type,
        price.last_checked_at DESC NULLS LAST,
        price.updated_at DESC
    )
    UPDATE region_prices target
    SET
      us_base_price = us.price_usd,
      diff_vs_us_percent = CASE
        WHEN us.price_usd = 0 THEN NULL
        ELSE ROUND(((target.price_usd - us.price_usd) / us.price_usd) * 100, 2)
      END,
      updated_at = NOW()
    FROM us_prices us
    WHERE target.plan_id = us.plan_id
      AND target.price_type = us.price_type
      AND target.status = 'published'
      AND target.billing_platform = 'ios'
      AND target.price_usd IS NOT NULL;
  END IF;

  RETURN v_refreshed_count;
END;
$$;

SELECT refresh_matching_app_store_prices() AS refreshed_matching_prices;
