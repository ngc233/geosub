UPDATE plans plan
SET
  status = 'archived',
  updated_at = NOW()
WHERE plan.status = 'published'
  AND (
    plan.slug ~* '(credit|credits|coin|coins|token|tokens|point|points|pack|bundle|top-up|one-time)'
    OR plan.name ~* '(credit|credits|coin|coins|token|tokens|point|points|pack|bundle|top[- ]?up|one[- ]?time)'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM region_prices price
    WHERE price.plan_id = plan.id
      AND price.status = 'published'
  );
