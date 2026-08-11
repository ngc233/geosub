-- GeoSub backfill migration. Split from sql/074_repair_hbo_max_app_store_selection.sql; see migration-layout.json.

-- Repair HBO Max observations that were falsely isolated when App Store pages
-- listed monthly, annual, legacy and sports tiers together. Source evidence is
-- retained: non-core and superseded rows become ignored rather than deleted.

WITH ranked_core_observations AS (
  SELECT
    observation.id,
    ROW_NUMBER() OVER (
      PARTITION BY
        observation.product_id,
        observation.plan_id,
        observation.country_id,
        observation.billing_platform,
        observation.price_type,
        observation.currency,
        observation.raw_price,
        LOWER(TRIM(observation.raw_payload ->> 'item_name'))
      ORDER BY observation.observed_at DESC, observation.created_at DESC
    ) AS evidence_rank
  FROM price_observations observation
  JOIN products product ON product.id = observation.product_id
  JOIN plans plan ON plan.id = observation.plan_id
  WHERE product.slug = 'hbo-max'
    AND observation.billing_platform = 'ios'::billing_platform
    AND observation.status = 'pending'::observation_status
    AND observation.anomaly_flag = TRUE
    AND observation.anomaly_reason =
      'Multiple App Store prices matched this plan without a clear consensus. This may indicate monthly/yearly or tier parsing ambiguity.'
    AND COALESCE(
      NULLIF(
        observation.raw_payload #>> '{raw_snapshot,priceSelection,expectedFitPenalty}',
        ''
      )::NUMERIC,
      1
    ) = 0
    AND observation.raw_price IS NOT DISTINCT FROM NULLIF(
      observation.raw_payload #>> '{raw_snapshot,priceSelection,selectedRawPrice}',
      ''
    )::NUMERIC
    AND (
      (plan.slug = 'standard' AND LOWER(TRIM(observation.raw_payload ->> 'item_name')) = 'standard')
      OR
      (plan.slug = 'premium' AND LOWER(TRIM(observation.raw_payload ->> 'item_name')) = 'premium')
      OR
      (
        plan.slug = 'basic-with-ads'
        AND LOWER(TRIM(observation.raw_payload ->> 'item_name')) IN (
          'basic with ads',
          'basic with ads monthly'
        )
      )
    )
),
ignored_duplicate_evidence AS (
  UPDATE price_observations observation
  SET
    status = 'ignored'::observation_status,
    raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb)
      || jsonb_build_object(
        'previous_auto_review_reason_code',
          observation.raw_payload ->> 'auto_review_reason_code',
        'auto_review_action', 'ignored',
        'auto_review_reason_code', 'superseded_hbo_max_selection_evidence',
        'auto_review_reason',
          'A newer set of three identical HBO Max App Store samples retained the same core monthly tier.',
        'auto_closed_at', NOW()::TEXT
      ),
    updated_at = NOW()
  FROM ranked_core_observations ranked
  WHERE observation.id = ranked.id
    AND ranked.evidence_rank > 3
  RETURNING observation.id
)
UPDATE price_observations observation
SET
  anomaly_flag = FALSE,
  anomaly_reason = NULL,
  raw_payload = (
      ((((COALESCE(observation.raw_payload, '{}'::jsonb)
        - 'anomaly_reason')
        - 'review_note')
        - 'auto_review_decision')
        - 'auto_review_reason_code')
        - 'auto_review_reason'
    ) || jsonb_build_object(
      'rule_reclassification',
      jsonb_build_object(
        'rule', 'hbo_max_lowest_core_monthly_tier_v2',
        'previous_reason',
          'Multiple App Store prices matched this plan without a clear consensus.',
        'reclassified_at', NOW()
      )
    ),
  updated_at = NOW()
FROM ranked_core_observations ranked
WHERE observation.id = ranked.id
  AND ranked.evidence_rank <= 3;

UPDATE price_observations observation
SET
  status = 'ignored'::observation_status,
  raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb)
    || jsonb_build_object(
      'previous_auto_review_reason_code',
        observation.raw_payload ->> 'auto_review_reason_code',
      'auto_review_action', 'ignored',
      'auto_review_reason_code', 'hbo_max_non_core_tier_match',
      'auto_review_reason',
        'The App Store item is a legacy, sports or bundled HBO Max tier and is not a core monthly plan.',
      'auto_closed_at', NOW()::TEXT
    ),
  updated_at = NOW()
FROM products product, plans plan
WHERE observation.product_id = product.id
  AND observation.plan_id = plan.id
  AND product.slug = 'hbo-max'
  AND observation.billing_platform = 'ios'::billing_platform
  AND observation.status = 'pending'::observation_status
  AND observation.anomaly_flag = TRUE
  AND observation.anomaly_reason =
    'Multiple App Store prices matched this plan without a clear consensus. This may indicate monthly/yearly or tier parsing ambiguity.'
  AND LOWER(COALESCE(observation.raw_payload ->> 'item_name', '')) ~
    '(legacy|old|antes|antigu|sport|deport|dazn|tnt)';
