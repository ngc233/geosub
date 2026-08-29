#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function loadEnvFile(filePath) {
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

function renderMarket({ source, market, chromePath }) {
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

function validateSnapshot(source, market, snapshot) {
  if (!snapshot.ok || snapshot.http_status !== 200) {
    return [`page_unavailable:${snapshot.http_status ?? "unknown"}`];
  }

  const parserResult = snapshot.parser_result;
  if (!parserResult || parserResult.parser_key !== source.parser_key) {
    return ["parser_result_missing"];
  }

  const issues = [...(parserResult.issues ?? [])];
  if (parserResult.parser_version !== source.parser_version) {
    issues.push("parser_version_mismatch");
  }
  const candidates = parserResult.candidates ?? [];
  const actualPlans = [...new Set(candidates.map((candidate) => candidate.plan_slug))].sort();
  const expectedPlans = [...source.required_plan_slugs].sort();
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

async function loadDatabaseContext(client, source, countryCodes) {
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
  const missingPlans = source.required_plan_slugs.filter((slug) => !plans.has(slug));
  if (missingPlans.length > 0) {
    throw new Error(`missing_canonical_plans:${missingPlans.join(",")}`);
  }
  const mismatchedPlans = source.required_plan_slugs.filter(
    (slug) => plans.get(slug)?.billing_cycle !== source.billing_cycle
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
  const missingCountries = countryCodes.filter((code) => !countries.has(code));
  if (missingCountries.length > 0) {
    throw new Error(`missing_canonical_countries:${missingCountries.join(",")}`);
  }

  return { product, plans, countries };
}

async function ensureSource(client, source) {
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
        $4, $5, NULL, TRUE, FALSE, FALSE, 'low'::risk_level, $6,
        'active'::source_status,
        'Official localized pricing pages with explicit country and locale mapping. Parser output remains pending until a Web-specific review rule is approved.',
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
      source.reliability_score
    ]
  );
  return result.rows[0].id;
}

async function insertMarketObservations({
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
        captured_at: snapshot.captured_at,
        publication_eligible: false
      };

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
              AND existing.status = 'pending'::observation_status
              AND existing.raw_price = $6
              AND existing.currency = $7
              AND existing.parser_version = $12
              AND existing.observed_at::date = ($8::timestamptz)::date
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
          force
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
            gen_random_uuid(), $1, 'html'::evidence_type, NULL, $2,
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
          source.evidence_note
        ]
      );
      inserted += 1;
    }

    await client.query("COMMIT");
    return { inserted, skipped };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const sourceKey = args.get("source-key");
  const productSlug = args.get("product-slug");
  const dryRun = boolArg(args.get("dry-run"));
  const force = boolArg(args.get("force"));
  const chromePath = args.get("chrome-path") ?? process.env.CHROME_PATH ?? null;

  if (!sourceKey) throw new Error("Missing --source-key.");
  const config = JSON.parse(readFileSync(sourceConfigPath, "utf8"));
  const source = config.sources?.[sourceKey];
  if (!source) throw new Error(`Unknown official Web source: ${sourceKey}.`);
  if (productSlug && productSlug !== source.product_slug) {
    throw new Error(`Source ${sourceKey} belongs to ${source.product_slug}, not ${productSlug}.`);
  }

  const requestedCodes = String(args.get("country-codes") ?? source.markets.map((item) => item.country_code).join(","))
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const requestedSet = new Set(requestedCodes);
  const markets = source.markets.filter((market) => requestedSet.has(market.country_code));
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

    const requireFromSite = createRequire(path.join(repoRoot, "ai-price-site", "package.json"));
    const { Client } = requireFromSite("pg");
    client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await client.connect();
      database = await loadDatabaseContext(client, source, requestedCodes);
      for (const market of markets) {
        const country = database.countries.get(market.country_code);
        if (country.currency !== market.currency) {
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
    collection_outcome: "succeeded",
    markets: []
  };

  try {
    for (const market of markets) {
      try {
        const snapshot = renderMarket({ source, market, chromePath });
        const issues = validateSnapshot(source, market, snapshot);
        if (issues.length > 0) {
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

        summary.complete_market_count += 1;
        summary.markets.push({
          country_code: market.country_code,
          status: "complete",
          http_status: snapshot.http_status,
          final_url: snapshot.final_url,
          content_hash: snapshot.content_hash,
          inserted: writeResult.inserted,
          skipped: writeResult.skipped,
          observations
        });
        console.log(
          `${market.country_code}: ${observations.map((item) => `${item.plan_slug} ${item.currency} ${item.raw_price}`).join("; ")}`
        );
      } catch (error) {
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

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
