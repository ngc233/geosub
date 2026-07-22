-- Archive old ambiguous App Store observations only after a newer published
-- price proves that the selected local amount and currency were correct.

CREATE OR REPLACE FUNCTION archive_superseded_app_store_ambiguities()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_archived INTEGER := 0;
BEGIN
  WITH archived AS (
    UPDATE price_observations observation
    SET
      status = 'ignored'::observation_status,
      raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb)
        || jsonb_build_object(
          'previous_auto_review_reason_code',
            observation.raw_payload ->> 'auto_review_reason_code',
          'auto_review_action', 'ignored',
          'auto_review_reason_code', 'superseded_by_published_price',
          'auto_review_reason',
            'A newer published App Store price confirmed the same local amount and currency.',
          'auto_closed_at', NOW()::TEXT
        ),
      updated_at = NOW()
    FROM region_prices published
    WHERE observation.product_id = published.product_id
      AND observation.plan_id = published.plan_id
      AND observation.country_id = published.country_id
      AND observation.billing_platform = published.billing_platform
      AND observation.price_type = published.price_type
      AND observation.status = 'pending'::observation_status
      AND observation.billing_platform = 'ios'::billing_platform
      AND observation.anomaly_flag = TRUE
      AND observation.anomaly_reason =
        'Multiple App Store prices matched this plan without a clear consensus. This may indicate monthly/yearly or tier parsing ambiguity.'
      AND published.status = 'published'::publish_status
      AND published.billing_platform = 'ios'::billing_platform
      AND published.local_price IS NOT DISTINCT FROM observation.raw_price
      AND published.currency IS NOT DISTINCT FROM observation.currency
      AND published.last_checked_at >= observation.observed_at
    RETURNING observation.id
  )
  SELECT COUNT(*)::INTEGER INTO v_archived FROM archived;

  RETURN v_archived;
END;
$$;

CREATE OR REPLACE FUNCTION archive_superseded_app_store_ambiguity_for_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published'::publish_status
    AND NEW.billing_platform = 'ios'::billing_platform
  THEN
    UPDATE price_observations observation
    SET
      status = 'ignored'::observation_status,
      raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb)
        || jsonb_build_object(
          'previous_auto_review_reason_code',
            observation.raw_payload ->> 'auto_review_reason_code',
          'auto_review_action', 'ignored',
          'auto_review_reason_code', 'superseded_by_published_price',
          'auto_review_reason',
            'A newer published App Store price confirmed the same local amount and currency.',
          'auto_closed_at', NOW()::TEXT
        ),
      updated_at = NOW()
    WHERE observation.product_id = NEW.product_id
      AND observation.plan_id = NEW.plan_id
      AND observation.country_id = NEW.country_id
      AND observation.billing_platform = NEW.billing_platform
      AND observation.price_type = NEW.price_type
      AND observation.status = 'pending'::observation_status
      AND observation.anomaly_flag = TRUE
      AND observation.anomaly_reason =
        'Multiple App Store prices matched this plan without a clear consensus. This may indicate monthly/yearly or tier parsing ambiguity.'
      AND NEW.local_price IS NOT DISTINCT FROM observation.raw_price
      AND NEW.currency IS NOT DISTINCT FROM observation.currency
      AND NEW.last_checked_at >= observation.observed_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS archive_superseded_app_store_ambiguities_trigger
  ON region_prices;

CREATE TRIGGER archive_superseded_app_store_ambiguities_trigger
AFTER INSERT OR UPDATE OF
  local_price,
  currency,
  last_checked_at,
  status
ON region_prices
FOR EACH ROW
EXECUTE FUNCTION archive_superseded_app_store_ambiguity_for_price();

SELECT archive_superseded_app_store_ambiguities()
  AS archived_superseded_app_store_ambiguities;
