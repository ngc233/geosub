/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");

const { Client } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Please check .env file.");
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function one(sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0];
}

async function many(sql, params = []) {
  return client.query(sql, params);
}

async function upsertProduct({ slug, name, provider, description, officialUrl, sortOrder }) {
  return one(
    `
      INSERT INTO products (
        id, slug, name, category, provider, description, official_url,
        status, featured, sort_order, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, 'ai'::product_category, $3, $4, $5,
        'published'::publish_status, TRUE, $6, NOW(), NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        provider = EXCLUDED.provider,
        description = EXCLUDED.description,
        official_url = EXCLUDED.official_url,
        status = 'published'::publish_status,
        featured = TRUE,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      RETURNING id, slug
    `,
    [slug, name, provider, description, officialUrl, sortOrder]
  );
}

async function upsertPlan(productId, { slug, name, description, sortOrder }) {
  return one(
    `
      INSERT INTO plans (
        id, product_id, slug, name, billing_cycle, description,
        status, sort_order, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, 'monthly'::billing_cycle, $4,
        'published'::publish_status, $5, NOW(), NOW()
      )
      ON CONFLICT (product_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = 'published'::publish_status,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      RETURNING id, slug
    `,
    [productId, slug, name, description, sortOrder]
  );
}

async function upsertSource({
  sourceKey,
  name,
  sourceLevel,
  type,
  provider,
  baseUrl,
  requiresJavascript = false,
  requiresGeo = false,
  reliabilityScore,
  note,
}) {
  return one(
    `
      INSERT INTO price_sources (
        id, source_key, name, source_level, type, provider, base_url,
        requires_javascript, requires_geo, reliability_score, status,
        note, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3::source_level, $4::price_source_type,
        $5, $6, $7, $8, $9, 'active'::source_status, $10, NOW(), NOW()
      )
      ON CONFLICT (source_key) DO UPDATE SET
        name = EXCLUDED.name,
        source_level = EXCLUDED.source_level,
        type = EXCLUDED.type,
        provider = EXCLUDED.provider,
        base_url = EXCLUDED.base_url,
        requires_javascript = EXCLUDED.requires_javascript,
        requires_geo = EXCLUDED.requires_geo,
        reliability_score = EXCLUDED.reliability_score,
        status = 'active'::source_status,
        note = EXCLUDED.note,
        updated_at = NOW()
      RETURNING id, source_key
    `,
    [sourceKey, name, sourceLevel, type, provider, baseUrl, requiresJavascript, requiresGeo, reliabilityScore, note]
  );
}

async function upsertRegionPrice({ productId, planId, countryCode, localPrice, currency, priceUsd, usBasePrice, sourceId }) {
  const country = await one("SELECT id FROM countries WHERE code = $1", [countryCode]);
  if (!country) return null;

  return one(
    `
      INSERT INTO region_prices (
        id, product_id, plan_id, country_id, local_price, currency, price_usd,
        us_base_price, diff_vs_us_percent, billing_platform, price_type,
        tax_note, availability_note, source_summary, primary_source_id,
        confidence_score, data_quality, status, last_checked_at,
        published_at, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4::numeric, $5, $6::numeric, $7::numeric,
        ROUND((($6::numeric - $7::numeric) / NULLIF($7::numeric, 0)) * 100, 2),
        'web'::billing_platform, 'list_price'::price_type,
        'Local demo tax profile', 'Available in local demo data',
        'Seeded local demo source', $8, 82, 'verified'::data_quality,
        'published'::publish_status, NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days', NOW(), NOW()
      )
      ON CONFLICT (plan_id, country_id, billing_platform, price_type) DO UPDATE SET
        local_price = EXCLUDED.local_price,
        currency = EXCLUDED.currency,
        price_usd = EXCLUDED.price_usd,
        us_base_price = EXCLUDED.us_base_price,
        diff_vs_us_percent = EXCLUDED.diff_vs_us_percent,
        source_summary = EXCLUDED.source_summary,
        primary_source_id = EXCLUDED.primary_source_id,
        confidence_score = EXCLUDED.confidence_score,
        data_quality = EXCLUDED.data_quality,
        status = 'published'::publish_status,
        last_checked_at = EXCLUDED.last_checked_at,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
      RETURNING id
    `,
    [productId, planId, country.id, localPrice, currency, priceUsd, usBasePrice, sourceId]
  );
}

