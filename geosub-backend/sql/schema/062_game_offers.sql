-- Official game store observations, decision-gated prices and promo rechecks.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE game_offer_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id),
    platform text NOT NULL CHECK (platform IN ('ps5', 'xbox')),
    market text NOT NULL REFERENCES countries(code),
    edition text NOT NULL CHECK (edition IN ('standard', 'ultimate')),
    offer_type text NOT NULL CHECK (offer_type IN ('full_game', 'upgrade')),
    store_product_id text NOT NULL CHECK (btrim(store_product_id) <> ''),
    store_url text NOT NULL CHECK (store_url LIKE 'https://%'),
    expected_currency text NOT NULL CHECK (expected_currency ~ '^[A-Z]{3}$'),
    regular_ttl interval NOT NULL DEFAULT interval '7 days' CHECK (regular_ttl > interval '0'),
    sale_ttl interval NOT NULL DEFAULT interval '24 hours' CHECK (sale_ttl > interval '0'),
    UNIQUE (product_id, platform, market, edition, offer_type),
    UNIQUE (platform, market, store_product_id)
);

-- 一个商店任务只绑定一个目标。任务替换时保留旧绑定，便于追溯已运行的任务。
CREATE TABLE game_offer_jobs (
    job_id uuid PRIMARY KEY REFERENCES collector_jobs(id),
    target_id uuid NOT NULL REFERENCES game_offer_targets(id),
    UNIQUE (job_id, target_id)
);

-- 让数据库能校验观测确实来自该任务的 run。现有主键 id 已保证该组合唯一。
CREATE UNIQUE INDEX game_collector_runs_job_id_id_idx ON collector_job_runs (job_id, id);

-- 每次完成的尝试写一行。重复落库使用 run_id 幂等。失败行只保存诊断，
-- 证据快照位于 collector_job_runs.raw_payload，包含最终 URL、市场、商品、
-- 币种、购买项定位、解析器版本及原因。解析成功后默认由写入方显式提交 pending。
CREATE TABLE game_offer_attempts (
    run_id uuid PRIMARY KEY,
    job_id uuid NOT NULL,
    target_id uuid NOT NULL,
    observed_at timestamptz NOT NULL,
    failure_reason text CHECK (failure_reason IN
        ('timeout', 'fetch_error', 'region_mismatch', 'sku_mismatch', 'currency_mismatch',
         'missing_evidence', 'parse_ambiguous', 'parse_error')),
    review_status text CHECK (review_status IN ('pending', 'approved', 'rejected')),
    review_reason text,
    reviewed_at timestamptz,
    purchasable_status text CHECK (purchasable_status IN ('available', 'unavailable')),
    currency text CHECK (currency ~ '^[A-Z]{3}$'),
    base_price numeric(14,2) CHECK (base_price >= 0),
    public_price numeric(14,2) CHECK (public_price >= 0),
    member_price numeric(14,2) CHECK (member_price >= 0),
    member_tier text CHECK (btrim(member_tier) <> ''),
    member_ends_at timestamptz,
    included_in_subscription boolean,
    tax_included boolean,
    public_promotion boolean,
    promo_ends_at timestamptz,
    FOREIGN KEY (job_id, target_id) REFERENCES game_offer_jobs(job_id, target_id),
    FOREIGN KEY (job_id, run_id) REFERENCES collector_job_runs(job_id, id),
    CHECK ((failure_reason IS NULL) = (review_status IS NOT NULL)),
    CHECK ((failure_reason IS NULL) = (purchasable_status IS NOT NULL)),
    CHECK ((review_status IS NOT DISTINCT FROM 'approved' OR review_status IS NOT DISTINCT FROM 'rejected')
           = (reviewed_at IS NOT NULL)),
    CHECK (reviewed_at >= observed_at),
    CHECK ((purchasable_status IS NOT DISTINCT FROM 'available') = (public_price IS NOT NULL)),
    CHECK ((public_price IS NOT NULL) = (currency IS NOT NULL)),
    CHECK (public_price IS NOT NULL OR (base_price IS NULL AND member_price IS NULL AND public_promotion IS NULL)),
    CHECK ((member_price IS NULL) = (member_tier IS NULL)),
    CHECK (member_ends_at IS NULL OR member_price IS NOT NULL),
    CHECK (member_ends_at > observed_at),
    CHECK (promo_ends_at IS NULL OR public_promotion IS TRUE),
    CHECK (promo_ends_at > observed_at),
    CHECK (failure_reason IS NULL OR (included_in_subscription IS NULL AND tax_included IS NULL))
);

