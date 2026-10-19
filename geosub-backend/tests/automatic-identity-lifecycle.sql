-- Run in an empty isolated database with the migration prerequisites loaded.
BEGIN;
CREATE FUNCTION pg_temp.expect(ok BOOLEAN, label TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
INSERT INTO countries(code,name_zh,name_en,currency) VALUES('US','美国','United States','USD');
INSERT INTO price_sources(source_key,name,source_level,type) VALUES('identity-test','Official test','A','app_store');
CREATE TEMP TABLE cases(name TEXT, offsets INTEGER[], ambiguous BOOLEAN[], platform TEXT DEFAULT 'ios', trusted BOOLEAN DEFAULT TRUE, reason TEXT DEFAULT 'Multiple App Store prices matched this plan without a clear consensus. This may indicate monthly/yearly or tier parsing ambiguity.', observation_state TEXT DEFAULT 'pending', checked_days INT DEFAULT 10);
INSERT INTO cases(name,offsets,ambiguous) VALUES
 ('recurring',ARRAY[72,48,24],ARRAY[TRUE,TRUE,TRUE]),
 ('single',ARRAY[24],ARRAY[TRUE]),
 ('burst',ARRAY[3,2,1],ARRAY[TRUE,TRUE,TRUE]),
 ('clean-latest',ARRAY[72,48,24],ARRAY[TRUE,TRUE,FALSE]),
 ('duplicates',ARRAY[48,48,48],ARRAY[TRUE,TRUE,TRUE]),
 ('future',ARRAY[-3,-2,-1],ARRAY[TRUE,TRUE,TRUE]),
 ('old',ARRAY[480,456,432],ARRAY[TRUE,TRUE,TRUE]),
 ('other-product',ARRAY[72,48,24],ARRAY[TRUE,TRUE,TRUE]);
INSERT INTO cases(name,offsets,ambiguous,platform) VALUES('web',ARRAY[72,48,24],ARRAY[TRUE,TRUE,TRUE],'web');
INSERT INTO cases(name,offsets,ambiguous,trusted) VALUES('untrusted',ARRAY[72,48,24],ARRAY[TRUE,TRUE,TRUE],FALSE);
INSERT INTO cases(name,offsets,ambiguous,reason) VALUES('different-anomaly',ARRAY[72,48,24],ARRAY[TRUE,TRUE,TRUE],'Network error');
INSERT INTO cases(name,offsets,ambiguous,observation_state) VALUES('ignored',ARRAY[72,48,24],ARRAY[TRUE,TRUE,TRUE],'ignored');
INSERT INTO cases(name,offsets,ambiguous,checked_days) VALUES('newer-price',ARRAY[72,48,24],ARRAY[TRUE,TRUE,TRUE],0);
DO $$ DECLARE c RECORD; p UUID; pl UUID; i INTEGER;
BEGIN
 FOR c IN SELECT * FROM cases LOOP
  INSERT INTO products(slug,name,category,status) VALUES(c.name,c.name,'streaming','published') RETURNING id INTO p;
  INSERT INTO plans(product_id,slug,name,status) VALUES(p,'standard','Standard','published') RETURNING id INTO pl;
  INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,status,data_quality,last_checked_at)
   SELECT p,pl,id,10,'USD',10,c.platform::billing_platform,'published','verified',NOW()-MAKE_INTERVAL(days=>c.checked_days) FROM countries;
  FOR i IN 1..ARRAY_LENGTH(c.offsets,1) LOOP
   INSERT INTO price_observations(product_id,plan_id,country_id,source_id,source_level,raw_price,currency,converted_usd,billing_platform,confidence_score,observed_at,anomaly_flag,anomaly_reason,status)
   SELECT p,pl,id,CASE WHEN c.trusted THEN (SELECT id FROM price_sources LIMIT 1) END,
    CASE WHEN c.trusted THEN 'A'::source_level ELSE 'C'::source_level END,
    9,'USD',9,c.platform::billing_platform,90,NOW()-MAKE_INTERVAL(hours=>c.offsets[i]),c.ambiguous[i],
    CASE WHEN c.ambiguous[i] THEN c.reason END,c.observation_state::observation_status FROM countries;
  END LOOP;
 END LOOP;
