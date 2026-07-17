-- Ignore legacy Manus Pro tier candidates that were inserted before the
-- collector could select the product's declared lowest valid monthly tier.
-- Evidence is retained, but these rows must never enter stability approval.

UPDATE price_observations observation
SET
  status = 'ignored'::observation_status,
  anomaly_flag = TRUE,
  anomaly_reason = 'Superseded non-primary App Store tier captured before plan-level price selection was available.',
  raw_payload = observation.raw_payload ||
    jsonb_build_object(
      'auto_review_action', 'ignored',
      'auto_review_reason_code', 'superseded_non_primary_app_store_tier',
      'auto_review_note', 'Retained as source evidence; excluded from publication because this product uses its lowest valid monthly tier.',
      'auto_reviewed_at', NOW()
    ),
  updated_at = NOW()
FROM products product, plans plan
WHERE observation.product_id = product.id
  AND observation.plan_id = plan.id
  AND product.slug = 'manus'
  AND plan.slug = 'pro'
  AND observation.billing_platform = 'ios'::billing_platform
  AND observation.status = 'pending'::observation_status
  AND observation.raw_payload->>'item_name' = 'Manus Pro'
  AND observation.converted_usd > 140.0 * 1.03;