CREATE INDEX game_offer_attempts_history_idx ON game_offer_attempts (target_id, observed_at DESC, run_id DESC);
CREATE INDEX game_offer_approved_history_idx ON game_offer_attempts (target_id, observed_at DESC, run_id DESC)
    WHERE review_status = 'approved';

-- 核准时必须确认身份与 ISO 币种。明确不可购买的页面可以没有金额和币种；
-- 此时依赖市场与 SKU 的正向证据。目标身份及预期币种投入使用后视为不可变。
CREATE FUNCTION game_offer_check_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.review_status = 'approved' AND NEW.currency IS NOT NULL AND
       NEW.currency <> (SELECT expected_currency FROM game_offer_targets WHERE id = NEW.target_id) THEN
        RAISE EXCEPTION '报价的 ISO 币种与目标配置不符';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER game_offer_approval_guard BEFORE INSERT OR UPDATE ON game_offer_attempts
    FOR EACH ROW EXECUTE FUNCTION game_offer_check_approval();

-- 选证据采集时间最近的已核准结果。迟到的审单、超时和待审大促均保留在历史中。
-- verified_at 表示证据的实际核价时间，晚几天审批不会延长报价有效期。
CREATE VIEW game_offer_latest_verified AS
SELECT DISTINCT ON (a.target_id)
    a.target_id, a.run_id, a.observed_at AS verified_at, a.purchasable_status, a.currency,
    a.base_price, a.public_price, a.member_price, a.member_tier, a.member_ends_at,
    a.included_in_subscription, a.tax_included, a.public_promotion, a.promo_ends_at,
    least(a.observed_at + CASE WHEN a.public_price IS NOT NULL AND a.public_promotion IS DISTINCT FROM false
                               THEN t.sale_ttl ELSE t.regular_ttl END, a.promo_ends_at) AS valid_until
FROM game_offer_attempts a JOIN game_offer_targets t ON t.id = a.target_id
WHERE a.review_status = 'approved'
ORDER BY a.target_id, a.observed_at DESC, a.run_id DESC;

-- 每次尝试按 (observed_at, run_id) 排序。last_attempt_at 来自最新尝试。
-- consecutive_failures 统计最近一次成功解析之后连续的 failure_reason 非空行；
-- 待审属于成功解析，独立记录审核积压。stale_grace 也涵盖晚于核准快照的待审报价。

-- 已核准且为最新的限时促销，在同一审批事务中登记一次；队列消费前重读
-- game_offer_latest_verified。核准状态变为不可售、撤销促销或结束时间变更时，
-- 旧事件标为 superseded。同一商品同一时刻的事件通过主键去重。
CREATE TABLE game_promo_rechecks (
    target_id uuid NOT NULL REFERENCES game_offer_targets(id),
    promo_ends_at timestamptz NOT NULL,
    due_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','superseded','exhausted')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
    lease_until timestamptz,
    lease_token uuid,
    PRIMARY KEY (target_id, promo_ends_at),
    CHECK (due_at >= promo_ends_at),
    CHECK ((status = 'running') = (lease_until IS NOT NULL)),
    CHECK ((status = 'running') = (lease_token IS NOT NULL))
);
CREATE INDEX game_promo_due_idx ON game_promo_rechecks(due_at) WHERE status = 'queued';
CREATE INDEX game_promo_lease_idx ON game_promo_rechecks(lease_until) WHERE status = 'running';

