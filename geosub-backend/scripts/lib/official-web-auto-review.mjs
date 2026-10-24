import { spotifyMarkets } from './spotify-official-web.mjs';

const ruleId = 'spotify-regional-monthly-stability-v2';

export function assertAutomaticWebSource(source) {
  if (source.product_slug !== 'spotify' || source.source_key !== 'spotify-official-web'
    || source.parser_key !== 'spotify_official_web' || source.parser_version !== 'spotify-official-web-v2'
    || source.billing_cycle !== 'monthly' || source.auto_review?.rule_id !== ruleId
    || source.source_level !== 'A' || source.fetch_mode !== 'structured_http'
    || source.base_url !== 'https://www.spotify.com/us/premium/'
    || source.required_plan_slugs.join(',') !== 'individual,family'
    || source.markets.length !== Object.keys(spotifyMarkets).length
    || new Set(source.markets.map(market => market.country_code)).size !== source.markets.length
    || source.markets.some(market => {
      const allowed = spotifyMarkets[market.country_code];
      return !allowed || market.currency !== allowed.currency || market.locale !== allowed.locale
        || market.url !== `https://www.spotify.com/${allowed.path}/premium/`
        || JSON.stringify(market.required_plan_slugs) !== JSON.stringify(allowed.plan_slugs);
    })) {
    throw Error('automatic_web_source_not_allowlisted');
  }
}

// Time-separated observations measure local price stability; neither retries
// nor exchange-rate movement are evidence of a subscription-price change.
export function decideOfficialWebReview(samples, baseline, now = new Date(), market = {country_code:'US',currency:'USD',url:'https://www.spotify.com/us/premium/'}) {
  const distinct = [...new Map(samples.map(sample => [sample.observed_at.toISOString(), sample])).values()]
    .sort((a, b) => b.observed_at - a.observed_at);
  const latest = distinct[0];
  if (!latest) return { decision: 'waiting', reason: 'awaiting_samples' };
  const changed = baseline && Math.abs(Number(latest.raw_price) / Number(baseline.local_price) - 1) > 0.30;
  const count = changed ? 5 : 3;
  const spanHours = changed ? 72 : 24;
  const hours = (a, b) => (a - b) / 3_600_000;
  const window = distinct.slice(0, count);
  // Minimum sample count and elapsed time are separate gates. With a 12-hour
  // schedule a 72-hour change window needs seven samples, not the latest five.
  while (window.length < distinct.length
    && hours(latest.observed_at, window.at(-1).observed_at) < spanHours) {
    window.push(distinct[window.length]);
  }
  if (window.some(row => row.anomaly_flag || row.status === 'rejected' || !row.evidence_ok || row.source_level !== 'A'
    || Number(row.confidence_score) < 80 || row.currency !== market.currency
    || !Number.isFinite(Number(row.raw_price)) || Number(row.raw_price) <= 0 || Number(row.raw_price) >= 1_000_000
    || row.raw_payload?.billing_cycle !== 'monthly'
    || row.raw_payload?.publication_eligible !== true
    || row.raw_payload?.automatic_rule !== ruleId || row.raw_payload?.requested_country !== market.country_code
    || row.raw_payload?.source_url !== market.url
    || row.raw_payload?.final_url !== market.url
    || row.raw_payload?.render_mode !== 'structured_http')) {
    return { decision: 'isolated', reason: 'incomplete_or_anomalous_evidence' };
  }
  if (window.some(row => Number(row.raw_price) !== Number(latest.raw_price))) {
    return { decision: 'isolated', reason: 'unstable_local_price' };
  }
  if (window.length < count) return { decision: 'waiting', reason: changed ? 'large_change_extended_observation' : 'awaiting_samples' };
  if (hours(now, latest.observed_at) < 0 || hours(now, latest.observed_at) > 48
    || window.some(row => hours(now, row.observed_at) > 7 * 24)) {
    return { decision: 'waiting', reason: 'stale_evidence' };
  }
  if (hours(latest.observed_at, window.at(-1).observed_at) < spanHours
    || window.slice(1).some((row, i) => hours(window[i].observed_at, row.observed_at) < 6)) {
    return { decision: 'waiting', reason: 'independent_sample_span_not_met' };
  }
  return { decision: 'approved', reason: 'stable_official_monthly_price',
    observation: latest, observationIds: window.map(row => row.id),
    confidenceScore: Math.min(...window.map(row => Number(row.confidence_score))) };
}

