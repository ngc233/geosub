CREATE OR REPLACE VIEW price_observation_evidence_view AS
WITH observation_with_context AS (
  SELECT
    observation.id,
    observation.product_id,
    observation.plan_id,
    observation.country_id,
    observation.source_id,
    observation.source_level,
    observation.raw_price,
    observation.currency,
    observation.converted_usd,
    observation.observed_at,
    observation.source_url,
    observation.billing_platform,
    observation.price_type,
    observation.raw_payload,
    observation.parser_version,
    observation.confidence_score,
    observation.anomaly_flag,
    observation.anomaly_reason,
    observation.status,
    product.slug AS product_slug,
    product.name AS product_name,
    plan.slug AS plan_slug,
    plan.name AS plan_name,
    country.code AS country_code,
    country.name_zh AS country_name_zh,
    country.name_en AS country_name_en,
    source.name AS source_name,
    source.type::text AS source_type,
    published.id AS published_region_price_id,
    published.local_price AS published_local_price,
    published.currency AS published_currency,
    published.price_usd AS published_price_usd,
    published.last_checked_at AS published_last_checked_at,
    published.status::text AS published_status
  FROM price_observations observation
  LEFT JOIN products product ON product.id = observation.product_id
  LEFT JOIN plans plan ON plan.id = observation.plan_id
  LEFT JOIN countries country ON country.id = observation.country_id
  LEFT JOIN price_sources source ON source.id = observation.source_id
  LEFT JOIN region_prices published
    ON published.product_id = observation.product_id
    AND published.plan_id = observation.plan_id
    AND published.country_id = observation.country_id
    AND published.billing_platform = observation.billing_platform
    AND published.price_type = observation.price_type
    AND published.status = 'published'::publish_status
),
evidence_fields AS (
  SELECT
    *,
    COALESCE(raw_payload ->> 'collector', '') AS collector_name,
    COALESCE(raw_payload ->> 'observed_price_text', '') AS observed_price_text,
    COALESCE(raw_payload ->> 'fx_rate_date', '') AS fx_rate_date_text,
    COALESCE(raw_payload ->> 'auto_review_reason_code', '') AS auto_review_reason_code,
    COALESCE(raw_payload ->> 'auto_review_reason', raw_payload ->> 'review_note', anomaly_reason, '') AS evidence_note,
    CASE
      WHEN COALESCE(raw_payload #>> '{raw_snapshot,priceSelection,selectedCount}', '') ~ '^\d+$'
        THEN (raw_payload #>> '{raw_snapshot,priceSelection,selectedCount}')::INTEGER
      ELSE NULL
    END AS modal_selected_count,
    CASE
      WHEN COALESCE(raw_payload #>> '{raw_snapshot,priceSelection,runnerUpCount}', '') ~ '^\d+$'
        THEN (raw_payload #>> '{raw_snapshot,priceSelection,runnerUpCount}')::INTEGER
      ELSE NULL
    END AS modal_runner_up_count,
    CASE
      WHEN COALESCE(raw_payload #>> '{raw_snapshot,priceSelection,variantCount}', '') ~ '^\d+$'
        THEN (raw_payload #>> '{raw_snapshot,priceSelection,variantCount}')::INTEGER
      ELSE NULL
    END AS modal_variant_count,
    raw_payload #> '{raw_snapshot,priceSelection,variants}' AS modal_variants
  FROM observation_with_context
)
SELECT
  *,
  CASE
    WHEN source_type = 'app_store' AND parser_version ILIKE '%rendered%' THEN 'official_app_store_rendered'
    WHEN source_type = 'app_store' THEN 'official_app_store_static'
    WHEN source_type IN ('official_site', 'official_page') THEN 'official_site'
    WHEN source_type = 'google_play' THEN 'google_play_evidence'
    WHEN source_type = 'manual' THEN 'manual'
    ELSE COALESCE(source_type, 'unknown')
  END AS evidence_tier,
  CASE
    WHEN modal_variant_count > 1
      AND COALESCE(modal_selected_count, 0) >= 2
      AND COALESCE(modal_selected_count, 0) > COALESCE(modal_runner_up_count, 0)
      THEN TRUE
    ELSE FALSE
  END AS has_modal_consensus,
  CASE
    WHEN published_region_price_id IS NULL THEN 'no_published_price'
    WHEN published_last_checked_at >= observed_at THEN 'superseded_by_newer_published_price'
    WHEN published_currency IS NOT DISTINCT FROM currency
      AND published_local_price IS NOT DISTINCT FROM raw_price
      AND (
        published_price_usd IS NULL
        OR converted_usd IS NULL
        OR published_price_usd = 0
        OR ABS((converted_usd - published_price_usd) / published_price_usd) <= 0.02
      )
      THEN 'matches_published_price'
    ELSE 'conflicts_with_published_price'
  END AS published_comparison,
  CASE
    WHEN fx_rate_date_text ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (CURRENT_DATE - fx_rate_date_text::date)
    ELSE NULL
  END AS fx_rate_age_days,
  LEAST(100, GREATEST(0, (
    LEAST(GREATEST(COALESCE(confidence_score, 0), 0), 100)
      + CASE WHEN source_type = 'app_store' THEN 8 ELSE 0 END
      + CASE WHEN parser_version ILIKE '%rendered%' THEN 6 ELSE 0 END
      + CASE
          WHEN modal_variant_count > 1
            AND COALESCE(modal_selected_count, 0) >= 2
            AND COALESCE(modal_selected_count, 0) > COALESCE(modal_runner_up_count, 0)
            THEN 8
          ELSE 0
        END
      - CASE WHEN COALESCE(anomaly_flag, FALSE) THEN 25 ELSE 0 END
      - CASE
          WHEN fx_rate_date_text ~ '^\d{4}-\d{2}-\d{2}$'
            AND (CURRENT_DATE - fx_rate_date_text::date) > 2
            THEN 6
          ELSE 0
        END
  )))::INTEGER AS evidence_score,
  CASE
    WHEN COALESCE(anomaly_flag, FALSE) THEN 'blocked_anomaly'
    WHEN modal_variant_count > 1
      AND COALESCE(modal_selected_count, 0) >= 2
      AND COALESCE(modal_selected_count, 0) > COALESCE(modal_runner_up_count, 0)
      THEN 'modal_price_consensus'
    WHEN published_region_price_id IS NOT NULL
      AND published_last_checked_at >= observed_at
      THEN 'old_sample'
    WHEN confidence_score >= 80
      AND source_type = 'app_store'
      THEN 'strong_official_sample'
    WHEN confidence_score >= 60 THEN 'usable_context'
    ELSE 'weak_evidence'
  END AS evidence_status
FROM evidence_fields;
