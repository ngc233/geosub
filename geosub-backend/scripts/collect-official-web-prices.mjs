#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAppleMusicOfficialSnapshot } from './lib/apple-music-official-web.mjs';
import { fetchSpotifyOfficialSnapshot } from './lib/spotify-official-web.mjs';
import { assertAutomaticWebSource, reviewOfficialWebMarket } from './lib/official-web-auto-review.mjs';

import {
  assertClaudeProSource, fetchClaudeProSnapshot, claudeProHelpUrl, claudePricingUrl,
} from "./lib/claude-pro-official-web.mjs";

import {
  assertClaudeReviewDatabase, claudeReviewConnectionFromUrl, resolveClaudeReviewAdmission,
} from './lib/claude-pro-review-admission.mjs';

import { assertSunoSource, fetchSunoSnapshot, validateSunoSnapshot } from "./lib/suno-official-web.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptsDir, "..");
const repoRoot = path.resolve(backendDir, "..");
const sourceConfigPath = path.join(backendDir, "data", "official-web-price-sources.json");
const rendererPath = path.join(scriptsDir, "render-web-snapshot.mjs");

function parseArgs(argv) {
  const parsed = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) continue;
    const next = argv[index + 1];
    parsed.set(key.slice(2), next && !next.startsWith("--") ? next : "true");
    if (next && !next.startsWith("--")) index += 1;
  }
  return parsed;
}