-- Persist evidence and its candidate together with the scheduler's terminal run write.
CREATE FUNCTION record_game_store_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    target uuid;
    offer jsonb := NEW.raw_payload->'game_offer';
    previous numeric;
    candidate numeric := (offer->>'public_price')::numeric;
    reason text := offer->>'failure_reason';
BEGIN
    SELECT b.target_id INTO STRICT target FROM game_offer_jobs b WHERE b.job_id = NEW.job_id;
    IF NEW.raw_payload ? 'target_id' AND target <> (NEW.raw_payload->>'target_id')::uuid THEN
        RAISE EXCEPTION 'Target binding differs from captured evidence';
    END IF;
    IF (NEW.status = 'failed') <> (reason IS NOT NULL) THEN RAISE EXCEPTION 'Invalid game collection outcome'; END IF;
    SELECT public_price INTO previous FROM game_offer_latest_verified WHERE target_id = target;
    INSERT INTO game_offer_attempts(run_id, job_id, target_id, observed_at, failure_reason, review_status,
        review_reason, purchasable_status, currency, base_price, public_price, member_price, member_tier,
        member_ends_at, included_in_subscription, tax_included, public_promotion, promo_ends_at)
    VALUES (NEW.id, NEW.job_id, target, (offer->>'observed_at')::timestamptz, reason,
        CASE WHEN reason IS NULL THEN 'pending' END,
        CASE WHEN previous = 0 AND candidate > 0 OR candidate < previous * 0.25 OR candidate > previous * 1.50 THEN 'price_jump' END,
        offer->>'purchasable_status', offer->>'currency', (offer->>'base_price')::numeric, candidate,
        (offer->>'member_price')::numeric, offer->>'member_tier', (offer->>'member_ends_at')::timestamptz,
        (offer->>'included_in_subscription')::boolean, (offer->>'tax_included')::boolean,
        (offer->>'public_promotion')::boolean, (offer->>'promo_ends_at')::timestamptz)
    ON CONFLICT (run_id) DO NOTHING;
    RETURN NEW;
END $$;
CREATE TRIGGER record_game_offer AFTER INSERT OR UPDATE ON collector_job_runs FOR EACH ROW
    WHEN (NEW.status IN ('succeeded','failed') AND NEW.raw_payload ? 'game_offer')
    EXECUTE FUNCTION record_game_store_attempt();

-- One projection for both cards and price rows. Historical amounts remain available to reviewers.
CREATE VIEW game_offer_public_state AS
WITH available AS (
    SELECT t.id, t.product_id, t.platform, t.market, t.offer_type, t.edition, t.store_product_id, t.store_url,
        t.expected_currency AS currency, v.verified_at, v.valid_until, v.public_price, v.base_price,
        v.member_price, v.member_tier, v.member_ends_at, v.tax_included, v.included_in_subscription, v.promo_ends_at,
        CASE WHEN v.run_id IS NULL THEN 'never_verified'
             WHEN now() >= v.valid_until THEN 'stale_expired'
             WHEN v.purchasable_status = 'unavailable' THEN 'unavailable'
             WHEN EXISTS (SELECT 1 FROM game_offer_attempts a WHERE a.target_id = t.id
                  AND (a.observed_at, a.run_id) > (v.verified_at, v.run_id)) THEN 'stale_grace'
             ELSE 'fresh' END AS status
    FROM game_offer_targets t LEFT JOIN game_offer_latest_verified v ON t.id = v.target_id
)
SELECT id, product_id, platform, market, offer_type, edition, store_product_id, store_url, currency, verified_at,
    valid_until, status, tax_included,
    CASE WHEN status IN ('fresh','stale_grace') THEN jsonb_build_object('public_price', public_price::text,
        'base_price', base_price::text, 'promo_ends_at', promo_ends_at, 'included_in_subscription', included_in_subscription,
        'member_tier', CASE WHEN member_ends_at IS NULL OR member_ends_at > now() THEN member_tier END,
        'member_price', CASE WHEN member_ends_at IS NULL OR member_ends_at > now() THEN member_price::text END,
        'member_ends_at', CASE WHEN member_ends_at > now() THEN member_ends_at END) END AS price
