-- Repeated official identity ambiguity is handled by the existing collection
-- loop. No human receipt, permanent hold, new schedule, or migration-time DML.
CREATE OR REPLACE FUNCTION recurring_app_store_identity_ambiguities(p_product_slug TEXT DEFAULT NULL)
RETURNS TABLE(region_price_id UUID, product_slug TEXT, plan_slug TEXT, country_code TEXT,
              observation_ids UUID[], oldest_at TIMESTAMPTZ, newest_at TIMESTAMPTZ)
LANGUAGE sql STABLE AS $function$
SELECT price.id AS region_price_id, product.slug AS product_slug, plan.slug AS plan_slug,
       country.code AS country_code, evidence.observation_ids,
       evidence.oldest_at, evidence.newest_at
FROM region_prices price
JOIN products product ON product.id=price.product_id
JOIN plans plan ON plan.id=price.plan_id
JOIN countries country ON country.id=price.country_id
JOIN LATERAL (
  SELECT COUNT(*) AS samples,
         BOOL_AND(sample.anomaly_flag AND POSITION('Multiple App Store prices matched this plan without a clear consensus.' IN COALESCE(sample.anomaly_reason,''))>0) AS all_ambiguous,
         MIN(sample.observed_at) AS oldest_at, MAX(sample.observed_at) AS newest_at,
         ARRAY_AGG(sample.id ORDER BY sample.observed_at DESC) AS observation_ids
  FROM (
    SELECT DISTINCT ON (observation.observed_at) observation.id, observation.observed_at,
           observation.anomaly_flag, observation.anomaly_reason
    FROM price_observations observation
    LEFT JOIN price_sources source ON source.id=observation.source_id
    WHERE observation.product_id=price.product_id AND observation.plan_id=price.plan_id
      AND observation.country_id=price.country_id AND observation.billing_platform=price.billing_platform
      AND observation.price_type=price.price_type
      AND observation.status IN ('pending','approved','ignored')
      AND (observation.source_level='A' OR source.type='app_store')
      AND observation.observed_at>COALESCE(price.last_checked_at,price.created_at)
      AND observation.observed_at>=NOW()-INTERVAL '14 days' AND observation.observed_at<=NOW()
    ORDER BY observation.observed_at DESC, observation.created_at DESC, observation.id DESC
    LIMIT 3
  ) sample
) evidence ON TRUE
WHERE (p_product_slug IS NULL OR product.slug=p_product_slug) AND price.status='published' AND price.billing_platform='ios'
  AND evidence.samples=3 AND evidence.all_ambiguous
  AND evidence.newest_at-evidence.oldest_at>=INTERVAL '24 hours';
$function$;

CREATE OR REPLACE FUNCTION reconcile_app_store_identity_ambiguities(p_product_slug TEXT)
RETURNS INTEGER
LANGUAGE plpgsql AS $function$
DECLARE
  candidate RECORD;
  before_price region_prices%ROWTYPE;
  after_price region_prices%ROWTYPE;
  changed_count INTEGER := 0;
BEGIN
  IF p_product_slug IS NULL OR BTRIM(p_product_slug)='' THEN
    RAISE EXCEPTION 'An explicit completed product slug is required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('geosub_app_store_stability_auto_review',0));
  FOR candidate IN SELECT * FROM recurring_app_store_identity_ambiguities(p_product_slug)
  LOOP
    SELECT * INTO before_price FROM region_prices WHERE id=candidate.region_price_id FOR UPDATE;
    -- Re-evaluate after obtaining the row lock: a concurrent clean publication
    -- must never be hidden using a previously selected stale candidate.
    IF NOT EXISTS(SELECT 1 FROM recurring_app_store_identity_ambiguities(p_product_slug)
                  WHERE region_price_id=before_price.id) THEN
      CONTINUE;
    END IF;
    UPDATE region_prices SET status='review',data_quality='pending_review',
      source_summary=CONCAT_WS(' ',NULLIF(source_summary,''),
        '[automatic_identity_recheck] Three successive ambiguous official observations spanning at least 24 hours; awaiting automated confirmation.'),
      updated_at=NOW()
    WHERE id=before_price.id RETURNING * INTO after_price;
    INSERT INTO audit_logs(action,target_type,target_id,old_value,new_value,note)
    VALUES('auto_quarantine_identity','region_price',before_price.id,
      TO_JSONB(before_price),TO_JSONB(after_price),
      JSONB_BUILD_OBJECT('rule','recurring_app_store_identity_ambiguity_v1',
        'observation_ids',candidate.observation_ids,
        'oldest_at',candidate.oldest_at,'newest_at',candidate.newest_at)::TEXT);
    changed_count := changed_count+1;
  END LOOP;

  -- Existing auto-review can restore clean consensus without an operator.
  -- Close only the old identity-specific tracking tickets, with new successful
  -- automatic approval evidence. Unrelated/manual review tasks are untouched.
  WITH resolved AS (
    UPDATE review_queue queue SET status='resolved',resolved_at=NOW(),updated_at=NOW(),
      note=CONCAT_WS(' ',queue.note,'Resolved by fresh App Store automatic approval; no purchase receipt required.')
    FROM region_prices price JOIN products product ON product.id=price.product_id
    WHERE product.slug=p_product_slug AND queue.target_type='region_price'
      AND queue.target_id=price.id AND queue.status='pending'
      AND queue.reason='subscription_identity_billing_cycle_unverified'
      AND price.status='published' AND price.data_quality='verified'
      AND price.billing_platform='ios' AND price.last_checked_at>queue.created_at
      AND EXISTS(SELECT 1 FROM price_observations observation
        WHERE observation.product_id=price.product_id AND observation.plan_id=price.plan_id
          AND observation.country_id=price.country_id AND observation.billing_platform=price.billing_platform
          AND observation.price_type=price.price_type AND observation.status='approved'
          AND observation.anomaly_flag=FALSE AND observation.observed_at=price.last_checked_at
          AND observation.raw_price=price.local_price AND observation.currency=price.currency
          AND observation.raw_payload->>'auto_review_decision'='auto_approve'
          AND observation.raw_payload->>'auto_review_rule'='app_store_stability')
    RETURNING queue.id,queue.target_id,queue.note
  )
  INSERT INTO audit_logs(action,target_type,target_id,new_value,note)
    SELECT 'auto_resolve_identity_review','review_queue',id,TO_JSONB(resolved),
      'Fresh automatic price consensus superseded the identity tracking ticket.' FROM resolved;

  IF changed_count>0 THEN
    PERFORM refresh_plan_affordability_metrics(p_product_slug,NULL);
  END IF;
  RETURN changed_count;
END;
$function$;
