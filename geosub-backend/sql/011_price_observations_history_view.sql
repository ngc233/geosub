DROP VIEW IF EXISTS price_observations_review_history_view;

CREATE VIEW price_observations_review_history_view AS
SELECT
  po.id,

  p.slug AS product_slug,
  p.name AS product_name,

  pl.slug AS plan_slug,
  pl.name AS plan_name,

  c.code AS country_code,
  c.name_zh AS country_name_zh,
  c.name_en AS country_name_en,

  po.billing_platform::text AS platform,
  po.source_level::text AS source_type,

  po.raw_price AS observed_local_price,
  po.currency AS observed_currency,

  COALESCE(
    po.raw_payload ->> 'observed_price_text',
    CASE
      WHEN po.raw_price IS NOT NULL AND po.currency IS NOT NULL
        THEN po.raw_price::text || ' ' || po.currency
      ELSE NULL
    END
  ) AS observed_price_text,

  pl.billing_cycle::text AS observed_billing_cycle,
  po.converted_usd AS observed_price_usd,

  po.price_type::text AS price_type,
  po.tax_included::text AS tax_included,

  po.confidence_score,
  po.status::text AS review_status,

  po.source_url,
  po.raw_payload ->> 'screenshot_url' AS screenshot_url,
  po.raw_payload ->> 'review_note' AS review_note,
  po.raw_payload ->> 'approved_at' AS approved_at_text,
  po.raw_payload ->> 'rejected_at' AS rejected_at_text,
  po.raw_payload ->> 'ignored_at' AS ignored_at_text,
  po.raw_payload ->> 'promoted_region_price_id' AS promoted_region_price_id,

  rp.status::text AS region_price_status,
  rp.billing_platform::text AS promoted_platform,
  rp.data_quality::text AS promoted_data_quality,

  po.parser_version,
  po.observed_at,
  po.created_at,
  po.updated_at
FROM price_observations po
LEFT JOIN products p ON p.id = po.product_id
LEFT JOIN plans pl ON pl.id = po.plan_id
LEFT JOIN countries c ON c.id = po.country_id
LEFT JOIN region_prices rp ON rp.id::text = po.raw_payload ->> 'promoted_region_price_id'
WHERE po.status <> 'pending'::observation_status
ORDER BY po.updated_at DESC;