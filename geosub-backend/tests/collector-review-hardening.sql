BEGIN;
CREATE FUNCTION pg_temp.expect(ok BOOLEAN, label TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END $$;
INSERT INTO countries(code,name_zh,name_en,currency) VALUES ('US','美国','United States','USD');
INSERT INTO price_sources(source_key,name,source_level,type) VALUES ('collector-test','Test official','A','app_store');
CREATE TEMP TABLE cases(slug TEXT, offsets INTEGER[], confidence INTEGER DEFAULT 90, bad_old BOOLEAN DEFAULT FALSE, mismatch BOOLEAN DEFAULT FALSE);
INSERT INTO cases(slug,offsets) VALUES
 ('stable',ARRAY[1,13,25]), ('burst',ARRAY[1,2,3]),
 ('duplicates',ARRAY[1,1,1]), ('stale',ARRAY[361,373,385]);
INSERT INTO cases VALUES ('low-confidence-recovery',ARRAY[1,13,25],40,TRUE,FALSE),
 ('currency-recovery',ARRAY[1,13,25],90,TRUE,TRUE);
DO $$ DECLARE c RECORD; p UUID; pl UUID; i INTEGER;
BEGIN
 FOR c IN SELECT * FROM cases LOOP
  INSERT INTO products(slug,name,category,status) VALUES(c.slug,c.slug,'ai','review') RETURNING id INTO p;
  INSERT INTO plans(product_id,slug,name,status) VALUES(p,'standard','Standard','review') RETURNING id INTO pl;
  FOR i IN 1..3 LOOP
   INSERT INTO price_observations(product_id,plan_id,country_id,source_id,source_level,raw_price,currency,converted_usd,
     billing_platform,confidence_score,observed_at,anomaly_flag,status,raw_payload)
   SELECT p,pl,id,(SELECT id FROM price_sources LIMIT 1),'A',10,CASE WHEN c.mismatch THEN 'EUR' ELSE 'USD' END,10,
     'ios',c.confidence,NOW()-MAKE_INTERVAL(hours=>c.offsets[i]),c.bad_old AND i=3,'pending',
     jsonb_build_object('raw_snapshot',jsonb_build_object('originalObservedPriceText','USD 10')) FROM countries;
  END LOOP;
 END LOOP;
 INSERT INTO products(slug,name,category,status) VALUES('invideo-ai','InVideo','ai','review') RETURNING id INTO p;
 FOR c IN SELECT * FROM (VALUES('max',90,20),('generative',150,30)) v(slug,price,rank) LOOP
  INSERT INTO plans(product_id,slug,name,status,sort_order) VALUES(p,c.slug,c.slug,'review',c.rank) RETURNING id INTO pl;
  INSERT INTO price_observations(product_id,plan_id,country_id,source_id,source_level,raw_price,currency,converted_usd,
    billing_platform,confidence_score,observed_at,status)
   SELECT p,pl,id,(SELECT id FROM price_sources LIMIT 1),'A',c.price,'USD',c.price,'ios',90,
     NOW()-MAKE_INTERVAL(hours=>n),'pending' FROM countries CROSS JOIN unnest(ARRAY[1,13,25]) n;
 END LOOP;
END $$;
CREATE TEMP TABLE decisions AS SELECT * FROM run_app_store_stability_auto_review(TRUE,3,80,14);
SELECT pg_temp.expect((SELECT decision='auto_approve' FROM decisions WHERE product_slug='stable'),'independent stable samples approve');
SELECT pg_temp.expect((SELECT reason_code='waiting_for_more_app_store_samples' FROM decisions WHERE product_slug='burst'),'retry burst cannot manufacture consensus');
SELECT pg_temp.expect((SELECT reason_code='waiting_for_more_app_store_samples' FROM decisions WHERE product_slug='duplicates'),'same-time copies cannot manufacture consensus');
SELECT pg_temp.expect((SELECT reason_code='app_store_samples_too_old' FROM decisions WHERE product_slug='stale'),'stale samples blocked');
SELECT pg_temp.expect((SELECT reason_code='low_confidence' FROM decisions WHERE product_slug='low-confidence-recovery'),'clean-pair recovery respects confidence');
SELECT pg_temp.expect((SELECT reason_code='app_store_currency_mismatch' FROM decisions WHERE product_slug='currency-recovery'),'clean-pair recovery respects currency');
SELECT pg_temp.expect((SELECT count(*)=2 AND bool_and(decision='auto_approve') FROM decisions WHERE product_slug='invideo-ai'),'InVideo Max below Generative is valid');
UPDATE price_observations o SET raw_price=250,converted_usd=250 FROM plans p,products product
 WHERE p.id=o.plan_id AND product.id=o.product_id AND product.slug='invideo-ai' AND p.slug='max';
SELECT pg_temp.expect((SELECT count(*)=2 AND bool_and(reason_code='app_store_plan_order_conflict')
 FROM run_app_store_stability_auto_review(TRUE,3,80,14) WHERE product_slug='invideo-ai'),'real InVideo price inversion still blocked');
SELECT pg_temp.expect((SELECT count(*)=0 FROM region_prices),'dry run did not publish prices');
SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14);
SELECT pg_temp.expect((SELECT count(*)=1 FROM region_prices price JOIN products product ON product.id=price.product_id
 WHERE product.slug='stable' AND price.status='published' AND price.local_price=10),'approved evidence produces actual published price');
SELECT pg_temp.expect(NOT EXISTS(SELECT 1 FROM region_prices price JOIN products product ON product.id=price.product_id
 WHERE product.slug IN ('burst','duplicates','stale','low-confidence-recovery','currency-recovery','invideo-ai')),'blocked evidence produces no published price');
ROLLBACK;