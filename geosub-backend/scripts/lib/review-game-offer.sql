-- The caller sets geosub.game_review_run locally in a READ COMMITTED transaction.
-- Take the same target lock as manual review, then read the baseline in a new statement.
SELECT t.id FROM game_offer_attempts a
JOIN game_offer_targets t ON t.id=a.target_id
JOIN collector_jobs j ON j.id=a.job_id
WHERE a.run_id=current_setting('geosub.game_review_run')::uuid
FOR UPDATE OF t,j;

WITH candidate AS (
    SELECT a.*, t.platform, t.market, t.store_product_id, t.expected_currency,
           r.raw_payload->'game_offer' AS offer, r.raw_payload#>'{game_offer,proof}' AS proof
    FROM game_offer_attempts a
    JOIN collector_job_runs r ON r.id=a.run_id AND r.job_id=a.job_id
    JOIN game_offer_targets t ON t.id=a.target_id
    JOIN products p ON p.id=t.product_id
    JOIN collector_jobs j ON j.id=a.job_id AND j.product_id=p.id
    JOIN price_sources src ON src.id=j.source_id AND src.id=r.source_id
    WHERE a.run_id=current_setting('geosub.game_review_run')::uuid
      AND p.slug='gta-6' AND p.category='game' AND r.product_id=p.id
      AND j.status='active' AND NOT (j.job_config ? 'game_rollout_hold')
      AND a.review_status='pending' AND a.failure_reason IS NULL AND a.review_reason IS NULL
      AND r.status='succeeded' AND r.finished_at IS NOT NULL AND r.raw_payload->>'game_run_mode' IN ('regular_due','promo_recheck')
      AND r.raw_payload->>'target_id'=t.id::text
      AND src.source_key=CASE t.platform WHEN 'ps5' THEN 'playstation-store' ELSE 'xbox-store' END
      AND r.raw_payload->>'source_key'=src.source_key
      AND r.raw_payload#>>'{game_offer,parser_version}'=t.platform||'-v1'
      AND a.observed_at BETWEEN r.started_at AND least(r.finished_at,statement_timestamp())
      AND a.observed_at + CASE WHEN a.public_promotion IS FALSE THEN t.regular_ttl ELSE t.sale_ttl END > statement_timestamp()
      AND (a.promo_ends_at IS NULL OR a.promo_ends_at>statement_timestamp())
      AND (a.member_ends_at IS NULL OR a.member_ends_at>statement_timestamp())
      AND NOT EXISTS (SELECT FROM game_offer_attempts newer WHERE newer.target_id=t.id
          AND (newer.observed_at,newer.run_id)>(a.observed_at,a.run_id))
), eligible AS (
    SELECT a.run_id, v.run_id AS prior_id, human.run_id AS human_id,
           jsonb_build_object('run_id',v.run_id,'verified_at',v.verified_at,'valid_until',v.valid_until,
               'purchasable_status',v.purchasable_status,'currency',v.currency,'public_price',v.public_price::text) AS prior
    FROM candidate a
    JOIN game_offer_latest_verified v ON v.target_id=a.target_id
    JOIN audit_logs previous ON previous.target_type='game_offer_attempt' AND previous.target_id=v.run_id
      AND previous.action='approved' AND btrim(previous.note)<>''
    JOIN game_offer_attempts human ON human.target_id=a.target_id AND human.review_status='approved'
      AND ((previous.actor_id IS NOT NULL AND human.run_id=v.run_id) OR (
          previous.actor_id IS NULL AND previous.new_value->>'rule'='gta6-official-buyout-v1'
          AND previous.new_value->>'human_baseline_run_id'=human.run_id::text
          AND human.observed_at<=v.verified_at))
    JOIN audit_logs human_log ON human_log.target_type='game_offer_attempt' AND human_log.target_id=human.run_id
      AND human_log.action='approved' AND human_log.actor_id IS NOT NULL AND btrim(human_log.note)<>''
    WHERE a.purchasable_status=v.purchasable_status
      AND upper(a.proof->>'product_id')=upper(a.store_product_id)
      AND upper(split_part(a.offer->>'final_url','/',4)) LIKE '%-'||a.market
      AND upper(regexp_replace(a.offer->>'final_url','^.*/',''))=upper(a.store_product_id)
      AND CASE a.platform
        WHEN 'ps5' THEN a.offer->>'final_url' LIKE 'https://store.playstation.com/%/product/%'
          AND right(upper(a.proof->>'market_locale'),3)='-'||a.market AND (a.proof->>'cta')<>''
          AND CASE a.purchasable_status
            WHEN 'unavailable' THEN a.proof->'reasons' ? 'DONT_OWN'
            ELSE a.proof->>'reward'='OUTRIGHT' AND a.proof->'public_minor'=to_jsonb(a.public_price*100) END
        WHEN 'xbox' THEN a.offer->>'final_url' LIKE 'https://www.xbox.com/%/games/store/%/%'
          AND a.proof->>'market'=a.market AND (a.proof->>'sku')<>''
          AND CASE a.purchasable_status
            WHEN 'unavailable' THEN a.proof->>'availability' IN ('https://schema.org/OutOfStock','https://schema.org/Discontinued','https://schema.org/SoldOut')
            ELSE a.proof->>'eligibility'='None' AND (a.proof->>'availability')<>''
              AND a.proof->'public_offer'=to_jsonb(a.public_price) AND a.proof->'list'=to_jsonb(a.public_price) END
      END
      AND (a.purchasable_status='unavailable' OR (
          a.public_price>0 AND a.currency=a.expected_currency AND a.currency=v.currency
          AND a.proof->>'observed_currency'=a.currency
          AND a.public_price BETWEEN v.public_price*0.25 AND v.public_price*1.50
          AND (a.public_promotion IS FALSE OR a.public_promotion IS TRUE AND a.promo_ends_at>statement_timestamp())
      ))
      -- A fresh observation of the same rejected price still requires a human decision.
      AND NOT EXISTS (SELECT FROM game_offer_attempts rejected WHERE rejected.target_id=a.target_id
          AND rejected.review_status='rejected' AND rejected.reviewed_at>=human.reviewed_at
          AND rejected.purchasable_status=a.purchasable_status
          AND rejected.public_price IS NOT DISTINCT FROM a.public_price)
), decided AS (
    UPDATE game_offer_attempts a SET review_status='approved', reviewed_at=clock_timestamp()
    FROM eligible e WHERE a.run_id=e.run_id AND a.review_status='pending'
    RETURNING a.*,e.prior,e.prior_id,e.human_id
)
INSERT INTO audit_logs(id,actor_id,target_type,target_id,action,note,created_at,old_value,new_value)
SELECT gen_random_uuid(),NULL,'game_offer_attempt',run_id,'approved',
       '官方商品、市场与购买项证据通过自动核验，符合该商品的已核准基线。',
       reviewed_at,prior,jsonb_build_object('reviewer','系统自动审核','rule','gta6-official-buyout-v1',
           'prior_run_id',prior_id,'human_baseline_run_id',human_id,'target_id',target_id,
           'purchasable_status',purchasable_status,'currency',currency,'public_price',public_price::text)
FROM decided;