export function loadEnvFile(filePath) {
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function boolArg(value) {
  return value === "true" || value === "1";
}

async function renderMarket({ source, market, chromePath }) {
  if (source.parser_key === "suno_us_monthly") {
    assertSunoSource(source);
    return fetchSunoSnapshot(market);
  }
  if (source.parser_key === "claude_us_pro") {
    assertClaudeProSource(source);
    return fetchClaudeProSnapshot(market);
  }
  if (source.fetch_mode === 'structured_http') {
    assertAutomaticWebSource(source);
    const fetcher={spotify_official_web:fetchSpotifyOfficialSnapshot,apple_music:fetchAppleMusicOfficialSnapshot}[source.parser_key];
    return fetcher(market);
  }
  const rendererArgs = [
    rendererPath,
    "--url",
    market.url,
    "--locale",
    market.locale,
    "--parser-key",
    source.parser_key,
    "--currency",
    market.currency,
    "--country-code",
    market.country_code
  ];
  if (chromePath) rendererArgs.push("--chrome-path", chromePath);

  const result = spawnSync(process.execPath, rendererArgs, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(
      `render_failed:${market.country_code}:${String(result.stderr || result.stdout).trim()}`
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`invalid_renderer_json:${market.country_code}:${error.message}`);
  }
}

export async function* collectMarketSnapshots(source, markets, chromePath, render = renderMarket) {
  // Only the maintained structured fetchers uses this bounded HTTP batch. Database
  // work stays sequential on its single transaction connection.
  const batchSize = source.fetch_mode === 'structured_http' ? 4 : 1;
  for (let index = 0; index < markets.length; index += batchSize) {
    const batch = markets.slice(index, index + batchSize);
    const results = await Promise.allSettled(batch.map(market => render({source,market,chromePath})));
    for (const [offset,result] of results.entries()) yield {market:batch[offset],result};
  }
}

export function validateSnapshot(source, market, snapshot) {
  if (!snapshot.ok || snapshot.http_status !== 200) {
    return [`page_unavailable:${snapshot.http_status ?? "unknown"}`];
  }

  const parserResult = snapshot.parser_result;
  if (!parserResult || parserResult.parser_key !== source.parser_key) {
    return ["parser_result_missing"];
  }

  const issues = [...(parserResult.issues ?? [])];
  if (source.parser_key === "suno_us_monthly") issues.push(...validateSunoSnapshot(snapshot));
  if (source.parser_key === "claude_us_pro" && (
    snapshot.final_url !== claudePricingUrl
    || snapshot.request_context?.country_code !== "US"
    || snapshot.request_context?.basis !== "official_support_explicit_US_monthly_price"
    || snapshot.support_evidence?.url !== claudeProHelpUrl
    || snapshot.support_evidence?.http_status !== 200
    || !/^[a-f0-9]{64}$/.test(snapshot.support_evidence?.content_hash ?? "")
    || !/^[a-f0-9]{64}$/.test(snapshot.content_hash ?? "")
  )) issues.push("claude_corroborating_evidence_missing");
  if(market.storefront
    && (snapshot.request_context?.country_code!==market.country_code
      || snapshot.request_context?.storefront!==market.storefront
      || snapshot.final_url!==market.evidence_url || snapshot.evidence_type!=='json'))issues.push('storefront_evidence_context_mismatch');
  if (parserResult.parser_version !== source.parser_version) {
    issues.push("parser_version_mismatch");
  }
  const candidates = parserResult.candidates ?? [];
  const actualPlans = [...new Set(candidates.map((candidate) => candidate.plan_slug))].sort();
  const expectedPlans = [...(market.required_plan_slugs ?? source.required_plan_slugs)].sort();
  if (JSON.stringify(actualPlans) !== JSON.stringify(expectedPlans)) {
    issues.push("required_plan_set_mismatch");
  }
  if (candidates.some((candidate) => candidate.currency !== market.currency)) {
    issues.push("currency_mismatch");
  }
  if (candidates.some((candidate) => candidate.billing_cycle !== source.billing_cycle)) {
    issues.push("billing_cycle_mismatch");
  }
  if (candidates.some((candidate) => candidate.price_type !== "list_price")) {
    issues.push("price_type_mismatch");
  }
  if (!parserResult.complete) issues.push("parser_incomplete");

  return [...new Set(issues)];
}

export async function loadDatabaseContext(client, source, countryCodes, allowedMissingCountries = [], allowedMissingPlans = []) {
  const productResult = await client.query(
    "SELECT id, slug, name, status::text FROM products WHERE slug = $1 LIMIT 1",
    [source.product_slug]
  );
  const product = productResult.rows[0];
  if (!product) throw new Error(`missing_canonical_product:${source.product_slug}`);

  const planResult = await client.query(
    "SELECT id, slug, name, billing_cycle::text FROM plans WHERE product_id = $1",
    [product.id]
  );
  const plans = new Map(planResult.rows.map((plan) => [plan.slug, plan]));
  const missingPlans = source.required_plan_slugs.filter((slug) => !plans.has(slug) && !allowedMissingPlans.includes(slug));
  if (missingPlans.length > 0) {
    throw new Error(`missing_canonical_plans:${missingPlans.join(",")}`);
  }
  const mismatchedPlans = source.required_plan_slugs.filter(
    (slug) => !allowedMissingPlans.includes(slug) && plans.get(slug)?.billing_cycle !== source.billing_cycle
  );
  if (mismatchedPlans.length > 0) {
    throw new Error(
      `canonical_plan_billing_cycle_mismatch:${mismatchedPlans.join(",")}:${source.billing_cycle}`
    );
  }

  const countryResult = await client.query(
    "SELECT id, code, currency FROM countries WHERE code = ANY($1::text[])",
    [countryCodes]
  );
  const countries = new Map(countryResult.rows.map((country) => [country.code, country]));
  const missingCountries = countryCodes.filter((code) => !countries.has(code) && !allowedMissingCountries.includes(code));
  if (missingCountries.length > 0) {
    throw new Error(`missing_canonical_countries:${missingCountries.join(",")}`);
  }

  return { product, plans, countries };
}

export async function ensureSource(client, source) {
  const result = await client.query(
    `
      INSERT INTO price_sources (
        id, source_key, name, source_level, type, provider, base_url,
        country_url_pattern, requires_javascript, requires_account,
        requires_geo, terms_risk, reliability_score, status, note,
        created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3::source_level, 'official_page'::price_source_type,
        $4, $5, NULL, $7, FALSE, FALSE, 'low'::risk_level, $6,
        'active'::source_status,
        $8,
        NOW(), NOW()
      )
      ON CONFLICT (source_key) DO UPDATE SET
        name = EXCLUDED.name,
        source_level = EXCLUDED.source_level,
        type = EXCLUDED.type,
        provider = EXCLUDED.provider,
        base_url = EXCLUDED.base_url,
        requires_javascript = EXCLUDED.requires_javascript,
        requires_account = EXCLUDED.requires_account,
        requires_geo = EXCLUDED.requires_geo,
        reliability_score = EXCLUDED.reliability_score,
        status = 'active'::source_status,
        note = EXCLUDED.note,
        updated_at = NOW()
      RETURNING id
    `,
    [
      source.source_key,
      source.source_name,
      source.source_level,
      source.provider,
      source.base_url,
      source.reliability_score,
      source.fetch_mode !== 'structured_http',
      source.evidence_note
    ]
  );
  return result.rows[0].id;
}

export async function insertMarketObservations({
  client,
  source,
  market,
  snapshot,
  database,
  sourceId,
  force
}) {
  let inserted = 0;
  let skipped = 0;
  await client.query("BEGIN");

  try {
    if (source.auto_review) {
      await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'");
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`official_web:${database.product.id}:${database.countries.get(market.country_code).id}`]);
    }
    for (const candidate of snapshot.parser_result.candidates) {
      const plan = database.plans.get(candidate.plan_slug);
      const country = database.countries.get(market.country_code);
      const rawPayload = {
        collector: "collect-official-web-prices.mjs",
        pilot: source.pilot === true,
        requested_country: market.country_code,
        requested_locale: market.locale,
        observed_price_text: candidate.observed_price_text,
        evidence_text: candidate.evidence_text,
        parser_key: source.parser_key,
        parser_version: snapshot.parser_result.parser_version,
        source_url: market.url,
        final_url: snapshot.final_url,
        content_hash: snapshot.content_hash,
        render_mode: snapshot.render_mode,
        captured_at: snapshot.captured_at,
        publication_eligible: Boolean(source.auto_review),
        automatic_rule: source.auto_review?.rule_id ?? null,
        billing_cycle: candidate.billing_cycle,
        availability_note: candidate.availability_note ?? null
      };
      if(snapshot.request_context)rawPayload.request_context=snapshot.request_context;
      if (source.parser_key === "claude_us_pro") {
        if (source.review_admission_policy) rawPayload.review_admission_policy=source.review_admission_policy;
        rawPayload.support_url = snapshot.support_evidence.url;
        rawPayload.support_content_hash = snapshot.support_evidence.content_hash;
      }

      const observationResult = await client.query(
        `
          INSERT INTO price_observations (
            id, product_id, plan_id, country_id, source_id, source_level,
            raw_price, currency, converted_usd, observed_at, source_url,
            locale, ip_country, billing_platform, price_type, tax_included,
            raw_payload, parser_version, confidence_score, anomaly_flag,
            anomaly_reason, status, created_at, updated_at
          )
          SELECT
            gen_random_uuid(), $1, $2, $3, $4, $5::source_level,
            $6, $7, NULL, $8::timestamptz, $9,
            $10, NULL, 'web'::billing_platform, 'list_price'::price_type,
            'unknown'::tax_included, $11::jsonb, $12, 82, FALSE,
            NULL, 'pending'::observation_status, NOW(), NOW()
          WHERE $13::boolean OR NOT EXISTS (
            SELECT 1
            FROM price_observations existing
            WHERE existing.product_id = $1
              AND existing.plan_id = $2
              AND existing.country_id = $3
              AND existing.billing_platform = 'web'::billing_platform
              AND (existing.status = 'pending'::observation_status OR $14::boolean)
              AND (NOT $14::boolean OR existing.source_id=$4)
              AND ($14::boolean OR existing.raw_price = $6)
              AND ($14::boolean OR existing.currency = $7)
              AND existing.parser_version = $12
              AND (CASE WHEN $14::boolean THEN existing.observed_at > $8::timestamptz - INTERVAL '6 hours'
                   ELSE existing.observed_at::date = ($8::timestamptz)::date END)
          )
          RETURNING id
        `,
        [
          database.product.id,
          plan.id,
          country.id,
          sourceId,
          source.source_level,
          candidate.raw_price,
          candidate.currency,
          snapshot.captured_at,
          market.url,
          market.locale.toLowerCase(),
          JSON.stringify(rawPayload),
          snapshot.parser_result.parser_version,
          force && !source.auto_review,
          Boolean(source.auto_review)
        ]
      );

      const observation = observationResult.rows[0];
      if (!observation) {
        skipped += 1;
        continue;
      }

      await client.query(
        `
          INSERT INTO source_evidence (
            id, observation_id, evidence_type, storage_url, content_hash,
            captured_at, http_status, final_url, user_agent, country_context,
            note, created_at
          )
          VALUES (
            gen_random_uuid(), $1, $9::evidence_type, NULL, $2,
            $3::timestamptz, $4, $5, $6, $7,
            $8,
            NOW()
          )
        `,
        [
          observation.id,
          snapshot.content_hash,
          snapshot.captured_at,
          snapshot.http_status,
          snapshot.final_url,
          snapshot.user_agent,
          market.country_code,
          source.evidence_note,
          snapshot.evidence_type ?? 'html'
        ]
      );
      if (source.parser_key === "claude_us_pro") {
        await client.query(`INSERT INTO source_evidence
          (id,observation_id,evidence_type,content_hash,captured_at,http_status,final_url,country_context,note)
          VALUES(gen_random_uuid(),$1,'html',$2,$3::timestamptz,200,$4,'US',$5)`,
          [observation.id,snapshot.support_evidence.content_hash,snapshot.captured_at,
            claudeProHelpUrl,"Official support corroboration of the US Pro monthly price"]);
      }
      inserted += 1;
    }

    await client.query("COMMIT");
    return { inserted, skipped };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

export async function recordMarketFailure({ client, source, market, database, sourceId, snapshot, issues }) {
  assertAutomaticWebSource(source);
  const captured = snapshot?.captured_at ?? new Date().toISOString();
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`official_web:${database.product.id}:${database.countries.get(market.country_code).id}`]);
    for (const slug of market.required_plan_slugs ?? source.required_plan_slugs) {
      const result = await client.query(`INSERT INTO price_observations
        (id,product_id,plan_id,country_id,source_id,source_level,currency,observed_at,source_url,locale,
         billing_platform,price_type,raw_payload,parser_version,confidence_score,anomaly_flag,anomaly_reason,status)
        SELECT gen_random_uuid(),$1,$2,$3,$4,'A',$5,$6,$7,$8,'web','list_price',$9::jsonb,$10,0,TRUE,'official_web_evidence_incomplete','pending'
        WHERE NOT EXISTS(SELECT 1 FROM price_observations o WHERE o.product_id=$1 AND o.plan_id=$2
          AND o.country_id=$3 AND o.source_id=$4 AND o.billing_platform='web'
          AND o.anomaly_flag AND o.observed_at>=$6::timestamptz-INTERVAL '6 hours') RETURNING id`,
        [database.product.id,database.plans.get(slug).id,database.countries.get(market.country_code).id,sourceId,
        market.currency,captured,market.url,market.locale,JSON.stringify({ collector:'collect-official-web-prices.mjs',
          automatic_rule:source.auto_review.rule_id,publication_eligible:false,billing_cycle:source.billing_cycle,
          requested_country:market.country_code,source_url:market.url,final_url:snapshot?.final_url ?? null,
          content_hash:snapshot?.content_hash ?? null,issues }),source.parser_version]);
      if (result.rows[0] && snapshot?.content_hash) {
        await client.query(`INSERT INTO source_evidence(id,observation_id,evidence_type,content_hash,captured_at,http_status,final_url,country_context,note)
          VALUES(gen_random_uuid(),$1,'html',$2,$3,$4,$5,$6,'Automatically isolated incomplete official Web evidence')`,
          [result.rows[0].id,snapshot.content_hash,captured,snapshot.http_status,snapshot.final_url,market.country_code]);
      }
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
}

