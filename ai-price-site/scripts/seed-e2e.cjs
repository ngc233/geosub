#!/usr/bin/env node

const { randomBytes, scryptSync } = require("node:crypto");
const { Client } = require("pg");
const fixture = require("./e2e-fixture.cjs");
const { loadSafeE2eEnvironment } = require("./e2e-environment.cjs");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function upsertCountry(client, { code, nameZh, nameEn, currency, reference }) {
  const result = await client.query(
    `
      INSERT INTO countries (
        id, code, name_zh, name_en, currency, is_reference, is_supported,
        sort_order, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, TRUE, 0, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE
      SET
        name_zh = EXCLUDED.name_zh,
        name_en = EXCLUDED.name_en,
        currency = EXCLUDED.currency,
        is_reference = EXCLUDED.is_reference,
        is_supported = TRUE,
        updated_at = NOW()
      RETURNING id
    `,
    [code, nameZh, nameEn, currency, reference],
  );
  return result.rows[0].id;
}

async function main() {
  const environment = loadSafeE2eEnvironment();
  const client = new Client({ connectionString: environment.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM products WHERE slug = $1", [fixture.productSlug]);
    await client.query("DELETE FROM price_sources WHERE source_key = $1", [fixture.sourceKey]);
    await client.query("DELETE FROM admin_users WHERE email = $1", [fixture.adminEmail]);

    const usCountryId = await upsertCountry(client, {
      code: "US",
      nameZh: "美国",
      nameEn: "United States",
      currency: "USD",
      reference: true,
    });
    const caCountryId = await upsertCountry(client, {
      code: "CA",
      nameZh: "加拿大",
      nameEn: "Canada",
      currency: "CAD",
      reference: false,
    });

    await client.query(
      `
        INSERT INTO admin_users (
          id, email, password_hash, name, role, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'E2E Admin', 'owner', 'active', NOW(), NOW())
      `,
      [fixture.adminId, fixture.adminEmail, hashPassword(fixture.adminPassword)],
    );
    await client.query(
      `
        INSERT INTO products (
          id, slug, name, category, provider, description, official_url,
          status, featured, sort_order, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, 'ai', 'GeoSub Test',
          'Isolated browser test fixture.', 'https://example.com/e2e-atlas',
          'published', FALSE, -100, NOW(), NOW()
        )
      `,
      [fixture.productId, fixture.productSlug, fixture.productName],
    );
    await client.query(
      `
        INSERT INTO plans (
          id, product_id, slug, name, billing_cycle, description, status,
          sort_order, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, 'E2E Atlas Plus', 'monthly',
          'Isolated browser test plan.', 'published', 0, NOW(), NOW()
        )
      `,
      [fixture.planId, fixture.productId, fixture.planSlug],
    );
    await client.query(
      `
        INSERT INTO price_sources (
          id, source_key, name, source_level, type, provider, base_url,
          reliability_score, status, created_at, updated_at
        )
        VALUES (
          $1, $2, 'E2E App Store', 'A', 'app_store', 'GeoSub Test',
          'https://example.com/e2e-atlas', 100, 'active', NOW(), NOW()
        )
      `,
      [fixture.sourceId, fixture.sourceKey],
    );
    await client.query(
      `
        INSERT INTO region_prices (
          id, product_id, plan_id, country_id, local_price, currency, price_usd,
          us_base_price, diff_vs_us_percent, billing_platform, price_type,
          source_summary, primary_source_id, confidence_score, data_quality,
          status, last_checked_at, published_at, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, 19.99, 'USD', 19.99, 19.99, 0,
          'ios', 'list_price', 'E2E verified fixture', $5, 100, 'verified',
          'published', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
          NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
        )
      `,
      [
        fixture.regionPriceId,
        fixture.productId,
        fixture.planId,
        usCountryId,
        fixture.sourceId,
      ],
    );
    await client.query(
      `
        INSERT INTO price_observations (
          id, product_id, plan_id, country_id, source_id, source_level,
          raw_price, currency, converted_usd, observed_at, source_url,
          billing_platform, price_type, tax_included, raw_payload,
          parser_version, confidence_score, anomaly_flag, status,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, 'A', 24.99, 'CAD', 18.40, NOW(),
          'https://example.com/e2e-atlas/ca', 'ios', 'list_price', 'true',
          $6::jsonb, 'e2e-fixture', 95, TRUE, 'pending', NOW(), NOW()
        )
      `,
      [
        fixture.observationId,
        fixture.productId,
        fixture.planId,
        caCountryId,
        fixture.sourceId,
        JSON.stringify({
          observed_price_text: "CAD 24.99",
          review_note: "E2E manual review fixture",
          auto_review_reason_code: "app_store_observation_anomaly",
        }),
      ],
    );

    await client.query("COMMIT");
    console.log(`Seeded isolated E2E fixture: ${fixture.productSlug}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
