-- Preserve Suno price history while converging the active App Store catalog on
-- the observed Basic, Pro and Premier subscription tiers.

BEGIN;

DO $$
DECLARE
  suno_product_id UUID;
  premier_id UUID;
  premier_plan_id UUID;
  premier_evidence_count BIGINT;
BEGIN
  SELECT id
  INTO suno_product_id
  FROM products
  WHERE slug = 'suno';

  IF suno_product_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id
  INTO premier_id
  FROM plans
  WHERE product_id = suno_product_id
    AND slug = 'premier';

  SELECT id
  INTO premier_plan_id
  FROM plans
  WHERE product_id = suno_product_id
    AND slug = 'premier-plan';

  IF premier_plan_id IS NULL AND premier_id IS NOT NULL THEN
    UPDATE plans
    SET slug = 'premier-plan',
        name = 'Suno Premier',
        billing_cycle = 'monthly'::billing_cycle,
        sort_order = 30,
        updated_at = NOW()
    WHERE id = premier_id;

    premier_plan_id := premier_id;
  ELSIF premier_plan_id IS NOT NULL AND premier_id IS NOT NULL THEN
    SELECT
      (SELECT COUNT(*) FROM region_prices WHERE plan_id = premier_id) +
      (SELECT COUNT(*) FROM price_observations WHERE plan_id = premier_id)
    INTO premier_evidence_count;

    IF premier_evidence_count > 0 THEN
      RAISE EXCEPTION
        'Cannot archive Suno premier placeholder: % price records still reference it.',
        premier_evidence_count;
    END IF;

    UPDATE plans
    SET status = 'archived'::publish_status,
        description = 'Superseded empty catalog placeholder; retained for migration history.',
        sort_order = 990,
        updated_at = NOW()
    WHERE id = premier_id;
  END IF;

  INSERT INTO plans (
    id, product_id, slug, name, billing_cycle, status, sort_order,
    created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), suno_product_id, 'basic', 'Suno Basic',
    'monthly'::billing_cycle, 'review'::publish_status, 10,
    NOW(), NOW()
  )
  ON CONFLICT (product_id, slug) DO UPDATE
  SET name = EXCLUDED.name,
      billing_cycle = EXCLUDED.billing_cycle,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW();

  UPDATE plans
  SET name = 'Suno Pro',
      billing_cycle = 'monthly'::billing_cycle,
      sort_order = 20,
      updated_at = NOW()
  WHERE product_id = suno_product_id
    AND slug = 'pro';

  UPDATE plans
  SET name = 'Suno Premier',
      billing_cycle = 'monthly'::billing_cycle,
      sort_order = 30,
      updated_at = NOW()
  WHERE product_id = suno_product_id
    AND slug = 'premier-plan';
END
$$;

COMMIT;
