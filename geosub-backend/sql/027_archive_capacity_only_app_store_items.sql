-- Archive standalone storage/capacity App Store IAP items that were mistaken for subscription plans.
-- Keep real subscription plan names that include capacity as a benefit, e.g. "Google AI Pro (5 TB)".

WITH capacity_only_plans AS (
  SELECT p.id
  FROM plans p
  WHERE (
      p.name ~* '^\s*[0-9]+(\.[0-9]+)?\s?(GB|TB|GiB|TiB|T)\s*$'
      OR p.slug ~* '^[0-9]+-(gb|tb|gib|tib|t)$'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM region_prices rp
      WHERE rp.plan_id = p.id
        AND rp.status = 'published'::publish_status
    )
)
UPDATE price_observations po
SET status = 'ignored'::observation_status,
    anomaly_flag = TRUE,
    raw_payload = COALESCE(po.raw_payload, '{}'::jsonb)
      || jsonb_build_object('cleanup_note', 'Ignored capacity-only App Store item; not a subscription plan.'),
    updated_at = NOW()
FROM capacity_only_plans cp
WHERE po.plan_id = cp.id
  AND po.status = 'pending'::observation_status;

WITH capacity_only_plans AS (
  SELECT p.id
  FROM plans p
  WHERE (
      p.name ~* '^\s*[0-9]+(\.[0-9]+)?\s?(GB|TB|GiB|TiB|T)\s*$'
      OR p.slug ~* '^[0-9]+-(gb|tb|gib|tib|t)$'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM region_prices rp
      WHERE rp.plan_id = p.id
        AND rp.status = 'published'::publish_status
    )
)
UPDATE plans p
SET status = 'archived'::publish_status,
    updated_at = NOW()
FROM capacity_only_plans cp
WHERE p.id = cp.id
  AND p.status <> 'archived'::publish_status;
