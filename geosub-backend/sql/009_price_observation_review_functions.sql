CREATE OR REPLACE FUNCTION approve_price_observation(p_observation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_observation price_observations%ROWTYPE;
  v_region_price_id UUID;
  v_us_country_id UUID;
  v_us_base_price NUMERIC;
  v_diff_vs_us_percent NUMERIC;
  v_data_quality data_quality;
BEGIN
  SELECT *
  INTO v_observation
  FROM price_observations
  WHERE id = p_observation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'price_observation % not found', p_observation_id;
  END IF;

  IF v_observation.status <> 'pending' THEN
    RAISE EXCEPTION 'price_observation % is not pending, current status: %',
      p_observation_id,
      v_observation.status;
  END IF;

  IF v_observation.product_id IS NULL
    OR v_observation.plan_id IS NULL
    OR v_observation.country_id IS NULL
    OR v_observation.raw_price IS NULL
    OR v_observation.currency IS NULL
    OR v_observation.converted_usd IS NULL
  THEN
    RAISE EXCEPTION 'price_observation % has incomplete required fields', p_observation_id;
  END IF;

  SELECT id
  INTO v_us_country_id
  FROM countries
  WHERE UPPER(code) = 'US'
  LIMIT 1;

  IF v_observation.country_id = v_us_country_id THEN
    v_us_base_price := v_observation.converted_usd;
  ELSE
    SELECT rp.price_usd
    INTO v_us_base_price
    FROM region_prices rp
    WHERE rp.product_id = v_observation.product_id
      AND rp.plan_id = v_observation.plan_id
      AND rp.country_id = v_us_country_id
      AND rp.price_type = v_observation.price_type
      AND rp.status = 'published'
    ORDER BY
      CASE WHEN rp.billing_platform = v_observation.billing_platform THEN 0 ELSE 1 END,
      rp.last_checked_at DESC NULLS LAST,
      rp.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_us_base_price IS NULL OR v_us_base_price = 0 THEN
    v_diff_vs_us_percent := NULL;
  ELSE
    v_diff_vs_us_percent := ROUND(
      ((v_observation.converted_usd - v_us_base_price) / v_us_base_price) * 100,
      2
    );
  END IF;

  v_data_quality := CASE
    WHEN v_observation.source_level = 'A'
      AND v_observation.confidence_score >= 80
      THEN 'verified'::data_quality
    WHEN v_observation.confidence_score >= 60
      THEN 'estimated'::data_quality
    ELSE 'pending_review'::data_quality
  END;

  SELECT rp.id
  INTO v_region_price_id
  FROM region_prices rp
  WHERE rp.product_id = v_observation.product_id
    AND rp.plan_id = v_observation.plan_id
    AND rp.country_id = v_observation.country_id
    AND rp.price_type = v_observation.price_type
  ORDER BY
    CASE WHEN rp.billing_platform = v_observation.billing_platform THEN 0 ELSE 1 END,
    CASE WHEN rp.status = 'published' THEN 0 ELSE 1 END,
    rp.updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_region_price_id IS NULL THEN
    INSERT INTO region_prices (
      id,
      product_id,
      plan_id,
      country_id,
      local_price,
      currency,
      price_usd,
      us_base_price,
      diff_vs_us_percent,
      billing_platform,
      price_type,
      tax_note,
      availability_note,
      source_summary,
      primary_source_id,
      confidence_score,
      data_quality,
      status,
      last_checked_at,
      published_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_observation.product_id,
      v_observation.plan_id,
      v_observation.country_id,
      v_observation.raw_price,
      v_observation.currency,
      v_observation.converted_usd,
      v_us_base_price,
      v_diff_vs_us_percent,
      v_observation.billing_platform,
      v_observation.price_type,
      CASE
        WHEN v_observation.tax_included = 'true' THEN 'Tax included.'
        WHEN v_observation.tax_included = 'false' THEN 'Tax excluded.'
        ELSE NULL
      END,
      NULL,
      'Approved observation: ' || v_observation.source_level::TEXT || ' level, ' || COALESCE(v_observation.parser_version, 'manual'),
      v_observation.source_id,
      v_observation.confidence_score,
      v_data_quality,
      'published',
      v_observation.observed_at,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_region_price_id;
  ELSE
    UPDATE region_prices
    SET
      local_price = v_observation.raw_price,
      currency = v_observation.currency,
      price_usd = v_observation.converted_usd,
      us_base_price = v_us_base_price,
      diff_vs_us_percent = v_diff_vs_us_percent,
      billing_platform = v_observation.billing_platform,
      price_type = v_observation.price_type,
      tax_note = CASE
        WHEN v_observation.tax_included = 'true' THEN 'Tax included.'
        WHEN v_observation.tax_included = 'false' THEN 'Tax excluded.'
        ELSE NULL
      END,
      source_summary = 'Approved observation: ' || v_observation.source_level::TEXT || ' level, ' || COALESCE(v_observation.parser_version, 'manual'),
      primary_source_id = v_observation.source_id,
      confidence_score = v_observation.confidence_score,
      data_quality = v_data_quality,
      status = 'published',
      last_checked_at = v_observation.observed_at,
      published_at = COALESCE(region_prices.published_at, NOW()),
      updated_at = NOW()
    WHERE id = v_region_price_id;
  END IF;

  UPDATE price_observations
  SET
    status = 'approved',
    raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
      'approved_at', NOW()::TEXT,
      'promoted_region_price_id', v_region_price_id::TEXT
    ),
    updated_at = NOW()
  WHERE id = v_observation.id;

  RETURN v_region_price_id;
END;
$$;


CREATE OR REPLACE FUNCTION reject_price_observation(
  p_observation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE price_observations
  SET
    status = 'rejected',
    raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
      'rejected_at', NOW()::TEXT,
      'reject_reason', p_reason
    ),
    updated_at = NOW()
  WHERE id = p_observation_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending price_observation % not found', p_observation_id;
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION ignore_price_observation(
  p_observation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE price_observations
  SET
    status = 'ignored',
    raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
      'ignored_at', NOW()::TEXT,
      'ignore_reason', p_reason
    ),
    updated_at = NOW()
  WHERE id = p_observation_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending price_observation % not found', p_observation_id;
  END IF;
END;
$$;