async function ensureCollectorJob({
  sourceId,
  productId,
  candidateId = null,
  discoverySourceId = null,
  collectorKind,
  priority = 60,
  jobType = "price_check",
  config = {},
}) {
  const jobConfig = { collector_kind: collectorKind, demo_seed: "geosub-local-demo", ...config };
  const existing = await one(
    `
      SELECT id FROM collector_jobs
      WHERE source_id = $1
        AND COALESCE(product_id::text, '') = COALESCE($2::uuid::text, '')
        AND job_config ->> 'collector_kind' = $3::text
      LIMIT 1
    `,
    [sourceId, productId, collectorKind]
  );

  if (existing) {
    await many(
      `
        UPDATE collector_jobs
        SET status = 'active',
            schedule = 'daily',
            job_type = $6::text,
            discovery_candidate_id = COALESCE($2::uuid, discovery_candidate_id),
            discovery_source_id = COALESCE($3::uuid, discovery_source_id),
            job_config = $7::jsonb,
            priority = $5::int,
            next_run_at = NOW() + INTERVAL '6 hours',
            last_run_at = NOW() - INTERVAL '1 day',
            success_count = GREATEST(success_count, 2),
            updated_at = NOW()
        WHERE id = $1
      `,
      [existing.id, candidateId, discoverySourceId, collectorKind, priority, jobType, JSON.stringify(jobConfig)]
    );
    return existing;
  }

  return one(
    `
      INSERT INTO collector_jobs (
        id, source_id, product_id, discovery_candidate_id, discovery_source_id,
        job_type, schedule, status, last_run_at, next_run_at,
        success_count, error_count, job_config, priority, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, $7::text, 'daily', 'active',
        NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 hours',
        2, 0, $8::jsonb,
        $6::int, NOW(), NOW()
      )
      RETURNING id
    `,
    [sourceId, productId, candidateId, discoverySourceId, collectorKind, priority, jobType, JSON.stringify(jobConfig)]
  );
}

