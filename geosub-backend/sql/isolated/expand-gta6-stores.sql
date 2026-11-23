-- Separate operator step after checking both pilot runs in the scheduler and review center.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('geosub.configure.gta6.hk.v1'));
DO $$
DECLARE ready_count integer;
BEGIN
    SELECT count(DISTINCT t.platform) INTO ready_count
    FROM game_offer_targets t JOIN products p ON p.id=t.product_id
    JOIN game_offer_latest_verified v ON v.target_id=t.id
    JOIN game_offer_public_state s ON s.id=t.id
    JOIN collector_job_runs r ON r.id=v.run_id
    JOIN audit_logs l ON l.target_type='game_offer_attempt' AND l.target_id=r.id AND l.action='approved'
    WHERE p.slug='gta-6' AND p.category='game' AND t.market='HK' AND t.edition='standard'
      AND t.offer_type='full_game' AND t.platform IN ('ps5','xbox')
      AND s.status='fresh' AND v.purchasable_status='available' AND r.status='succeeded'
      AND r.raw_payload->>'game_run_mode'='regular_due' AND l.actor_id IS NOT NULL AND btrim(l.note)<>'';
    IF ready_count<>2 THEN
        RAISE EXCEPTION '需要两条港服标准版的有效常规采集及人工核准记录';
    END IF;

    UPDATE collector_jobs j SET status='active', next_run_at=now(), updated_at=now(),
      job_config=j.job_config-'game_rollout_hold'
    FROM game_offer_jobs b JOIN game_offer_targets t ON t.id=b.target_id JOIN products p ON p.id=t.product_id
    WHERE j.id=b.job_id AND p.slug='gta-6' AND p.category='game'
      AND j.status='paused' AND j.job_config->'game_rollout_hold'='true'::jsonb;
END $$;
COMMIT;