async function main() {
  const args = parseArgs(process.argv);
  const sourceKey = args.get("source-key");
  const productSlug = args.get("product-slug");
  const dryRun = boolArg(args.get("dry-run"));
  const force = boolArg(args.get("force"));
  const skipAutoReview = boolArg(args.get('skip-auto-review'));
  const chromePath = args.get("chrome-path") ?? process.env.CHROME_PATH ?? null;

  if (!sourceKey) throw new Error("Missing --source-key.");
  const config = JSON.parse(readFileSync(sourceConfigPath, "utf8"));
  let source = config.sources?.[sourceKey];
  if (!source) throw new Error(`Unknown official Web source: ${sourceKey}.`);
  if (source.parser_key === "suno_us_monthly") assertSunoSource(source);
  if (source.parser_key === "claude_us_pro") {
    assertClaudeProSource(source);
    if (source.auto_review) throw Error("claude_automatic_publication_isolated_harness_only");
  }
  const reviewPolicy=args.get('review-policy');
  if (reviewPolicy) {
    if (dryRun) throw Error('claude_review_admission_requires_collection');
    source=resolveClaudeReviewAdmission({source,policy:reviewPolicy,
      connectionParameters:claudeReviewConnectionFromUrl(process.env.DATABASE_URL)});
  }
  if (source.auto_review) assertAutomaticWebSource(source);
  if (productSlug && productSlug !== source.product_slug) {
    throw new Error(`Source ${sourceKey} belongs to ${source.product_slug}, not ${productSlug}.`);
  }

  const requestedCodes = String(args.get("country-codes") ?? source.markets.map((item) => item.country_code).join(","))
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const requestedSet = new Set(requestedCodes);
  const markets = source.markets.filter((market) => requestedSet.has(market.country_code));
  if (markets.length === 0) throw Error('No official Web markets selected.');
  const unknownMarkets = requestedCodes.filter(
    (code) => !source.markets.some((market) => market.country_code === code)
  );
  if (unknownMarkets.length > 0) {
    throw new Error(`Unsupported pilot markets for ${sourceKey}: ${unknownMarkets.join(",")}.`);
  }

  console.log(`Using official Web source ${sourceKey} for ${source.product_slug}.`);

  let client = null;
  let database = null;
  let sourceId = null;
  if (!dryRun) {
    loadEnvFile(path.join(repoRoot, "ai-price-site", ".env.local"));
    loadEnvFile(path.join(repoRoot, "ai-price-site", ".env"));
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

    const requireFromSite = createRequire(path.join(process.env.GEOSUB_FRONTEND_DIR || path.join(repoRoot, "ai-price-site"), "package.json"));
    const { Client } = requireFromSite("pg");
    client = new Client({ connectionString: process.env.DATABASE_URL,
      ...(reviewPolicy?{connectionTimeoutMillis:5_000}:{}) });
    try {
      if (reviewPolicy) assertClaudeReviewDatabase(client.connectionParameters);
      await client.connect();
      if (reviewPolicy) {
        const actual=(await client.query('SELECT current_database() AS name')).rows[0]?.name;
        if (actual !== client.connectionParameters.database) throw Error('claude_review_database_identity_mismatch');
      }
      database = await loadDatabaseContext(client, source, requestedCodes);
      for (const market of markets) {
        const country = database.countries.get(market.country_code);
        // A Spotify country page can explicitly charge USD/EUR rather than
        // the country's default currency. The automatic source allowlist
        // already validates its exact market URL and charge currency.
        if (!source.auto_review && country.currency !== market.currency) {
          throw new Error(
            `canonical_country_currency_mismatch:${market.country_code}:${country.currency}:${market.currency}`
          );
        }
      }
      sourceId = await ensureSource(client, source);
    } catch (error) {
      await client.end().catch(() => {});
      throw error;
    }
  }

  const summary = {
    collector_kind: "pricing_page",
    source_key: sourceKey,
    parser_key: source.parser_key,
    parser_version: source.parser_version,
    requested_market_count: markets.length,
    complete_market_count: 0,
    failed_market_count: 0,
    inserted_observation_count: 0,
    skipped_observation_count: 0,
    dry_run_observation_count: 0,
    published_price_count: 0,
    collection_outcome: "succeeded",
    markets: []
  };

  try {
    for await (const {market,result} of collectMarketSnapshots(source,markets,chromePath)) {
      let snapshot = null;
      try {
        if (result.status === 'rejected') throw result.reason;
        snapshot = result.value;
        const issues = validateSnapshot(source, market, snapshot);
        if (issues.length > 0) {
          if (client && source.auto_review) await recordMarketFailure({ client,source,market,database,sourceId,snapshot,issues });
          summary.failed_market_count += 1;
          summary.markets.push({
            country_code: market.country_code,
            status: "failed",
            http_status: snapshot.http_status ?? null,
            issues
          });
          continue;
        }

        const observations = snapshot.parser_result.candidates.map((candidate) => ({
          country_code: market.country_code,
          plan_slug: candidate.plan_slug,
          raw_price: candidate.raw_price,
          currency: candidate.currency,
          billing_platform: "web",
          price_type: "list_price",
          status: "pending"
        }));

        let writeResult = { inserted: 0, skipped: 0 };
        if (dryRun) {
          summary.dry_run_observation_count += observations.length;
        } else {
          writeResult = await insertMarketObservations({
            client,
            source,
            market,
            snapshot,
            database,
            sourceId,
            force
          });
          summary.inserted_observation_count += writeResult.inserted;
          summary.skipped_observation_count += writeResult.skipped;
        }

        const review = client && source.auto_review && !skipAutoReview
          ? await reviewOfficialWebMarket({ client, source, market, database, sourceId }) : null;
        summary.published_price_count += review?.published ?? 0;
        summary.complete_market_count += 1;
        summary.markets.push({
          country_code: market.country_code,
          status: "complete",
          http_status: snapshot.http_status,
          final_url: snapshot.final_url,
          content_hash: snapshot.content_hash,
          inserted: writeResult.inserted,
          skipped: writeResult.skipped,
          auto_review: review,
          observations
        });
        console.log(
          `${market.country_code}: ${observations.map((item) => `${item.plan_slug} ${item.currency} ${item.raw_price}`).join("; ")}`
        );
      } catch (error) {
        if (client && source.auto_review && !snapshot?.parser_result?.complete) {
          await recordMarketFailure({ client,source,market,database,sourceId,snapshot,issues:[error.message] });
        }
        summary.failed_market_count += 1;
        summary.markets.push({
          country_code: market.country_code,
          status: "failed",
          issues: [error.message]
        });
      }
    }
  } finally {
    if (client) await client.end().catch(() => {});
  }

  if (summary.failed_market_count > 0) {
    summary.collection_outcome = summary.complete_market_count > 0 ? "partial" : "failed";
  }
  console.log(`GEOSUB_COLLECTION_RESULT=${JSON.stringify(summary)}`);

  if (summary.failed_market_count > 0) {
    throw new Error(
      `Official Web collection incomplete. Failed markets: ${summary.markets
        .filter((market) => market.status === "failed")
        .map((market) => market.country_code)
        .join(",")}.`
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
