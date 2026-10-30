INSERT INTO countries(code,name_zh,name_en,currency) VALUES('US','美国','United States','USD');
INSERT INTO products(id,slug,name,category,status)
 VALUES('11111111-1111-4111-8111-111111111111','repair-fixture','Repair fixture','ai','review');
INSERT INTO price_sources(source_key,name,source_level,type) VALUES('repair-fixture','Test official','A','app_store');
DO $$ DECLARE c RECORD; pl UUID; observed TIMESTAMPTZ; checked TIMESTAMPTZ;
BEGIN
 FOR c IN SELECT unnest(ARRAY['fixed','pending','wrong-amount','wrong-currency','web-only',
   'stale','isolated','estimated','future','no-price']) AS slug LOOP
  INSERT INTO plans(product_id,slug,name,status)
   VALUES('11111111-1111-4111-8111-111111111111',c.slug,c.slug,'review') RETURNING id INTO pl;
  observed := CASE c.slug WHEN 'stale' THEN NOW()-INTERVAL '31 days'
    WHEN 'future' THEN NOW()+INTERVAL '1 hour' ELSE NOW()-INTERVAL '1 hour' END;
  checked := CASE c.slug WHEN 'stale' THEN NOW()-INTERVAL '30 days'
    WHEN 'future' THEN NOW()+INTERVAL '2 hours' ELSE NOW() END;
  INSERT INTO price_observations(product_id,plan_id,country_id,source_id,source_level,raw_price,currency,
    converted_usd,billing_platform,confidence_score,observed_at,status,anomaly_flag,raw_payload)
   SELECT '11111111-1111-4111-8111-111111111111',pl,id,(SELECT id FROM price_sources LIMIT 1),'A',
    CASE c.slug WHEN 'wrong-amount' THEN 11 ELSE 10 END,
    CASE c.slug WHEN 'wrong-currency' THEN 'EUR' ELSE 'USD' END,
    10,'ios',90,observed,
    CASE c.slug WHEN 'pending' THEN 'pending'::observation_status
      WHEN 'isolated' THEN 'ignored'::observation_status ELSE 'approved'::observation_status END,
    c.slug='isolated','{}'::jsonb FROM countries;
  IF c.slug<>'no-price' THEN
   INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,
     billing_platform,status,data_quality,last_checked_at)
    SELECT '11111111-1111-4111-8111-111111111111',pl,id,10,'USD',10,
     CASE c.slug WHEN 'web-only' THEN 'web'::billing_platform ELSE 'ios'::billing_platform END,
     'published',CASE c.slug WHEN 'estimated' THEN 'estimated'::data_quality ELSE 'verified'::data_quality END,
     checked FROM countries;
  END IF;
 END LOOP;
END $$;