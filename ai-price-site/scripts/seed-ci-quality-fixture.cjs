#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const appDir = path.resolve(__dirname, "..");
const specPath = path.resolve(
  appDir,
  "..",
  "geosub-backend",
  "data",
  "product-plan-specs.json",
);
const productSlug = "chatgpt";
const productId = "10000000-0000-4000-8000-000000000001";
const countryId = "10000000-0000-4000-8000-000000000002";
const sourceId = "10000000-0000-4000-8000-000000000003";
const jobId = "10000000-0000-4000-8000-000000000004";
const runId = "10000000-0000-4000-8000-000000000005";
const regionPriceId = "10000000-0000-4000-8000-000000000006";
const planIdPrefix = "20000000-0000-4000-8000-";
const requiredExchangeRateQuotes =
  "AED,ARS,AUD,BRL,CAD,CHF,CLP,CNY,COP,DKK,EGP,EUR,GBP,HKD,IDR,ILS,INR,JPY,KES,KRW,MXN,MYR,NGN,NOK,NZD,PHP,PKR,PLN,SAR,SEK,SGD,THB,TRY,TWD,VND,ZAR".split(
    ",",
  );

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

function assertSafeTarget() {
  if (process.env.GEOSUB_ALLOW_CI_FIXTURE !== "true") {
    throw new Error(
      "Refusing to seed CI data without GEOSUB_ALLOW_CI_FIXTURE=true.",
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing.");
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(databaseUrl.hostname)) {
    throw new Error(
      `Refusing to seed a non-local database host: ${databaseUrl.hostname}.`,
    );
  }
}

function planId(index) {
  return `${planIdPrefix}${String(index + 1).padStart(12, "0")}`;
}

async function main() {
  assertSafeTarget();
  const specs = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const product = specs[productSlug];
  if (!product?.plans?.length) {
    throw new Error(`Canonical plan data is missing for ${productSlug}.`);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        INSERT INTO countries (
          id, code, name_zh, name_en, currency, is_reference, is_supported
        ) VALUES ($1, 'US', '美国', 'United States', 'USD', TRUE, TRUE)
        ON CONFLICT (code) DO UPDATE SET
          name_zh = EXCLUDED.name_zh,
          name_en = EXCLUDED.name_en,
          currency = EXCLUDED.currency,
          is_reference = TRUE,
          is_supported = TRUE
      `,
      [countryId],
    );
    const country = await client.query(
      "SELECT id FROM countries WHERE code = 'US'",
    );
    const effectiveCountryId = country.rows[0].id;

    await client.query(
      `
        INSERT INTO products (id, slug, name, category, provider, status)
        VALUES ($1, $2, $3, 'ai', 'OpenAI', 'published')
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          provider = EXCLUDED.provider,
          status = EXCLUDED.status
      `,
      [productId, productSlug, product.name],
    );
    const productRow = await client.query(
      "SELECT id FROM products WHERE slug = $1",
      [productSlug],
    );
    const effectiveProductId = productRow.rows[0].id;

    const effectivePlanIds = [];
    for (const [index, plan] of product.plans.entries()) {
      await client.query(
        `
          INSERT INTO plans (
            id, product_id, slug, name, billing_cycle, status, sort_order
          ) VALUES ($1, $2, $3, $4, 'monthly', 'published', $5)
          ON CONFLICT (product_id, slug) DO UPDATE SET
            name = EXCLUDED.name,
            billing_cycle = EXCLUDED.billing_cycle,
            status = EXCLUDED.status,
            sort_order = EXCLUDED.sort_order
        `,
        [
          planId(index),
          effectiveProductId,
          plan.slug,
          plan.name,
          plan.sort_order,
        ],
      );
      const planRow = await client.query(
        "SELECT id FROM plans WHERE product_id = $1 AND slug = $2",
        [effectiveProductId, plan.slug],
      );
      effectivePlanIds.push(planRow.rows[0].id);
    }

    await client.query(
      `
        INSERT INTO price_sources (
          id, source_key, name, source_level, type, provider, status
        ) VALUES (
          $1, 'ci-app-store', 'CI App Store fixture', 'A', 'app_store', 'Apple', 'active'
        )
        ON CONFLICT (source_key) DO UPDATE SET
          name = EXCLUDED.name,
          source_level = EXCLUDED.source_level,
          type = EXCLUDED.type,
          provider = EXCLUDED.provider,
          status = EXCLUDED.status
      `,
      [sourceId],
    );
    const source = await client.query(
      "SELECT id FROM price_sources WHERE source_key = 'ci-app-store'",
    );
    const effectiveSourceId = source.rows[0].id;

    await client.query(
      `
        INSERT INTO collector_jobs (
          id, source_id, product_id, job_type, schedule, status, job_config
        ) VALUES (
          $1, $2, $3, 'price_check', 'ci', 'active',
          jsonb_build_object(
            'collector_kind', 'app_store',
            'app_store_id', $4::text,
            'country_codes', jsonb_build_array('US')
          )
        )
        ON CONFLICT (id) DO UPDATE SET
          source_id = EXCLUDED.source_id,
          product_id = EXCLUDED.product_id,
          status = EXCLUDED.status,
          job_config = EXCLUDED.job_config
      `,
      [jobId, effectiveSourceId, effectiveProductId, product.app_store_id],
    );

    await client.query(
      `
        INSERT INTO region_prices (
          id, product_id, plan_id, country_id, local_price, currency,
          price_usd, us_base_price, diff_vs_us_percent, billing_platform,
          price_type, primary_source_id, confidence_score, data_quality,
          status, last_checked_at, published_at
        ) VALUES (
          $1, $2, $3, $4, 19.99, 'USD', 19.99, 19.99, 0,
          'ios', 'list_price', $5, 100, 'verified', 'published', NOW(), NOW()
        )
        ON CONFLICT (plan_id, country_id, billing_platform, price_type)
        DO UPDATE SET
          local_price = EXCLUDED.local_price,
          currency = EXCLUDED.currency,
          price_usd = EXCLUDED.price_usd,
          primary_source_id = EXCLUDED.primary_source_id,
          confidence_score = EXCLUDED.confidence_score,
          data_quality = EXCLUDED.data_quality,
          status = EXCLUDED.status,
          last_checked_at = NOW(),
          published_at = NOW()
      `,
      [
        regionPriceId,
        effectiveProductId,
        effectivePlanIds[1] || effectivePlanIds[0],
        effectiveCountryId,
        effectiveSourceId,
      ],
    );

    await client.query(
      `
        INSERT INTO country_tax_profiles (
          country_id, tax_type, rate_min, rate_max,
          display_note_zh, display_note_en, confidence, verified_at, status
        ) VALUES (
          $1, 'sales_tax', 0, 10, '销售税因州而异',
          'Sales tax varies by state', 'high', CURRENT_DATE, 'active'
        )
        ON CONFLICT (country_id) DO UPDATE SET
          tax_type = EXCLUDED.tax_type,
          rate_min = EXCLUDED.rate_min,
          rate_max = EXCLUDED.rate_max,
          display_note_zh = EXCLUDED.display_note_zh,
          display_note_en = EXCLUDED.display_note_en,
          confidence = EXCLUDED.confidence,
          verified_at = EXCLUDED.verified_at,
          status = EXCLUDED.status
      `,
      [effectiveCountryId],
    );

    for (const quoteCurrency of requiredExchangeRateQuotes) {
      await client.query(
        `
          INSERT INTO exchange_rates (
            base_currency, quote_currency, rate, source, rate_date, fetched_at, status
          ) VALUES ('USD', $1, 1, 'ci-fixture', CURRENT_DATE, NOW(), 'active')
          ON CONFLICT (base_currency, quote_currency, rate_date, source)
          DO UPDATE SET rate = EXCLUDED.rate, fetched_at = NOW(), status = 'active'
        `,
        [quoteCurrency],
      );
    }

    await client.query(
      `
        INSERT INTO collector_job_runs (
          id, job_id, product_id, source_id, status, collector_kind,
          started_at, finished_at, duration_ms, raw_payload
        ) VALUES (
          $1, $2, $3, $4, 'succeeded', 'app_store',
          NOW() - INTERVAL '1 minute', NOW(), 60000, '{}'::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          status = 'succeeded',
          collector_kind = 'app_store',
          started_at = NOW() - INTERVAL '1 minute',
          finished_at = NOW(),
          duration_ms = 60000
      `,
      [runId, jobId, effectiveProductId, effectiveSourceId],
    );

    await client.query("COMMIT");
    console.log(
      `Seeded deterministic CI quality fixture for ${productSlug} (${product.plans.length} plans).`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
