#!/usr/bin/env node

const { Client } = require("pg");
const fixture = require("./e2e-fixture.cjs");
const { loadSafeE2eEnvironment } = require("./e2e-environment.cjs");

async function main() {
  const environment = loadSafeE2eEnvironment();
  const client = new Client({ connectionString: environment.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(
      `
        SELECT
          observation.status::text AS observation_status,
          COUNT(region_price.id)::int AS published_region_count
        FROM price_observations observation
        LEFT JOIN region_prices region_price
          ON region_price.product_id = observation.product_id
          AND region_price.plan_id = observation.plan_id
          AND region_price.country_id = observation.country_id
          AND region_price.billing_platform = observation.billing_platform
          AND region_price.price_type = observation.price_type
          AND region_price.status = 'published'
        WHERE observation.id = $1
        GROUP BY observation.status
      `,
      [fixture.observationId],
    );
    process.stdout.write(JSON.stringify(result.rows[0] || null));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
