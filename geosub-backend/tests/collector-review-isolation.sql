BEGIN;
CREATE FUNCTION pg_temp.expect(ok BOOLEAN, label TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END $$;
INSERT INTO countries(code,name_zh,name_en,currency) VALUES ('US','美国','United States','USD') ON CONFLICT DO NOTHING;
INSERT INTO price_sources(source_key,name,source_level,type) VALUES ('review-isolation-test','Test','A','app_store');
DO $$ DECLARE p UUID; pl UUID; name TEXT; i INTEGER; observation UUID;
BEGIN
  FOREACH name IN ARRAY ARRAY['a-poison','b-fault','c-healthy','d-anomaly'] LOOP
    INSERT INTO products(slug,name,category,status) VALUES(name,name,'ai','review') RETURNING id INTO p;
    INSERT INTO plans(product_id,slug,name,status) VALUES(p,'standard','Standard','review') RETURNING id INTO pl;
    FOR i IN 1..3 LOOP
      INSERT INTO price_observations(product_id,plan_id,country_id,source_id,source_level,
        raw_price,currency,converted_usd,billing_platform,confidence_score,observed_at,anomaly_flag,status)
      SELECT p,pl,id,(SELECT id FROM price_sources WHERE source_key='review-isolation-test'),'A',
        CASE WHEN name='a-poison' AND i=3 THEN 19 ELSE 99 END,'USD',
        CASE WHEN name='a-poison' AND i=3 THEN 19 ELSE 99 END,'ios',90,
        NOW()-MAKE_INTERVAL(hours=>i*12),name='d-anomaly' OR (name='a-poison' AND i=3),
        CASE WHEN name='a-poison' AND i=2 THEN 'approved'::observation_status ELSE 'pending'::observation_status END
      FROM countries WHERE code='US' RETURNING id INTO observation;
      IF name='a-poison' AND i=1 THEN PERFORM approve_price_observation(observation); END IF;
    END LOOP;
  END LOOP;
END $$;
-- Fail after the first approval in this group, proving partial writes roll back.
CREATE FUNCTION pg_temp.fail_group_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM products WHERE id=NEW.product_id AND slug='b-fault') THEN
    RAISE EXCEPTION 'Injected group fault' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER isolation_test BEFORE UPDATE ON region_prices FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_group_update();
CREATE TEMP TABLE results AS SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14);
SELECT pg_temp.expect((SELECT reason_code='app_store_review_failed' FROM results WHERE product_slug='b-fault'),'fault is reported for its own group');
SELECT pg_temp.expect((SELECT count(*)=1 FROM region_prices r JOIN products p ON p.id=r.product_id
  WHERE p.slug='c-healthy' AND r.status='published'),'healthy group commits despite unrelated failure');
SELECT pg_temp.expect(NOT EXISTS(SELECT 1 FROM region_prices r JOIN products p ON p.id=r.product_id WHERE p.slug='b-fault'),'partial group publication rolls back');
SELECT pg_temp.expect((SELECT count(*)=3 FROM price_observations o JOIN products p ON p.id=o.product_id WHERE p.slug='b-fault' AND o.status='pending'),'partial approvals roll back');
SELECT pg_temp.expect((SELECT local_price=99 FROM region_prices r JOIN products p ON p.id=r.product_id WHERE p.slug='a-poison'),'already approved latest price is preserved');
SELECT pg_temp.expect(NOT EXISTS(SELECT 1 FROM price_observations o JOIN products p ON p.id=o.product_id
  WHERE p.slug='a-poison' AND o.raw_price=19 AND o.status='approved'),'old anomaly is never approved');
SELECT pg_temp.expect((SELECT count(*)=3 FROM price_observations o JOIN products p ON p.id=o.product_id WHERE p.slug='d-anomaly' AND o.status='pending'),'unresolved real anomalies stay pending');
CREATE TEMP TABLE repeated AS SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14);
SELECT pg_temp.expect((SELECT auto_approved_count=0 FROM price_auto_review_runs WHERE id=(SELECT run_id FROM repeated LIMIT 1)),
  'repeat run does not count existing approvals');
DROP TRIGGER isolation_test ON region_prices;
SELECT * FROM run_app_store_stability_auto_review(FALSE,3,80,14);
SELECT pg_temp.expect((SELECT count(*)=1 FROM region_prices r JOIN products p ON p.id=r.product_id WHERE p.slug='b-fault' AND r.status='published'),'failed group recovers without recollection');
ROLLBACK;