FROM available;

CREATE FUNCTION queue_game_promo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_end timestamptz;
BEGIN
    PERFORM id FROM game_offer_targets WHERE id = NEW.target_id FOR UPDATE;
    SELECT promo_ends_at INTO current_end FROM game_offer_latest_verified WHERE target_id = NEW.target_id;
    UPDATE game_promo_rechecks SET status='superseded', lease_token=NULL, lease_until=NULL
      WHERE target_id=NEW.target_id AND promo_ends_at IS DISTINCT FROM current_end AND status IN ('queued','running');
    IF current_end IS NOT NULL THEN
        INSERT INTO game_promo_rechecks(target_id,promo_ends_at,due_at)
        VALUES (NEW.target_id,current_end,current_end + interval '5 minutes')
        ON CONFLICT (target_id,promo_ends_at) DO UPDATE SET status='queued', due_at=EXCLUDED.due_at, attempts=0
        WHERE game_promo_rechecks.status='superseded';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER game_review_promos AFTER INSERT OR UPDATE OF review_status ON game_offer_attempts
    FOR EACH ROW WHEN (NEW.review_status IN ('approved','rejected')) EXECUTE FUNCTION queue_game_promo();

CREATE FUNCTION claim_game_promo_recheck() RETURNS TABLE(job_id uuid, token uuid) LANGUAGE plpgsql AS $$
DECLARE event record;
BEGIN
    -- Recover interrupted runs. Every retry uses its own fencing token.
    UPDATE game_promo_rechecks SET status=CASE WHEN attempts=3 THEN 'exhausted' ELSE 'queued' END,
        lease_token=NULL, lease_until=NULL WHERE status='running' AND lease_until <= now();
    SELECT q.target_id, q.promo_ends_at, j.id INTO event
    FROM game_promo_rechecks q JOIN game_offer_jobs b ON b.target_id=q.target_id
    JOIN collector_jobs j ON j.id=b.job_id AND j.status='active'
    JOIN game_offer_latest_verified v ON v.target_id=q.target_id AND v.promo_ends_at=q.promo_ends_at
    WHERE q.status='queued' AND q.due_at <= now() AND q.attempts < 3
      AND NOT EXISTS (SELECT 1 FROM collector_job_runs r WHERE r.job_id=j.id AND r.status='running'
                      AND r.started_at > now()-interval '20 minutes')
    ORDER BY q.due_at,j.created_at DESC LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
    IF NOT FOUND THEN RETURN; END IF;
    job_id := event.id;
    UPDATE game_promo_rechecks SET status='running', attempts=attempts+1,
        lease_until=now()+interval '20 minutes', lease_token=gen_random_uuid()
    WHERE target_id=event.target_id AND promo_ends_at=event.promo_ends_at RETURNING lease_token INTO token;
    RETURN NEXT;
END $$;

CREATE FUNCTION finish_game_promo_recheck(claim uuid, succeeded boolean) RETURNS void LANGUAGE sql AS $$
    UPDATE game_promo_rechecks
    SET status=CASE WHEN succeeded THEN 'done' WHEN attempts=3 THEN 'exhausted' ELSE 'queued' END,
        due_at=CASE WHEN succeeded OR attempts=3 THEN due_at
                    ELSE now()+CASE WHEN attempts=1 THEN interval '5 minutes' ELSE interval '15 minutes' END END,
        lease_token=NULL, lease_until=NULL
    WHERE lease_token=claim AND status='running';
$$;

COMMIT;
