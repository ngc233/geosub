CREATE OR REPLACE FUNCTION refresh_inferred_app_store_tax_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  WITH published_countries AS (
    SELECT DISTINCT country.id AS country_id
    FROM region_prices price
    JOIN countries country ON country.id = price.country_id
    WHERE price.status = 'published'::publish_status
      AND price.billing_platform = 'ios'::billing_platform
  ),
  missing_profiles AS (
    SELECT published_countries.country_id
    FROM published_countries
    LEFT JOIN country_tax_profiles existing
      ON existing.country_id = published_countries.country_id
      AND existing.status = 'active'
    WHERE existing.id IS NULL
  ),
  inserted AS (
    INSERT INTO country_tax_profiles (
      id,
      country_id,
      tax_type,
      rate_min,
      rate_max,
      applies_to_digital_services,
      is_variable_by_region,
      display_note_zh,
      display_note_en,
      source_label,
      source_url,
      confidence,
      verified_at,
      status,
      app_store_tax_treatment,
      price_calculation_policy,
      review_status,
      frontend_note_zh,
      frontend_note_en,
      source_kind,
      source_document_date,
      last_synced_at,
      next_review_at,
      sync_status,
      sync_note,
      source_payload,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      missing_profiles.country_id,
      'Platform checkout',
      NULL,
      NULL,
      TRUE,
      FALSE,
      'App Store list price; final checkout applies',
      'App Store list price; final checkout applies',
      'GeoSub inferred App Store checkout treatment',
      'https://support.apple.com/billing',
      'medium',
      NULL,
      'active',
      'unknown',
      'do_not_calculate',
      'unknown',
      'No country tax-rate profile matched yet; App Store checkout remains the final source of truth',
      'No country tax-rate profile matched yet; App Store checkout remains the final source of truth',
      'inferred',
      NULL,
      NOW(),
      NOW() + INTERVAL '30 days',
      'needs_review',
      'Generated automatically for published App Store prices without a country tax profile.',
      jsonb_build_object(
        'inference', 'published_app_store_price_without_country_tax_profile',
        'billing_platform', 'ios'
      ),
      NOW(),
      NOW()
    FROM missing_profiles
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_inserted_count
  FROM inserted;

  RETURN v_inserted_count;
END;
$$;
