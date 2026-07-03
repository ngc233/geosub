-- V2 App Store stability auto-review.
-- Adds a hard guard against parser/cycle/currency anomalies, so three
-- identical mistakes cannot be auto-approved.

CREATE OR REPLACE FUNCTION run_app_store_stability_auto_review(
  p_dry_run BOOLEAN DEFAULT TRUE,
  p_required_samples INTEGER DEFAULT 3,
  p_min_confidence INTEGER DEFAULT 80,
  p_max_sample_age_days INTEGER DEFAULT 14
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
  v_observation_ids_to_approve UUID[];
BEGIN
  IF p_required_samples < 2 THEN
    RAISE EXCEPTION 'p_required_samples must be at least 2';
  END IF;

  IF NOT p_dry_run THEN
    UPDATE price_observations observation
    SET
      status = 'ignored'::observation_status,
      raw_payload = COALESCE(observation.raw_payload, '{}'::jsonb) || jsonb_build_object(
        'ignored_at', NOW()::TEXT,
        'ignore_reason', 'Superseded by a newer or matching published App Store price.',
        'auto_review_rule', 'app_store_stability',
        'auto_review_decision', 'ignored',
        'auto_review_reason_code', 'superseded_by_published_price'
      ),
      updated_at = NOW()
    FROM region_prices published
    WHERE observation.status = 'pending'::observation_status
      AND COALESCE(observation.anomaly_flag, FALSE) = FALSE
      AND observation.product_id = published.product_id
      AND observation.plan_id = published.plan_id
      AND observation.country_id = published.country_id
      AND observation.billing_platform = published.billing_platform
      AND observation.price_type = published.price_type
      AND published.status = 'published'::publish_status
      AND (
        published.last_checked_at >= observation.observed_at
        OR (
          published.currency IS NOT DISTINCT FROM observation.currency
          AND published.local_price IS NOT DISTINCT FROM observation.raw_price
          AND (
            published.price_usd IS NULL
            OR observation.converted_usd IS NULL
            OR published.price_usd = 0
            OR ABS((observation.converted_usd - published.price_usd) / published.price_usd) <= 0.02
          )
        )
      );
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
    p_required_samples,
    0,
    0,
    100
  )
  RETURNING id INTO v_run_id;

  FOR v_group IN
    WITH candidate_groups AS (
      SELECT DISTINCT
        po.product_id,
        po.plan_id,
        po.country_id,
        po.billing_platform,
        po.price_type
      FROM price_observations po
      LEFT JOIN price_sources ps ON ps.id = po.source_id
      WHERE po.status = 'pending'::observation_status
        AND po.billing_platform = 'ios'::billing_platform
        AND (
          po.source_level = 'A'::source_level
          OR ps.type = 'app_store'::price_source_type
        )
    ),
    ranked AS (
      SELECT
        po.*,
        ROW_NUMBER() OVER (
          PARTITION BY
            po.product_id,
            po.plan_id,
            po.country_id,
            po.billing_platform,
            po.price_type
          ORDER BY po.observed_at DESC, po.created_at DESC
        ) AS sample_rank
      FROM price_observations po
      JOIN candidate_groups cg
        ON cg.product_id = po.product_id
       AND cg.plan_id = po.plan_id
       AND cg.country_id = po.country_id
       AND cg.billing_platform = po.billing_platform
       AND cg.price_type = po.price_type
      LEFT JOIN price_sources ps ON ps.id = po.source_id
      WHERE po.status IN (
          'pending'::observation_status,
          'approved'::observation_status
        )
        AND po.billing_platform = 'ios'::billing_platform
        AND (
          po.source_level = 'A'::source_level
          OR ps.type = 'app_store'::price_source_type
        )
    ),
    latest_samples AS (
      SELECT *
      FROM ranked
      WHERE sample_rank <= p_required_samples
    ),
    grouped AS (
      SELECT
        ls.product_id,
        ls.plan_id,
        ls.country_id,
        ls.billing_platform,
        ls.price_type,
        ARRAY_AGG(ls.id ORDER BY ls.observed_at DESC, ls.created_at DESC) AS observation_ids,
        (ARRAY_AGG(ls.id ORDER BY ls.observed_at DESC, ls.created_at DESC))[1] AS latest_observation_id,
        ARRAY_AGG(ls.id ORDER BY ls.observed_at DESC, ls.created_at DESC)
          FILTER (WHERE ls.status = 'pending'::observation_status) AS pending_observation_ids,
        COUNT(*) AS observation_count,
        COUNT(*) FILTER (WHERE ls.status = 'pending'::observation_status) AS pending_count,
        COUNT(DISTINCT ls.raw_price) AS raw_price_count,
        COUNT(DISTINCT ls.currency) AS currency_count,
        MIN(ls.confidence_score) AS min_confidence,
        MIN(ls.observed_at) AS oldest_observed_at,
        MAX(ls.observed_at) AS newest_observed_at,
        MIN(ls.raw_price) AS stable_raw_price,
        MIN(ls.currency) AS stable_currency,
        MIN(ls.converted_usd) AS min_converted_usd,
        MIN(ls.converted_usd) AS stable_converted_usd,
        (ARRAY_AGG(ls.raw_price ORDER BY ls.observed_at DESC, ls.created_at DESC))[1] AS latest_raw_price,
        (ARRAY_AGG(ls.raw_price ORDER BY ls.observed_at DESC, ls.created_at DESC))[2] AS second_raw_price,
        (ARRAY_AGG(ls.currency ORDER BY ls.observed_at DESC, ls.created_at DESC))[1] AS latest_currency,
        (ARRAY_AGG(ls.currency ORDER BY ls.observed_at DESC, ls.created_at DESC))[2] AS second_currency,
        (ARRAY_AGG(ls.converted_usd ORDER BY ls.observed_at DESC, ls.created_at DESC))[1] AS latest_converted_usd,
        (ARRAY_AGG(ls.converted_usd ORDER BY ls.observed_at DESC, ls.created_at DESC))[2] AS second_converted_usd,
        (ARRAY_AGG(COALESCE(ls.anomaly_flag, FALSE) ORDER BY ls.observed_at DESC, ls.created_at DESC))[1] AS latest_has_anomaly,
        (ARRAY_AGG(COALESCE(ls.anomaly_flag, FALSE) ORDER BY ls.observed_at DESC, ls.created_at DESC))[2] AS second_has_anomaly,
        (ARRAY_AGG(
          CASE
            WHEN COALESCE(ls.raw_payload #>> '{raw_snapshot,priceSelection,selectedCount}', '') ~ '^\d+$'
            THEN (ls.raw_payload #>> '{raw_snapshot,priceSelection,selectedCount}')::INTEGER
            ELSE 0
          END
          ORDER BY ls.observed_at DESC, ls.created_at DESC
        ))[1] AS latest_modal_count,
        (ARRAY_AGG(
          CASE
            WHEN COALESCE(ls.raw_payload #>> '{raw_snapshot,priceSelection,runnerUpCount}', '') ~ '^\d+$'
            THEN (ls.raw_payload #>> '{raw_snapshot,priceSelection,runnerUpCount}')::INTEGER
            ELSE 0
          END
          ORDER BY ls.observed_at DESC, ls.created_at DESC
        ))[1] AS latest_runner_up_count,
        (ARRAY_AGG(
          CASE
            WHEN COALESCE(ls.raw_payload #>> '{raw_snapshot,priceSelection,variantCount}', '') ~ '^\d+$'
            THEN (ls.raw_payload #>> '{raw_snapshot,priceSelection,variantCount}')::INTEGER
            ELSE 0
          END
          ORDER BY ls.observed_at DESC, ls.created_at DESC
        ))[1] AS latest_variant_count,
        BOOL_OR(COALESCE(ls.anomaly_flag, FALSE)) AS has_anomaly,
        STRING_AGG(DISTINCT NULLIF(ls.anomaly_reason, ''), ' ')
          FILTER (WHERE COALESCE(ls.anomaly_flag, FALSE)) AS anomaly_reason,
        BOOL_OR(
          UPPER(COALESCE(ls.raw_payload -> 'raw_snapshot' ->> 'originalObservedPriceText', '')) LIKE '%USD%'
          AND ls.currency <> 'USD'
        ) AS has_usd_text_currency_mismatch,
        BOOL_OR(
          ls.currency = 'USD'
          AND UPPER(COALESCE(ls.raw_payload -> 'raw_snapshot' ->> 'originalObservedPriceText', '')) NOT LIKE '%USD%'
          AND EXISTS (
            SELECT 1
            FROM countries currency_country
            WHERE currency_country.id = ls.country_id
              AND currency_country.currency <> 'USD'
          )
        ) AS has_local_dollar_parsed_as_usd,
        BOOL_OR(
          ls.product_id IS NULL
          OR ls.plan_id IS NULL
          OR ls.country_id IS NULL
          OR ls.raw_price IS NULL
          OR ls.currency IS NULL
          OR ls.converted_usd IS NULL
        ) AS has_incomplete
      FROM latest_samples ls
      GROUP BY
        ls.product_id,
        ls.plan_id,
        ls.country_id,
        ls.billing_platform,
        ls.price_type
    )
    SELECT
      g.*,
      p.slug AS product_slug,
      pl.slug AS plan_slug,
      c.code AS country_code,
      COALESCE(peer_stats.peer_count, 0) AS peer_count,
      peer_stats.peer_median_usd,
      COALESCE(peer_stats.has_global_price_outlier, FALSE) AS has_global_price_outlier,
      COALESCE(order_guard.has_plan_order_conflict, FALSE) AS has_plan_order_conflict,
      order_guard.plan_order_conflict_reason
    FROM grouped g
    JOIN products p ON p.id = g.product_id
    JOIN plans pl ON pl.id = g.plan_id
    JOIN countries c ON c.id = g.country_id
    LEFT JOIN LATERAL (
      WITH peer_latest AS (
        SELECT DISTINCT ON (peer.country_id)
          peer.converted_usd
        FROM price_observations peer
        LEFT JOIN price_sources peer_source ON peer_source.id = peer.source_id
        WHERE peer.product_id = g.product_id
          AND peer.plan_id = g.plan_id
          AND peer.country_id <> g.country_id
          AND peer.billing_platform = g.billing_platform
          AND peer.price_type = g.price_type
          AND peer.status IN ('pending'::observation_status, 'approved'::observation_status)
          AND peer.converted_usd IS NOT NULL
          AND peer.converted_usd >= 1
          AND COALESCE(peer.anomaly_flag, FALSE) = FALSE
          AND peer.observed_at >= NOW() - MAKE_INTERVAL(days => p_max_sample_age_days)
          AND (peer.source_level = 'A'::source_level OR peer_source.type = 'app_store'::price_source_type)
        ORDER BY peer.country_id, peer.observed_at DESC, peer.created_at DESC
      ),
      peer_summary AS (
        SELECT
          COUNT(*)::INT AS peer_count,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY converted_usd)::NUMERIC AS peer_median_usd
        FROM peer_latest
      )
      SELECT
        peer_count,
        peer_median_usd,
        (
          peer_count >= 8
          AND peer_median_usd IS NOT NULL
          AND (
            g.stable_converted_usd < peer_median_usd * 0.2
            OR g.stable_converted_usd > peer_median_usd * 3.5
          )
        ) AS has_global_price_outlier
      FROM peer_summary
    ) peer_stats ON TRUE
    LEFT JOIN LATERAL (
      WITH current_plan AS (
        SELECT CASE
          WHEN LOWER(pl.slug) IN ('free', 'trial') THEN 0
          WHEN LOWER(pl.slug) IN ('go', 'lite', 'basic', 'mini') THEN 10
          WHEN LOWER(pl.slug) LIKE '%plus%' THEN 20
          WHEN LOWER(pl.slug) LIKE '%pro-5x%' THEN 30
          WHEN LOWER(pl.slug) = 'pro' AND LOWER(p.slug) = 'chatgpt' THEN 40
          WHEN LOWER(pl.slug) LIKE '%max%' THEN 45
          WHEN LOWER(pl.slug) LIKE '%team%' THEN 50
          WHEN COALESCE(pl.sort_order, 0) > 0 THEN pl.sort_order
          ELSE 100
        END AS effective_rank
      ),
      sibling_latest AS (
        SELECT DISTINCT ON (sibling.plan_id)
          sibling_plan.slug,
          sibling.converted_usd,
          CASE
            WHEN LOWER(sibling_plan.slug) IN ('free', 'trial') THEN 0
            WHEN LOWER(sibling_plan.slug) IN ('go', 'lite', 'basic', 'mini') THEN 10
            WHEN LOWER(sibling_plan.slug) LIKE '%plus%' THEN 20
            WHEN LOWER(sibling_plan.slug) LIKE '%pro-5x%' THEN 30
            WHEN LOWER(sibling_plan.slug) = 'pro' AND LOWER(p.slug) = 'chatgpt' THEN 40
            WHEN LOWER(sibling_plan.slug) LIKE '%max%' THEN 45
            WHEN LOWER(sibling_plan.slug) LIKE '%team%' THEN 50
            WHEN COALESCE(sibling_plan.sort_order, 0) > 0 THEN sibling_plan.sort_order
            ELSE 100
          END AS effective_rank
        FROM price_observations sibling
        JOIN plans sibling_plan ON sibling_plan.id = sibling.plan_id
        LEFT JOIN price_sources sibling_source ON sibling_source.id = sibling.source_id
        WHERE sibling.product_id = g.product_id
          AND sibling.country_id = g.country_id
          AND sibling.plan_id <> g.plan_id
          AND sibling.billing_platform = g.billing_platform
          AND sibling.price_type = g.price_type
          AND sibling.status IN ('pending'::observation_status, 'approved'::observation_status)
          AND sibling.converted_usd IS NOT NULL
          AND sibling.converted_usd >= 1
          AND COALESCE(sibling.anomaly_flag, FALSE) = FALSE
          AND sibling.observed_at >= NOW() - MAKE_INTERVAL(days => p_max_sample_age_days)
          AND (sibling.source_level = 'A'::source_level OR sibling_source.type = 'app_store'::price_source_type)
        ORDER BY sibling.plan_id, sibling.observed_at DESC, sibling.created_at DESC
      )
      SELECT
        TRUE AS has_plan_order_conflict,
        FORMAT(
          'Plan price order looks inconsistent: %s is %s USD, while sibling plan %s is %s USD in the same country. This requires manual review.',
          pl.slug,
          ROUND(g.stable_converted_usd, 2),
          sibling_latest.slug,
          ROUND(sibling_latest.converted_usd, 2)
        ) AS plan_order_conflict_reason
      FROM sibling_latest
      CROSS JOIN current_plan
      WHERE sibling_latest.effective_rank <> current_plan.effective_rank
        AND (
          (current_plan.effective_rank > sibling_latest.effective_rank AND g.stable_converted_usd < sibling_latest.converted_usd * 0.75)
          OR (current_plan.effective_rank < sibling_latest.effective_rank AND g.stable_converted_usd > sibling_latest.converted_usd * 1.25)
        )
      ORDER BY ABS(current_plan.effective_rank - sibling_latest.effective_rank) DESC
      LIMIT 1
    ) order_guard ON TRUE
    WHERE g.pending_count > 0
    ORDER BY p.slug, pl.slug, c.code
  LOOP
    v_checked_groups := v_checked_groups + 1;

    IF v_group.has_incomplete THEN
      v_decision := 'manual_review';
      v_reason_code := 'incomplete_observation';
      v_reason := 'App Store observation is missing product, plan, country, raw price, currency, or USD conversion.';
    ELSIF v_group.observation_count >= 2
      AND COALESCE(v_group.latest_has_anomaly, FALSE) = FALSE
      AND COALESCE(v_group.second_has_anomaly, FALSE) = FALSE
      AND v_group.latest_raw_price IS NOT NULL
      AND v_group.latest_raw_price = v_group.second_raw_price
      AND v_group.latest_currency IS NOT NULL
      AND v_group.latest_currency = v_group.second_currency
      AND COALESCE(v_group.latest_converted_usd, 0) >= 1
      AND COALESCE(v_group.second_converted_usd, 0) >= 1
      AND v_group.has_anomaly
    THEN
      v_decision := 'auto_approve';
      v_reason_code := 'app_store_clean_pair_after_rule_fix';
      v_reason := FORMAT(
        'The latest 2 clean App Store samples match after parser/rule correction: %s %s. Auto approved and older conflicting samples are ignored.',
        v_group.latest_currency,
        v_group.latest_raw_price
      );
    ELSIF v_group.has_anomaly THEN
      v_decision := 'manual_review';
      v_reason_code := 'app_store_observation_anomaly';
      v_reason := COALESCE(
        v_group.anomaly_reason,
        'The App Store collector flagged this observation as a hard anomaly, so it requires more automated evidence before publication.'
      );
    ELSIF v_group.observation_count < p_required_samples THEN
      v_decision := 'manual_review';
      v_reason_code := 'waiting_for_more_app_store_samples';
      v_reason := FORMAT(
        'Only %s App Store observations are available. Need the latest %s samples to match before auto approval.',
        v_group.observation_count,
        p_required_samples
      );
    ELSIF v_group.oldest_observed_at < NOW() - MAKE_INTERVAL(days => p_max_sample_age_days) THEN
      v_decision := 'manual_review';
      v_reason_code := 'app_store_samples_too_old';
      v_reason := FORMAT(
        'The latest %s App Store samples are older than %s days. Wait for fresh collection samples.',
        p_required_samples,
        p_max_sample_age_days
      );
    ELSIF v_group.min_confidence < p_min_confidence THEN
      v_decision := 'manual_review';
      v_reason_code := 'low_confidence';
      v_reason := FORMAT(
        'The lowest App Store confidence score is %s, below auto approval threshold %s.',
        v_group.min_confidence,
        p_min_confidence
      );
    ELSIF (v_group.raw_price_count <> 1 OR v_group.currency_count <> 1)
      AND COALESCE(v_group.latest_has_anomaly, FALSE) = FALSE
      AND COALESCE(v_group.latest_variant_count, 0) > 1
      AND COALESCE(v_group.latest_modal_count, 0) >= 2
      AND COALESCE(v_group.latest_modal_count, 0) > COALESCE(v_group.latest_runner_up_count, 0)
    THEN
      v_decision := 'auto_approve';
      v_reason_code := 'app_store_modal_price_consensus';
      v_reason := FORMAT(
        'The latest rendered App Store page contains multiple prices, but the selected price has page consensus: %s %s appears %s times vs runner-up %s. Auto approved and older conflicting samples are ignored.',
        v_group.latest_currency,
        v_group.latest_raw_price,
        v_group.latest_modal_count,
        v_group.latest_runner_up_count
      );
    ELSIF v_group.raw_price_count <> 1 OR v_group.currency_count <> 1 THEN
      v_decision := 'manual_review';
      v_reason_code := 'app_store_price_changed';
      v_reason := FORMAT(
        'The latest %s App Store original-currency prices are not consistent.',
        p_required_samples
      );
    ELSIF v_group.has_usd_text_currency_mismatch THEN
      v_decision := 'manual_review';
      v_reason_code := 'app_store_currency_mismatch';
      v_reason := 'Original App Store price text contains USD but the parsed observation currency is not USD.';
    ELSIF v_group.has_local_dollar_parsed_as_usd THEN
      v_decision := 'manual_review';
      v_reason_code := 'app_store_local_dollar_parsed_as_usd';
      v_reason := 'Original App Store price text did not contain USD, but the parsed currency is USD for a non-USD country.';
    ELSIF v_group.min_converted_usd < 1 THEN
      v_decision := 'manual_review';
      v_reason_code := 'app_store_price_suspiciously_low';
      v_reason := FORMAT(
        'App Store converted price is below 1 USD (%s USD). This may indicate currency or price-text parsing error, so it requires manual review.',
        v_group.min_converted_usd
      );
    ELSIF v_group.has_global_price_outlier THEN
      v_decision := 'manual_review';
      v_reason_code := 'app_store_global_price_outlier';
      v_reason := FORMAT(
        'App Store converted price (%s USD) is far from the peer-country median (%s USD across %s countries). This may indicate parsing or currency conversion error.',
        ROUND(v_group.stable_converted_usd, 2),
        ROUND(v_group.peer_median_usd, 2),
        v_group.peer_count
      );
    ELSIF v_group.has_plan_order_conflict THEN
      v_decision := 'manual_review';
      v_reason_code := 'app_store_plan_order_conflict';
      v_reason := v_group.plan_order_conflict_reason;
    ELSE
      v_decision := 'auto_approve';
      v_reason_code := 'app_store_three_sample_consensus';
      v_reason := FORMAT(
        'The latest %s App Store samples match: %s %s. Auto approved.',
        p_required_samples,
        v_group.stable_currency,
        v_group.stable_raw_price
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
    SELECT
      v_run_id,
      v_group.product_id,
      v_group.plan_id,
      v_group.country_id,
      v_group.price_type,
      v_decision,
      v_reason_code,
      v_reason,
      p_required_samples,
      v_group.observation_ids,
      ARRAY[v_group.billing_platform::TEXT],
      MIN(po.converted_usd),
      MAX(po.converted_usd),
      ROUND(MAX(po.converted_usd) - MIN(po.converted_usd), 4),
      CASE
        WHEN AVG(po.converted_usd) IS NULL OR AVG(po.converted_usd) = 0 THEN NULL
        ELSE ROUND(((MAX(po.converted_usd) - MIN(po.converted_usd)) / AVG(po.converted_usd)) * 100, 4)
      END
    FROM price_observations po
    WHERE po.id = ANY(v_group.observation_ids);

    IF v_decision = 'auto_approve' THEN
      v_observation_ids_to_approve := CASE
        WHEN v_reason_code = 'app_store_modal_price_consensus'
          OR v_reason_code = 'app_store_clean_pair_after_rule_fix'
          THEN ARRAY[v_group.latest_observation_id]::UUID[]
        ELSE COALESCE(v_group.pending_observation_ids, ARRAY[]::UUID[])
      END;

      v_auto_approved_count := v_auto_approved_count + CARDINALITY(COALESCE(v_observation_ids_to_approve, ARRAY[]::UUID[]));

      IF NOT p_dry_run THEN
        FOREACH v_observation_id IN ARRAY COALESCE(v_observation_ids_to_approve, ARRAY[]::UUID[])
        LOOP
          v_region_price_id := approve_price_observation(v_observation_id);

          UPDATE price_observations
          SET raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
            'auto_review_run_id', v_run_id::TEXT,
            'auto_review_rule', 'app_store_stability',
            'auto_review_decision', v_decision,
            'auto_review_reason_code', v_reason_code,
            'auto_review_reason', v_reason,
            'auto_approved_at', NOW()::TEXT
          )
          WHERE id = v_observation_id;
        END LOOP;

        IF v_reason_code IN ('app_store_modal_price_consensus', 'app_store_clean_pair_after_rule_fix') THEN
          UPDATE price_observations
          SET
            status = 'ignored'::observation_status,
            raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
              'ignored_at', NOW()::TEXT,
              'ignore_reason', 'Superseded by a newer App Store auto-review consensus.',
              'auto_review_run_id', v_run_id::TEXT,
              'auto_review_rule', 'app_store_stability',
              'auto_review_decision', 'ignored',
              'auto_review_reason_code', 'superseded_by_app_store_consensus',
              'auto_review_reason', v_reason
            ),
            updated_at = NOW()
          WHERE id = ANY(COALESCE(v_group.pending_observation_ids, ARRAY[]::UUID[]))
            AND id <> ALL(COALESCE(v_observation_ids_to_approve, ARRAY[]::UUID[]))
            AND status = 'pending'::observation_status;
        END IF;
      END IF;
    ELSE
      v_manual_review_count := v_manual_review_count + CARDINALITY(COALESCE(v_group.pending_observation_ids, ARRAY[]::UUID[]));

      IF NOT p_dry_run THEN
        UPDATE price_observations
        SET raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
          'auto_review_run_id', v_run_id::TEXT,
          'auto_review_rule', 'app_store_stability',
          'auto_review_decision', v_decision,
          'auto_review_reason_code', v_reason_code,
          'auto_review_reason', v_reason,
          'review_note', v_reason
        ),
        updated_at = NOW()
        WHERE id = ANY(COALESCE(v_group.pending_observation_ids, ARRAY[]::UUID[]))
          AND status = 'pending'::observation_status;
      END IF;
    END IF;

    run_id := v_run_id;
    decision := v_decision;
    reason_code := v_reason_code;
    reason := v_reason;
    product_slug := v_group.product_slug;
    plan_slug := v_group.plan_slug;
    country_code := v_group.country_code;
    source_count := p_required_samples;
    platforms := ARRAY[v_group.billing_platform::TEXT];
    observation_count := v_group.observation_count;
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
