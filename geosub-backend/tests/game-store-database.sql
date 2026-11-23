-- Run in an isolated database with the HK/US catalog registered. Changes roll back.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(value boolean, diagnostic text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'Game store regression: %', diagnostic; END IF;
END $$;
CREATE FUNCTION pg_temp.capture(job uuid, stamp timestamptz, fields jsonb) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE run uuid;
BEGIN
    INSERT INTO collector_job_runs(job_id, status, raw_payload)
    VALUES(job, CASE WHEN fields ? 'failure_reason' THEN 'failed' ELSE 'succeeded' END,
           jsonb_build_object('game_offer', fields || jsonb_build_object('observed_at',stamp)))
    RETURNING id INTO run;
    RETURN run;
END $$;
DO $$
DECLARE
    x uuid;
    ps uuid;
    job uuid;
    public_offer jsonb := '{"purchasable_status":"available","public_price":"568.00","base_price":"568.00","currency":"HKD","public_promotion":false}';
    sale jsonb;
    run uuid;
    claim record;
    other record;
    cutoff timestamptz := now() - interval '6 minutes';
    baseline jsonb;
    other_offers jsonb;
BEGIN
    SELECT t.id,b.job_id INTO STRICT x,job FROM game_offer_targets t JOIN game_offer_jobs b ON b.target_id=t.id
      JOIN products p ON p.id=t.product_id WHERE p.slug='gta-6' AND t.platform='xbox' AND t.market='HK' AND t.edition='standard';
    SELECT t.id INTO STRICT ps FROM game_offer_targets t JOIN products p ON p.id=t.product_id
      WHERE p.slug='gta-6' AND t.platform='ps5' AND t.market='HK' AND t.edition='standard';
    SELECT to_jsonb(s) INTO baseline FROM game_offer_public_state s WHERE id=ps;
    SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) INTO other_offers FROM game_offer_public_state s
      WHERE s.id<>x AND product_id=(SELECT product_id FROM game_offer_targets WHERE id=x);
    PERFORM pg_temp.assert_true(jsonb_array_length(other_offers)=11,'expected seven other editions/markets and four upgrades');
    -- Work with independent times even when this test follows a live smoke collection.
    DELETE FROM game_offer_attempts WHERE target_id=x;
    DELETE FROM game_promo_rechecks WHERE target_id=x;
    run := pg_temp.capture(job, now()-interval '3 hours', public_offer);
    PERFORM pg_temp.assert_true((SELECT status='never_verified' AND price IS NULL FROM game_offer_public_state WHERE id=x),'pending leaked');
    UPDATE game_offer_attempts SET review_status='approved',reviewed_at=now() WHERE run_id=run;
    PERFORM pg_temp.assert_true((SELECT status='fresh' AND price->>'public_price'='568.00' FROM game_offer_public_state WHERE id=x),'approved value missing');
    PERFORM pg_temp.capture(job, now()-interval '2 hours', '{"failure_reason":"region_mismatch"}');
    PERFORM pg_temp.assert_true((SELECT status='stale_grace' AND verified_at=now()-interval '3 hours' FROM game_offer_public_state WHERE id=x),'failure changed verification time');
    sale := public_offer || jsonb_build_object('public_price','100.00','public_promotion',true,'promo_ends_at',cutoff);
    run := pg_temp.capture(job, now()-interval '1 hour',sale);
    PERFORM pg_temp.assert_true((SELECT review_status='pending' AND review_reason='price_jump' FROM game_offer_attempts WHERE run_id=run),'price jump review');
    UPDATE game_offer_attempts SET review_status='approved',reviewed_at=now() WHERE run_id=run;
    UPDATE collector_job_runs SET raw_payload=raw_payload WHERE id=run;
    UPDATE game_offer_attempts SET review_status='approved' WHERE run_id=run;
    PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM game_promo_rechecks WHERE target_id=x),'duplicate expiry event');
    PERFORM pg_temp.assert_true((SELECT status='stale_expired' AND valid_until=cutoff AND price IS NULL FROM game_offer_public_state WHERE id=x),'expired discount visible');
    SELECT * INTO STRICT claim FROM claim_game_promo_recheck();
    PERFORM pg_temp.assert_true(claim.job_id=job,'promo claim job');
    SELECT * INTO other FROM claim_game_promo_recheck();
    PERFORM pg_temp.assert_true(other.token IS NULL,'double claim');
    PERFORM finish_game_promo_recheck(gen_random_uuid(),true);
    PERFORM pg_temp.assert_true((SELECT status='running' FROM game_promo_rechecks WHERE target_id=x),'stale worker completed claim');
    PERFORM finish_game_promo_recheck(claim.token,false);
    PERFORM pg_temp.assert_true((SELECT status='queued' AND due_at=now()+interval '5 minutes' FROM game_promo_rechecks WHERE target_id=x),'retry backoff');
    UPDATE game_promo_rechecks SET due_at=now() WHERE target_id=x;
    SELECT * INTO STRICT claim FROM claim_game_promo_recheck();
    UPDATE game_promo_rechecks SET lease_until=now()-interval '1 second' WHERE target_id=x;
    SELECT * INTO STRICT other FROM claim_game_promo_recheck();
    PERFORM pg_temp.assert_true(other.token<>claim.token,'expired lease not fenced');
    PERFORM finish_game_promo_recheck(other.token,false);
    PERFORM pg_temp.assert_true((SELECT status='exhausted' AND attempts=3 FROM game_promo_rechecks WHERE target_id=x),'retry limit');
    run := pg_temp.capture(job,now()-interval '3 minutes',public_offer || jsonb_build_object('tax_included',true));
    UPDATE game_offer_attempts SET review_status='approved',reviewed_at=now() WHERE run_id=run;
    PERFORM pg_temp.assert_true((SELECT status='fresh' AND price->>'public_price'='568.00' AND tax_included FROM game_offer_public_state WHERE id=x),'recovered public price');
    run := pg_temp.capture(job,now()-interval '3 days',sale || jsonb_build_object('tax_included',false));
    UPDATE game_offer_attempts SET review_status='approved',reviewed_at=now() WHERE run_id=run;
    PERFORM pg_temp.assert_true((SELECT price->>'public_price'='568.00' AND tax_included FROM game_offer_public_state WHERE id=x),'late approval replaced newer sample');
    run := pg_temp.capture(job,now()-interval '2 minutes',sale || jsonb_build_object('promo_ends_at',now()+interval '2 hours'));
    UPDATE game_offer_attempts SET review_status='approved',reviewed_at=now() WHERE run_id=run;
    run := pg_temp.capture(job,now()-interval '1 minute',sale || jsonb_build_object('promo_ends_at',now()+interval '3 hours'));
    UPDATE game_offer_attempts SET review_status='approved',reviewed_at=now() WHERE run_id=run;
    PERFORM pg_temp.assert_true((SELECT status='superseded' FROM game_promo_rechecks WHERE target_id=x AND promo_ends_at=now()+interval '2 hours'),'extended promotion left old event');
    run := pg_temp.capture(job,now(),'{"purchasable_status":"unavailable"}');
    UPDATE game_offer_attempts SET review_status='approved',reviewed_at=now() WHERE run_id=run;
    PERFORM pg_temp.assert_true((SELECT status='unavailable' AND price IS NULL FROM game_offer_public_state WHERE id=x),'unavailable retained price');
    PERFORM pg_temp.assert_true((SELECT baseline=to_jsonb(s) FROM game_offer_public_state s WHERE id=ps),'Xbox writes changed PS5');
    PERFORM pg_temp.assert_true((SELECT other_offers=jsonb_agg(to_jsonb(s) ORDER BY s.id)
      FROM game_offer_public_state s WHERE s.id<>x AND product_id=(SELECT product_id FROM game_offer_targets WHERE id=x)),
      'Xbox HK standard writes changed a different edition, market, platform or upgrade');
END $$;
ROLLBACK;
