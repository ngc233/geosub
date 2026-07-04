-- Price auto-review rules.
-- First version: auto-approve only when multiple platform observations agree.

CREATE TABLE IF NOT EXISTS price_auto_review_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running',
    'succeeded',
    'failed'
  )),
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  min_sources INTEGER NOT NULL DEFAULT 3,
  abs_usd_tolerance NUMERIC(12, 4) NOT NULL DEFAULT 0.50,
  percent_tolerance NUMERIC(8, 4) NOT NULL DEFAULT 1.00,
  max_change_percent NUMERIC(8, 4) NOT NULL DEFAULT 15.00,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  checked_groups INTEGER NOT NULL DEFAULT 0,
  auto_approved_count INTEGER NOT NULL DEFAULT 0,
  manual_review_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_auto_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES price_auto_review_runs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  price_type TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN (
    'auto_approve',
    'manual_review'
  )),
  reason_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_count INTEGER NOT NULL,
  observation_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  platforms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  min_usd NUMERIC(12, 4),
  max_usd NUMERIC(12, 4),
  spread_usd NUMERIC(12, 4),
  spread_percent NUMERIC(8, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_auto_review_runs_started_at
  ON price_auto_review_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_auto_review_decisions_run
  ON price_auto_review_decisions(run_id);

DROP TRIGGER IF EXISTS trg_price_auto_review_runs_updated_at ON price_auto_review_runs;
CREATE TRIGGER trg_price_auto_review_runs_updated_at
  BEFORE UPDATE ON price_auto_review_runs
  FOR EACH ROW
  EXECUTE FUNCTION geosub_set_updated_at();

CREATE OR REPLACE FUNCTION run_price_auto_review(
  p_dry_run BOOLEAN DEFAULT TRUE,
  p_min_sources INTEGER DEFAULT 3,
  p_abs_usd_tolerance NUMERIC DEFAULT 0.50,
  p_percent_tolerance NUMERIC DEFAULT 1.00,
  p_max_change_percent NUMERIC DEFAULT 15.00
)
RETURNS TABLE (
  run_id UUID,
  decision TEXT,
  reason_code TEXT,
  reason TEXT,
  product_slug TEXT,
  plan_slug TEXT,
  country_code TEXT,
  source_count INTEGER,
  platforms TEXT[],
  observation_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_id UUID;
  v_group RECORD;
  v_reason_code TEXT;
  v_reason TEXT;
  v_decision TEXT;
  v_checked_groups INTEGER := 0;
  v_auto_approved_count INTEGER := 0;
  v_manual_review_count INTEGER := 0;
  v_region_price_id UUID;
  v_observation_id UUID;
  v_has_large_change BOOLEAN;
BEGIN
  IF p_min_sources < 2 THEN
    RAISE EXCEPTION 'p_min_sources must be at least 2';
  END IF;

  INSERT INTO price_auto_review_runs (
    dry_run,
    min_sources,
    abs_usd_tolerance,
    percent_tolerance,
    max_change_percent
  )
  VALUES (
    p_dry_run,
    p_min_sources,
    p_abs_usd_tolerance,
    p_percent_tolerance,
    p_max_change_percent
  )
  RETURNING id INTO v_run_id;

  FOR v_group IN
    WITH pending_groups AS (
      SELECT
        po.product_id,
        po.plan_id,
        po.country_id,
        po.price_type,
        ARRAY_AGG(po.id ORDER BY po.billing_platform::TEXT, po.observed_at DESC) AS observation_ids,
        ARRAY_AGG(DISTINCT po.billing_platform::TEXT ORDER BY po.billing_platform::TEXT) AS platforms,
        COUNT(*) AS observation_count,
        COUNT(DISTINCT po.billing_platform) AS source_count,
        MIN(po.converted_usd) AS min_usd,
        MAX(po.converted_usd) AS max_usd,
        AVG(po.converted_usd) AS avg_usd,
        MIN(po.confidence_score) AS min_confidence,
        BOOL_OR(
          po.product_id IS NULL
          OR po.plan_id IS NULL
          OR po.country_id IS NULL
          OR po.raw_price IS NULL
          OR po.currency IS NULL
          OR po.converted_usd IS NULL
        ) AS has_incomplete
      FROM price_observations po
      WHERE po.status = 'pending'
      GROUP BY
        po.product_id,
        po.plan_id,
        po.country_id,
        po.price_type
    )
    SELECT
      pg.*,
      p.slug AS product_slug,
      pl.slug AS plan_slug,
      c.code AS country_code,
      ROUND((pg.max_usd - pg.min_usd), 4) AS spread_usd,
      CASE
        WHEN pg.avg_usd IS NULL OR pg.avg_usd = 0 THEN NULL
        ELSE ROUND(((pg.max_usd - pg.min_usd) / pg.avg_usd) * 100, 4)
      END AS spread_percent
    FROM pending_groups pg
    JOIN products p ON p.id = pg.product_id
    JOIN plans pl ON pl.id = pg.plan_id
    JOIN countries c ON c.id = pg.country_id
    ORDER BY p.slug, pl.slug, c.code
  LOOP
    v_checked_groups := v_checked_groups + 1;
    v_has_large_change := FALSE;

    SELECT EXISTS (
      SELECT 1
      FROM price_observations po
      JOIN region_prices rp
        ON rp.plan_id = po.plan_id
       AND rp.country_id = po.country_id
       AND rp.billing_platform = po.billing_platform
       AND rp.price_type = po.price_type
       AND rp.status = 'published'
      WHERE po.id = ANY(v_group.observation_ids)
        AND rp.price_usd > 0
        AND ABS(((po.converted_usd - rp.price_usd) / rp.price_usd) * 100) > p_max_change_percent
    ) INTO v_has_large_change;

    IF v_group.has_incomplete THEN
      v_decision := 'manual_review';
      v_reason_code := 'incomplete_observation';
      v_reason := '观察记录缺少产品、套餐、地区、原价、币种或美元折算价，需要人工补全。';
    ELSIF v_group.min_confidence < 80 THEN
      v_decision := 'manual_review';
      v_reason_code := 'low_confidence';
      v_reason := '最低置信度低于 80，暂不自动通过。';
    ELSIF v_group.source_count < p_min_sources THEN
      v_decision := 'manual_review';
      v_reason_code := 'waiting_for_more_sources';
      v_reason := FORMAT(
        '当前只有 %s 个来源，需要至少 %s 个不同平台来源一致后才自动通过。',
        v_group.source_count,
        p_min_sources
      );
    ELSIF v_group.spread_usd > p_abs_usd_tolerance
      AND COALESCE(v_group.spread_percent, 100000) > p_percent_tolerance
    THEN
      v_decision := 'manual_review';
      v_reason_code := 'source_price_conflict';
      v_reason := FORMAT(
        '多个来源价格不一致，美元价差约 %s，百分比价差约 %s%%。',
        v_group.spread_usd,
        COALESCE(v_group.spread_percent, 0)
      );
    ELSIF v_has_large_change THEN
      v_decision := 'manual_review';
      v_reason_code := 'large_change_vs_published';
      v_reason := FORMAT(
        '与当前正式价相比变化超过 %s%%，需要人工确认是否真实变价。',
        p_max_change_percent
      );
    ELSE
      v_decision := 'auto_approve';
      v_reason_code := 'multi_source_consensus';
      v_reason := FORMAT(
        '%s 个平台来源一致，美元价差约 %s，自动通过。',
        v_group.source_count,
        v_group.spread_usd
      );
    END IF;

    INSERT INTO price_auto_review_decisions (
      run_id,
      product_id,
      plan_id,
      country_id,
      price_type,
      decision,
      reason_code,
      reason,
      source_count,
      observation_ids,
      platforms,
      min_usd,
      max_usd,
      spread_usd,
      spread_percent
    )
    VALUES (
      v_run_id,
      v_group.product_id,
      v_group.plan_id,
      v_group.country_id,
      v_group.price_type,
      v_decision,
      v_reason_code,
      v_reason,
      v_group.source_count,
      v_group.observation_ids,
      v_group.platforms,
      v_group.min_usd,
      v_group.max_usd,
      v_group.spread_usd,
      v_group.spread_percent
    );

    IF v_decision = 'auto_approve' THEN
      v_auto_approved_count := v_auto_approved_count + CARDINALITY(v_group.observation_ids);

      IF NOT p_dry_run THEN
        FOREACH v_observation_id IN ARRAY v_group.observation_ids
        LOOP
          v_region_price_id := approve_price_observation(v_observation_id);

          UPDATE price_observations
          SET raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
            'auto_review_run_id', v_run_id::TEXT,
            'auto_review_decision', v_decision,
            'auto_review_reason_code', v_reason_code,
            'auto_review_reason', v_reason,
            'auto_approved_at', NOW()::TEXT
          )
          WHERE id = v_observation_id;
        END LOOP;
      END IF;
    ELSE
      v_manual_review_count := v_manual_review_count + CARDINALITY(v_group.observation_ids);

      IF NOT p_dry_run THEN
        UPDATE price_observations
        SET raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
          'auto_review_run_id', v_run_id::TEXT,
          'auto_review_decision', v_decision,
          'auto_review_reason_code', v_reason_code,
          'auto_review_reason', v_reason,
          'review_note', v_reason
        ),
        updated_at = NOW()
        WHERE id = ANY(v_group.observation_ids)
          AND status = 'pending';
      END IF;
    END IF;

    run_id := v_run_id;
    decision := v_decision;
    reason_code := v_reason_code;
    reason := v_reason;
    product_slug := v_group.product_slug;
    plan_slug := v_group.plan_slug;
    country_code := v_group.country_code;
    source_count := v_group.source_count;
    platforms := v_group.platforms;
    observation_count := CARDINALITY(v_group.observation_ids);
    RETURN NEXT;
  END LOOP;

  UPDATE price_auto_review_runs
  SET
    status = 'succeeded',
    completed_at = NOW(),
    checked_groups = v_checked_groups,
    auto_approved_count = v_auto_approved_count,
    manual_review_count = v_manual_review_count,
    updated_at = NOW()
  WHERE id = v_run_id;

EXCEPTION WHEN OTHERS THEN
  IF v_run_id IS NOT NULL THEN
    UPDATE price_auto_review_runs
    SET
      status = 'failed',
      completed_at = NOW(),
      error_message = SQLERRM,
      updated_at = NOW()
    WHERE id = v_run_id;
  END IF;

  RAISE;
END;
$$;
