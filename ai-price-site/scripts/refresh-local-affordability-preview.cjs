/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ quiet: true });

const { Client } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Please check .env.local or .env.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const allowedLocalHosts = new Set(["localhost", "127.0.0.1", "::1"]);

if (!allowedLocalHosts.has(databaseUrl.hostname)) {
  throw new Error(`Refusing to update a non-local database host: ${databaseUrl.hostname}`);
}

if (!databaseUrl.pathname.slice(1).toLowerCase().includes("geosub")) {
  throw new Error("Refusing to update a database without 'geosub' in its name.");
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  await client.query("BEGIN");

  try {
    const sourceResult = await client.query(`
      SELECT id
      FROM price_sources
      WHERE source_key = 'local-demo-chatgpt-app-store'
      LIMIT 1
    `);

    const sourceId = sourceResult.rows[0]?.id;
    if (!sourceId) {
      throw new Error("Local ChatGPT App Store preview source is missing. Run seed:local-demo first.");
    }

    const copied = await client.query(
      `
        INSERT INTO region_prices (
          id, product_id, plan_id, country_id, local_price, currency, price_usd,
          us_base_price, diff_vs_us_percent, billing_platform, price_type,
          tax_note, availability_note, source_summary, primary_source_id,
          confidence_score, data_quality, status, last_checked_at,
          published_at, created_at, updated_at
        )
        SELECT
          gen_random_uuid(), rp.product_id, rp.plan_id, rp.country_id,
          rp.local_price, rp.currency, rp.price_usd, rp.us_base_price,
          rp.diff_vs_us_percent, 'ios'::billing_platform, rp.price_type,
          rp.tax_note, rp.availability_note,
          'Local demo App Store affordability preview', $1::uuid,
          70, 'estimated'::data_quality, 'published'::publish_status,
          rp.last_checked_at, rp.published_at, NOW(), NOW()
        FROM region_prices rp
        JOIN products p ON p.id = rp.product_id
        JOIN plans pl ON pl.id = rp.plan_id
        WHERE p.slug = 'chatgpt'
          AND pl.slug = 'plus'
          AND rp.billing_platform = 'web'
          AND rp.status = 'published'
          AND rp.source_summary = 'Seeded local demo source'
        ON CONFLICT (plan_id, country_id, billing_platform, price_type)
        DO UPDATE SET
          local_price = EXCLUDED.local_price,
          currency = EXCLUDED.currency,
          price_usd = EXCLUDED.price_usd,
          us_base_price = EXCLUDED.us_base_price,
          diff_vs_us_percent = EXCLUDED.diff_vs_us_percent,
          source_summary = EXCLUDED.source_summary,
          primary_source_id = EXCLUDED.primary_source_id,
          confidence_score = EXCLUDED.confidence_score,
          data_quality = EXCLUDED.data_quality,
          status = EXCLUDED.status,
          last_checked_at = EXCLUDED.last_checked_at,
          published_at = EXCLUDED.published_at,
          updated_at = NOW()
        RETURNING id
      `,
      [sourceId],
    );

    const refreshResult = await client.query(
      "SELECT refresh_plan_affordability_metrics('chatgpt', 'plus') AS refreshed_rows",
    );

    const qualityResult = await client.query(`
      WITH published AS (
        SELECT COUNT(DISTINCT c.code)::INTEGER AS region_count
        FROM region_prices rp
        JOIN products p ON p.id = rp.product_id
        JOIN plans pl ON pl.id = rp.plan_id
        JOIN countries c ON c.id = rp.country_id
        WHERE p.slug = 'chatgpt'
          AND pl.slug = 'plus'
          AND rp.status = 'published'
          AND rp.billing_platform = 'ios'
      ), affordability AS (
        SELECT
          COUNT(*)::INTEGER AS row_count,
          COUNT(*) FILTER (WHERE country_code = 'US')::INTEGER AS us_rows,
          COUNT(*) FILTER (
            WHERE monthly_income_usd <= 0
               OR income_share_percent <= 0
               OR burden_vs_us <= 0
          )::INTEGER AS invalid_rows,
          MIN(income_data_year)::INTEGER AS min_year,
          MAX(income_data_year)::INTEGER AS max_year
        FROM plan_affordability_detail_view
        WHERE product_slug = 'chatgpt'
          AND plan_slug = 'plus'
      )
      SELECT published.region_count, affordability.*
      FROM published CROSS JOIN affordability
    `);

    const quality = qualityResult.rows[0];
    const coverage = quality.region_count > 0
      ? quality.row_count / quality.region_count
      : 0;
    const currentYear = new Date().getUTCFullYear();
    const publishable =
      quality.row_count >= 5 &&
      coverage >= 0.8 &&
      quality.us_rows === 1 &&
      quality.invalid_rows === 0 &&
      quality.max_year >= currentYear - 3 &&
      quality.max_year - quality.min_year <= 2;

    if (!publishable) {
      throw new Error(`Affordability preview failed quality gate: ${JSON.stringify({ ...quality, coverage })}`);
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({
      copiedOrUpdatedPrices: copied.rowCount,
      refreshedRows: Number(refreshResult.rows[0]?.refreshed_rows || 0),
      coveredRegions: quality.row_count,
      publishedRegions: quality.region_count,
      coverage: Number(coverage.toFixed(3)),
      incomeYearRange: [quality.min_year, quality.max_year],
      publishable,
    }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