END $$;
SELECT pg_temp.expect((SELECT ARRAY_AGG(product_slug ORDER BY product_slug) FROM recurring_app_store_identity_ambiguities())=ARRAY['ignored','other-product','recurring'], '13 scenarios: repeated ambiguity only; single/burst/clean/duplicates/future/old/platform/source/date excluded');
SELECT pg_temp.expect((SELECT COUNT(*) FROM audit_logs)=0,'preview is read-only');
CREATE TEMP TABLE before_prices AS SELECT * FROM region_prices;
SELECT pg_temp.expect(reconcile_app_store_identity_ambiguities('recurring')=1,'automatic quarantine');
SELECT pg_temp.expect((SELECT region_prices.status='review' AND data_quality='pending_review' AND local_price=10 AND last_checked_at=NOW()-INTERVAL '10 days' FROM region_prices JOIN products ON products.id=region_prices.product_id WHERE products.slug='recurring'),'preserve historical amount/date and hide unconfirmed price');
SELECT pg_temp.expect(NOT EXISTS(SELECT 1 FROM region_prices r JOIN before_prices b ON b.id=r.id JOIN products p ON p.id=r.product_id WHERE p.slug<>'recurring' AND TO_JSONB(r)<>TO_JSONB(b)),'unrelated products unchanged');
SELECT pg_temp.expect(reconcile_app_store_identity_ambiguities('recurring')=0,'idempotent retry');
SELECT pg_temp.expect((SELECT COUNT(*)=1 AND BOOL_AND(JSONB_ARRAY_LENGTH(note::jsonb->'observation_ids')=3) FROM audit_logs WHERE action='auto_quarantine_identity'),'audit includes three observation IDs, no duplicate quarantine');
DO $$ BEGIN
 BEGIN PERFORM reconcile_app_store_identity_ambiguities(NULL);RAISE EXCEPTION 'missing explicit slug rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'An explicit completed product slug is required' THEN RAISE; END IF; END;
END $$;
-- Track legacy identity ticket and an unrelated ticket; clean auto-approval
-- must resolve only the identity ticket, without a human receipt.
INSERT INTO review_queue(target_type,target_id,reason,status,created_at)
 SELECT 'region_price',r.id,reason,'pending',NOW()-INTERVAL '12 hours'
 FROM region_prices r JOIN products p ON p.id=r.product_id
 CROSS JOIN (VALUES('subscription_identity_billing_cycle_unverified'),('unrelated_review')) x(reason)
 WHERE p.slug='recurring';
INSERT INTO price_observations(product_id,plan_id,country_id,source_id,source_level,raw_price,currency,converted_usd,billing_platform,confidence_score,observed_at,anomaly_flag,status)
 SELECT r.product_id,r.plan_id,r.country_id,(SELECT id FROM price_sources LIMIT 1),'A',9,'USD',9,'ios',90,NOW()-MAKE_INTERVAL(hours=>n),FALSE,'pending'
 FROM region_prices r JOIN products p ON p.id=r.product_id CROSS JOIN generate_series(1,3) n WHERE p.slug='recurring';
SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14);
SELECT reconcile_app_store_identity_ambiguities('recurring');
SELECT pg_temp.expect((SELECT r.status='published' AND r.data_quality='verified' AND r.local_price=9 FROM region_prices r JOIN products p ON p.id=r.product_id WHERE p.slug='recurring'),'real existing automatic reviewer restores clean price without human approval');
SELECT pg_temp.expect((SELECT status='resolved' FROM review_queue WHERE reason='subscription_identity_billing_cycle_unverified'),'legacy identity ticket automatically closes on fresh auto-approval');
SELECT pg_temp.expect((SELECT status='pending' FROM review_queue WHERE reason='unrelated_review'),'unrelated review ticket remains pending');
SELECT pg_temp.expect((SELECT COUNT(*)=1 FROM audit_logs WHERE action='auto_resolve_identity_review'),'resolution audited');
ROLLBACK;