async function main() {
  await client.connect();
  await many("BEGIN");

  try {
    const chatgpt = await upsertProduct({
      slug: "chatgpt",
      name: "ChatGPT",
      provider: "OpenAI",
      description: "AI assistant subscription with regional pricing.",
      officialUrl: "https://chatgpt.com/",
      sortOrder: 10,
    });
    const claude = await upsertProduct({
      slug: "claude",
      name: "Claude",
      provider: "Anthropic",
      description: "Anthropic assistant subscription for writing, coding and research.",
      officialUrl: "https://claude.ai/",
      sortOrder: 20,
    });
    const gemini = await upsertProduct({
      slug: "gemini",
      name: "Gemini",
      provider: "Google",
      description: "Google AI subscription used for multimodal assistant workflows.",
      officialUrl: "https://gemini.google.com/",
      sortOrder: 30,
    });

    const chatgptPlus = await upsertPlan(chatgpt.id, {
      slug: "plus",
      name: "Plus",
      description: "ChatGPT Plus monthly plan.",
      sortOrder: 10,
    });
    const claudePro = await upsertPlan(claude.id, {
      slug: "pro",
      name: "Pro",
      description: "Claude Pro monthly plan.",
      sortOrder: 10,
    });
    await upsertPlan(gemini.id, {
      slug: "plus",
      name: "Google AI Plus",
      description: "Google AI Plus monthly App Store plan.",
      sortOrder: 10,
    });
    const geminiPro = await upsertPlan(gemini.id, {
      slug: "pro",
      name: "Google AI Pro",
      description: "Google AI Pro monthly App Store plan.",
      sortOrder: 20,
    });
    await upsertPlan(gemini.id, {
      slug: "ultra",
      name: "Google AI Ultra",
      description: "Google AI Ultra monthly App Store plan.",
      sortOrder: 30,
    });

    const openAiOfficial = await upsertSource({
      sourceKey: "local-demo-openai-official",
      name: "OpenAI Official Pricing",
      sourceLevel: "A",
      type: "official_page",
      provider: "OpenAI",
      baseUrl: "https://openai.com/",
      reliabilityScore: 92,
      note: "Local demo source for review and collector screens.",
    });
    const openAiAppStore = await upsertSource({
      sourceKey: "local-demo-chatgpt-app-store",
      name: "ChatGPT App Store",
      sourceLevel: "B",
      type: "app_store",
      provider: "Apple",
      baseUrl: "https://apps.apple.com/app/chatgpt/id6448311069",
      requiresJavascript: true,
      requiresGeo: true,
      reliabilityScore: 78,
      note: "Local demo app store collector source.",
    });
    const anthropicOfficial = await upsertSource({
      sourceKey: "local-demo-anthropic-official",
      name: "Anthropic Official Pricing",
      sourceLevel: "A",
      type: "official_page",
      provider: "Anthropic",
      baseUrl: "https://www.anthropic.com/pricing",
      reliabilityScore: 88,
      note: "Local demo source for Claude.",
    });
    const googleOfficial = await upsertSource({
      sourceKey: "local-demo-google-gemini-official",
      name: "Google Gemini Pricing",
      sourceLevel: "B",
      type: "official_page",
      provider: "Google",
      baseUrl: "https://one.google.com/about/ai-premium/",
      reliabilityScore: 84,
      note: "Local demo source for Gemini.",
    });
    const googleAppStore = await upsertSource({
      sourceKey: "gemini-app-store",
      name: "Gemini App Store",
      sourceLevel: "B",
      type: "app_store",
      provider: "Apple",
      baseUrl: "https://apps.apple.com/app/google-gemini/id6477489729",
      requiresJavascript: true,
      requiresGeo: true,
      reliabilityScore: 78,
      note: "App Store source for Google Gemini in-app subscription tiers.",
    });

    await upsertRegionPrice({ productId: chatgpt.id, planId: chatgptPlus.id, countryCode: "US", localPrice: 20, currency: "USD", priceUsd: 20, usBasePrice: 20, sourceId: openAiOfficial.id });
    await upsertRegionPrice({ productId: chatgpt.id, planId: chatgptPlus.id, countryCode: "JP", localPrice: 3000, currency: "JPY", priceUsd: 19.2, usBasePrice: 20, sourceId: openAiOfficial.id });
    await upsertRegionPrice({ productId: chatgpt.id, planId: chatgptPlus.id, countryCode: "IN", localPrice: 1999, currency: "INR", priceUsd: 23.9, usBasePrice: 20, sourceId: openAiOfficial.id });
    await upsertRegionPrice({ productId: claude.id, planId: claudePro.id, countryCode: "US", localPrice: 20, currency: "USD", priceUsd: 20, usBasePrice: 20, sourceId: anthropicOfficial.id });
    await upsertRegionPrice({ productId: claude.id, planId: claudePro.id, countryCode: "GB", localPrice: 18, currency: "GBP", priceUsd: 22.7, usBasePrice: 20, sourceId: anthropicOfficial.id });
    await upsertRegionPrice({ productId: gemini.id, planId: geminiPro.id, countryCode: "US", localPrice: 19.99, currency: "USD", priceUsd: 19.99, usBasePrice: 19.99, sourceId: googleOfficial.id });
    await upsertRegionPrice({ productId: gemini.id, planId: geminiPro.id, countryCode: "SG", localPrice: 29.98, currency: "SGD", priceUsd: 22.2, usBasePrice: 19.99, sourceId: googleOfficial.id });

    const discoverySource = await one(
      `
        INSERT INTO discovery_sources (
          name, source_type, url, category_hint, query, scan_interval_hours,
          status, reliability_score, last_checked_at, last_success_at, note,
          raw_config, strategy, promote_threshold, watch_threshold, created_at, updated_at
        )
        VALUES (
          'AI launch radar', 'rss'::discovery_candidate_source_type,
          'https://example.com/geosub-local-ai-launches', 'ai'::product_category,
          'ai subscription pricing launch', 12, 'active'::discovery_source_status,
          82, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours',
          'Local demo discovery feed with recent product launch signals.',
          jsonb_build_object('demo_seed', 'geosub-local-demo'),
          'announcement_feed', 65, 45, NOW(), NOW()
        )
        ON CONFLICT (url) DO UPDATE SET
          name = EXCLUDED.name,
          status = 'active'::discovery_source_status,
          last_checked_at = EXCLUDED.last_checked_at,
          last_success_at = EXCLUDED.last_success_at,
          note = EXCLUDED.note,
          raw_config = EXCLUDED.raw_config,
          strategy = EXCLUDED.strategy,
          updated_at = NOW()
        RETURNING id
      `
    );

    let perplexity = await one("SELECT id FROM product_discovery_candidates WHERE suggested_slug = 'perplexity-pro' LIMIT 1");
    if (!perplexity) {
      perplexity = await one(
        `
          INSERT INTO product_discovery_candidates (
            name, suggested_slug, suggested_category, provider, official_url,
            app_store_url, pricing_url, source_type, source_name, source_url,
            discovery_reason, confidence_score, status, raw_payload,
            first_seen_at, last_seen_at, created_at, updated_at
          )
          VALUES (
            'Perplexity Pro', 'perplexity-pro', 'ai'::product_category, 'Perplexity',
            'https://www.perplexity.ai/', 'https://apps.apple.com/app/perplexity-ask-anything/id1668000334',
            'https://www.perplexity.ai/pro', 'rss'::discovery_candidate_source_type,
            'AI launch radar', 'https://example.com/geosub-local-ai-launches',
            'Demo candidate found by launch radar with pricing and app-store signals.',
            86, 'new'::discovery_candidate_status,
            jsonb_build_object('demo_seed', 'geosub-local-demo'),
            NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours', NOW(), NOW()
          )
          RETURNING id
        `
      );
    }

    await many("UPDATE discovery_sources SET last_candidate_id = $1 WHERE id = $2", [perplexity.id, discoverySource.id]);

    const chatgptOfficialJob = await ensureCollectorJob({
      sourceId: openAiOfficial.id,
      productId: chatgpt.id,
      collectorKind: "official_site",
      priority: 70,
    });
    const chatgptAppStoreJob = await ensureCollectorJob({
      sourceId: openAiAppStore.id,
      productId: chatgpt.id,
      collectorKind: "app_store",
      priority: 78,
    });
    const claudeJob = await ensureCollectorJob({
      sourceId: anthropicOfficial.id,
      productId: claude.id,
      collectorKind: "official_site",
      priority: 65,
    });
    await ensureCollectorJob({
      sourceId: googleOfficial.id,
      productId: gemini.id,
      collectorKind: "official_site",
      priority: 62,
    });
    const geminiAppStoreJob = await ensureCollectorJob({
      sourceId: googleAppStore.id,
      productId: gemini.id,
      collectorKind: "app_store",
      priority: 82,
      jobType: "ai_pricing",
      config: {
        source_kind: "app-store",
        app_store_id: "6477489729",
        country_codes: [
          "US", "JP", "SG", "GB", "DE", "FR", "IN", "BR", "CA", "AU",
          "KR", "MX", "TR", "ID", "PH", "TH", "MY", "VN", "ZA", "NG",
          "AE", "SA", "IL", "EG", "KE", "SE", "NO", "DK", "NL", "CH",
          "PL", "IT", "ES", "CL", "CO", "AR", "NZ", "PK", "TW",
        ],
      },
    });
    await ensureCollectorJob({
      sourceId: openAiAppStore.id,
      productId: null,
      candidateId: perplexity.id,
      discoverySourceId: discoverySource.id,
      collectorKind: "app_store",
      priority: 82,
    });

    await many("DELETE FROM collector_job_runs WHERE raw_payload ->> 'demo_seed' = 'geosub-local-demo'");
    await many(
      `
        INSERT INTO collector_job_runs (
          job_id, product_id, source_id, status, collector_kind, started_at,
          finished_at, duration_ms, output_excerpt, raw_payload
        )
        VALUES
          ($1, $2, $3, 'succeeded', 'official_site', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '8 seconds', 8210, 'Parsed 3 regional prices from official page.', jsonb_build_object('demo_seed', 'geosub-local-demo')),
          ($4, $2, $5, 'succeeded', 'app_store', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours' + INTERVAL '12 seconds', 12014, 'Found App Store subscription tiers for JP and SG.', jsonb_build_object('demo_seed', 'geosub-local-demo')),
          ($6, $7, $8, 'failed', 'official_site', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours' + INTERVAL '4 seconds', 4210, 'Selector changed; queued for parser review.', jsonb_build_object('demo_seed', 'geosub-local-demo')),
          ($9, $10, $11, 'queued', 'app_store', NOW() - INTERVAL '10 minutes', NULL, NULL, 'Gemini App Store collection is queued for the next collector run.', jsonb_build_object('demo_seed', 'geosub-local-demo'))
      `,
      [chatgptOfficialJob.id, chatgpt.id, openAiOfficial.id, chatgptAppStoreJob.id, openAiAppStore.id, claudeJob.id, claude.id, anthropicOfficial.id, geminiAppStoreJob.id, gemini.id, googleAppStore.id]
    );

    await many("DELETE FROM price_observations WHERE raw_payload ->> 'demo_seed' = 'geosub-local-demo'");
    await many(
      `
        INSERT INTO price_observations (
          id, product_id, plan_id, country_id, source_id, source_level,
          raw_price, currency, converted_usd, observed_at, source_url, locale,
          ip_country, billing_platform, price_type, tax_included, raw_payload,
          parser_version, confidence_score, anomaly_flag, anomaly_reason,
          status, created_at, updated_at
        )
        SELECT
          gen_random_uuid(), item.product_id, item.plan_id, c.id, item.source_id,
          item.source_level::source_level, item.raw_price, item.currency,
          item.converted_usd, item.observed_at, item.source_url, item.locale,
          item.country_code, item.billing_platform::billing_platform,
          'list_price'::price_type, item.tax_included::tax_included,
          jsonb_build_object('demo_seed', 'geosub-local-demo', 'collector_kind', item.collector_kind),
          'local-demo-v1', item.confidence_score, item.anomaly_flag,
          item.anomaly_reason, item.status::observation_status, NOW(), NOW()
        FROM (
          VALUES
            ($1::uuid, $2::uuid, 'JP', $3::uuid, 'B', 3000.00::numeric, 'JPY', 19.20::numeric, NOW() - INTERVAL '6 hours', 'https://apps.apple.com/jp/app/chatgpt/id6448311069', 'ja-JP', 'ios', 'true', 'app_store', 76, FALSE, NULL, 'pending'),
            ($1::uuid, $2::uuid, 'SG', $3::uuid, 'B', 29.98::numeric, 'SGD', 22.20::numeric, NOW() - INTERVAL '6 hours', 'https://apps.apple.com/sg/app/chatgpt/id6448311069', 'en-SG', 'ios', 'true', 'app_store', 73, TRUE, 'More than 8% above US web baseline.', 'pending'),
            ($4::uuid, $5::uuid, 'GB', $6::uuid, 'A', 18.00::numeric, 'GBP', 22.70::numeric, NOW() - INTERVAL '1 day', 'https://www.anthropic.com/pricing', 'en-GB', 'web', 'false', 'official_site', 88, FALSE, NULL, 'approved')
        ) AS item(product_id, plan_id, country_code, source_id, source_level, raw_price, currency, converted_usd, observed_at, source_url, locale, billing_platform, tax_included, collector_kind, confidence_score, anomaly_flag, anomaly_reason, status)
        JOIN countries c ON c.code = item.country_code
      `,
      [chatgpt.id, chatgptPlus.id, openAiAppStore.id, claude.id, claudePro.id, anthropicOfficial.id]
    );

    await many("DELETE FROM discovery_source_checks WHERE trigger_payload ->> 'demo_seed' = 'geosub-local-demo'");
    await many(
      `
        INSERT INTO discovery_source_checks (
          source_id, status, http_status, final_url, content_hash, title,
          summary, changed, candidate_id, checked_at, change_kind,
          importance_score, matched_keywords, trigger_url, trigger_external_id,
          trigger_published_at, trigger_payload, source_strategy
        )
        VALUES
          ($1, 'succeeded', 200, 'https://example.com/geosub-local-ai-launches',
           'local-demo-hash-001', 'New AI subscription launches',
           'Perplexity Pro pricing page and App Store listing were detected.',
           TRUE, $2, NOW() - INTERVAL '2 hours', 'product_launch', 86,
           ARRAY['pricing', 'app store', 'AI subscription'],
           'https://example.com/geosub-local-ai-launches/perplexity-pro',
           'local-demo-perplexity-pro', NOW() - INTERVAL '3 hours',
           jsonb_build_object('demo_seed', 'geosub-local-demo'),
           'announcement_feed'),
          ($1, 'succeeded', 200, 'https://example.com/geosub-local-ai-launches',
           'local-demo-hash-002', 'No material pricing updates',
           'Scanner completed with no new high-confidence candidates.',
           FALSE, NULL, NOW() - INTERVAL '1 day', 'no_change', 20,
           ARRAY['pricing'],
           NULL, NULL, NULL,
           jsonb_build_object('demo_seed', 'geosub-local-demo'),
           'announcement_feed')
      `,
      [discoverySource.id, perplexity.id]
    );

    await many("COMMIT");
    console.log("Local demo data ready: products, collector jobs, runs, observations and discovery checks.");
  } catch (error) {
    await many("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