export async function reviewOfficialWebMarket({ client, source, market, database, sourceId }) {
  assertAutomaticWebSource(source);
  if (!source.markets.some(item => item.country_code === market.country_code && item.currency === market.currency && item.url === market.url)) throw Error('automatic_web_market_not_allowlisted');
  const product = database.product;
  const country = database.countries.get(market.country_code);
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`official_web:${product.id}:${country.id}`]);
    const context = await client.query(`SELECT p.status::text AS product_status, s.status::text AS source_status,
      s.source_key, s.type::text AS source_type, s.base_url FROM products p CROSS JOIN price_sources s
      WHERE p.id=$1 AND s.id=$2 FOR SHARE OF p,s`, [product.id, sourceId]);
    const state = context.rows[0];
    if (!state || !['draft','review','published'].includes(state.product_status)
      || state.source_status !== 'active' || state.source_type !== 'official_page'
      || state.source_key !== source.source_key || state.base_url !== source.base_url) {
      throw Error('automatic_web_context_changed');
    }
    const decisions = [];
    for (const slug of market.required_plan_slugs ?? source.required_plan_slugs) {
      const plan = database.plans.get(slug);
      const check = await client.query("SELECT status::text,billing_cycle::text FROM plans WHERE id=$1 AND product_id=$2 FOR SHARE", [plan.id,product.id]);
      if (!check.rows[0] || check.rows[0].status === 'archived' || check.rows[0].billing_cycle !== 'monthly') throw Error('automatic_web_plan_changed');
      const prices = await client.query(`SELECT id, local_price, primary_source_id, status FROM region_prices WHERE product_id=$1
        AND plan_id=$2 AND country_id=$3 AND billing_platform='web' AND price_type='list_price' FOR UPDATE`,
        [product.id,plan.id,country.id]);
      if (prices.rows[0]?.primary_source_id && prices.rows[0].primary_source_id !== sourceId) throw Error('automatic_web_source_replacement_not_allowed');
      if (prices.rows[0]?.status === 'archived') throw Error('automatic_web_archived_price');
      const samples = await client.query(`SELECT o.*, EXISTS(SELECT 1 FROM source_evidence e
          WHERE e.observation_id=o.id AND e.http_status=200 AND e.final_url=$5
          AND e.content_hash=o.raw_payload->>'content_hash' AND length(e.content_hash)=64
          AND e.captured_at=o.observed_at AND e.country_context=$8) AS evidence_ok
        FROM price_observations o WHERE o.product_id=$1 AND o.plan_id=$2 AND o.country_id=$3
          AND o.source_id=$4 AND o.billing_platform='web' AND o.price_type='list_price'
          AND o.parser_version=$6 AND o.raw_payload->>'automatic_rule'=$7
        ORDER BY o.observed_at DESC,o.created_at DESC LIMIT 40`,
        [product.id,plan.id,country.id,sourceId,market.url,source.parser_version,ruleId,market.country_code]);
      const result = decideOfficialWebReview(samples.rows, prices.rows[0],new Date(),market);
      decisions.push({ ...result, planSlug: slug, planId: plan.id });
    }
    // A partly parsed/unstable market cannot make a new product public.
    if (decisions.some(result => result.decision !== 'approved')) {
      await client.query('COMMIT');
      return { published: 0, decisions: decisions.map(({observation, ...result}) => result) };
    }
    let fxRate = 1;
    let fxDate = null;
    if (market.currency !== 'USD') {
      const fx = await client.query(`SELECT rate,rate_date FROM exchange_rates
        WHERE base_currency='USD' AND quote_currency=$1 AND status='active'
          AND rate_date>=CURRENT_DATE-INTERVAL '2 days'
        ORDER BY is_latest DESC,rate_date DESC,fetched_at DESC LIMIT 1`, [market.currency]);
      fxRate = Number(fx.rows[0]?.rate);
      fxDate = fx.rows[0]?.rate_date ?? null;
      if (!Number.isFinite(fxRate) || fxRate <= 0) {
        await client.query('COMMIT');
        return { published: 0, decisions: [{decision:'waiting',reason:'current_exchange_rate_missing'}] };
      }
    }
    for (const result of decisions) {
      const usd = Math.round(Number(result.observation.raw_price) / fxRate * 100) / 100;
      if (usd < 0.5 || usd > 100) {
        await client.query('COMMIT');
        return { published: 0, decisions: [{decision:'isolated',reason:'converted_price_out_of_bounds'}] };
      }
      result.usd = usd;
      if (market.country_code === 'US') {
        result.usBase = usd;
      } else {
        const baseline = await client.query(`SELECT price_usd FROM region_prices WHERE plan_id=$1
          AND country_id=(SELECT id FROM countries WHERE code='US') AND billing_platform='web'
          AND price_type='list_price' AND status='published' AND data_quality='verified'`,[result.planId]);
        result.usBase = Number(baseline.rows[0]?.price_usd);
        if (!Number.isFinite(result.usBase) || result.usBase <= 0) {
          await client.query('COMMIT');
          return { published: 0, decisions: [{decision:'waiting',reason:'published_us_baseline_missing'}] };
        }
      }
    }
    let published = 0;
    for (const result of decisions) {
      const row = result.observation;
      if (row.status === 'approved') continue;
      if (row.status !== 'pending') throw Error('automatic_web_latest_not_pending');
      const price = await client.query(`INSERT INTO region_prices
        (id,product_id,plan_id,country_id,local_price,currency,price_usd,us_base_price,diff_vs_us_percent,
         billing_platform,price_type,primary_source_id,confidence_score,data_quality,status,last_checked_at,
         source_summary,availability_note,published_at,created_at,updated_at)
        VALUES(gen_random_uuid(),$1,$2,$3,$4,$10,$11,$12,$13,'web','list_price',$5,$9,'verified','published',$6,$7,$8,NOW(),NOW(),NOW())
        ON CONFLICT(plan_id,country_id,billing_platform,price_type) DO UPDATE SET
          local_price=EXCLUDED.local_price,currency=EXCLUDED.currency,price_usd=EXCLUDED.price_usd,
          us_base_price=EXCLUDED.us_base_price,diff_vs_us_percent=EXCLUDED.diff_vs_us_percent,primary_source_id=EXCLUDED.primary_source_id,
          confidence_score=EXCLUDED.confidence_score,data_quality='verified',status='published',last_checked_at=EXCLUDED.last_checked_at,
          source_summary=EXCLUDED.source_summary,availability_note=EXCLUDED.availability_note,updated_at=NOW()
        RETURNING id`, [product.id,result.planId,country.id,row.raw_price,sourceId,row.observed_at,
        `Spotify official ${market.country_code} Web regular monthly price; ${ruleId}`,row.raw_payload.availability_note ?? null,result.confidenceScore,
        market.currency,result.usd,result.usBase,Math.round((result.usd/result.usBase-1)*10000)/100]);
      await client.query(`UPDATE price_observations SET status='approved',converted_usd=$5,
        raw_payload=raw_payload||jsonb_build_object('fx_rate_date',$6::text,'automatic_review',jsonb_build_object('rule_id',$2::text,
        'observation_ids',$3::jsonb,'approved_at',NOW(),'region_price_id',$4::text,'fx_rate_date',$6::text)),updated_at=NOW()
        WHERE id=$1 AND status='pending'`, [row.id,ruleId,JSON.stringify(result.observationIds),price.rows[0].id,result.usd,
          typeof fxDate === 'string' ? fxDate.slice(0,10) : fxDate?.toISOString?.().slice(0,10) ?? null]);
      await client.query(`UPDATE price_observations SET status='ignored',updated_at=NOW(),
        raw_payload=raw_payload||jsonb_build_object('automatic_resolution','superseded_by_stable_official_web_price','resolved_by',$6::text)
        WHERE product_id=$1 AND plan_id=$2 AND country_id=$3 AND source_id=$4 AND billing_platform='web'
          AND price_type='list_price' AND status='pending' AND observed_at<$5
          AND raw_payload->>'automatic_rule'=$7`,
        [product.id,result.planId,country.id,sourceId,row.observed_at,row.id,ruleId]);
      published++;
    }
    if (market.country_code === 'US' && published > 0) {
      await client.query(`UPDATE region_prices regional SET
          us_base_price=baseline.price_usd,
          diff_vs_us_percent=ROUND((regional.price_usd/NULLIF(baseline.price_usd,0)-1)*100,2),
          updated_at=NOW()
        FROM region_prices baseline
        WHERE regional.product_id=$1 AND regional.billing_platform='web'
          AND regional.price_type='list_price' AND regional.status='published'
          AND regional.country_id<>$2 AND regional.plan_id=baseline.plan_id
          AND baseline.product_id=$1 AND baseline.country_id=$2
          AND baseline.billing_platform='web' AND baseline.price_type='list_price'
          AND baseline.status='published' AND baseline.price_usd>0`,[product.id,country.id]);
    }
    // Trigger 054 only promotes products for App Store completions. This source
    // supplies its own equivalent gate after *all* canonical Web plans passed.
    if (source.auto_review.publish_product === true) {
      await client.query(`UPDATE products SET status='published',description=COALESCE($2,description),updated_at=NOW()
        WHERE id=$1 AND status IN ('draft','review')`, [product.id,source.public_description ?? null]);
    }
    await client.query('COMMIT');
    return { published, decisions: decisions.map(({observation,...result}) => result) };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}
