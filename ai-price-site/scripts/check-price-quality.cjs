#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const rootDir = process.cwd();

for (const fileName of [".env.local", ".env"]) {
  const filePath = path.join(rootDir, fileName);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: false, quiet: true });
  }
}

const databaseUrl = process.env.DATABASE_URL;
const configuredTrackedProducts = (process.env.GEOSUB_PRICE_CHECK_PRODUCTS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const minPublishedSubscriptionUsd = Number(process.env.GEOSUB_MIN_PUBLISHED_SUBSCRIPTION_USD || 1);
const maxExchangeRateAgeHours = Number(process.env.GEOSUB_MAX_EXCHANGE_RATE_AGE_HOURS || 18);
const maxRunningMinutes = Number(process.env.GEOSUB_MAX_COLLECTOR_RUNNING_MINUTES || 45);
const maxPublishedAgeDays = Number(process.env.GEOSUB_MAX_PUBLISHED_PRICE_AGE_DAYS || 14);
const maxAppStoreProductRunAgeDays = Number(
  process.env.GEOSUB_MAX_APP_STORE_PRODUCT_RUN_AGE_DAYS || 8
);
const maxPendingAnomalyRatio = Number(process.env.GEOSUB_MAX_PENDING_ANOMALY_RATIO || 0.35);

const failures = [];
const warnings = [];

function printRow(status, label, value) {
  const marker = status === "ok" ? "OK" : status === "warn" ? "WARN" : "FAIL";
  console.log(`${marker.padEnd(5)} ${label.padEnd(24)} ${value}`);
}

function formatDate(value) {
  if (!value) return "none";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "none";
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function daysSince(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (Date.now() - time) / 864e5);
}

function hoursSince(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (Date.now() - time) / 36e5);
}

async function tableExists(client, tableName) {
  const result = await client.query("SELECT to_regclass($1) AS table_name", [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.table_name);
}

async function requireTables(client, tableNames) {
  const missing = [];
  for (const tableName of tableNames) {
    if (!(await tableExists(client, tableName))) {
      missing.push(tableName);
    }
  }

  if (missing.length > 0) {
    failures.push(`Missing required table(s): ${missing.join(", ")}`);
    printRow("fail", "required tables", missing.join(", "));
    return false;
  }

  printRow("ok", "required tables", "present");
  return true;
}

async function requireDatabaseFunctions(client, functionNames) {
  const result = await client.query(
    `
      SELECT DISTINCT procedure.proname
      FROM pg_proc procedure
      JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
      WHERE namespace.nspname = 'public'
        AND procedure.proname = ANY($1::text[])
    `,
    [functionNames]
  );
  const installed = new Set(result.rows.map((row) => row.proname));
  const missing = functionNames.filter((functionName) => !installed.has(functionName));

  if (missing.length > 0) {
    failures.push(`Missing required database function(s): ${missing.join(", ")}`);
    printRow("fail", "required functions", missing.join(", "));
    return false;
  }

  printRow("ok", "required functions", "present");
  return true;
}

async function resolveTrackedProducts(client) {
  if (configuredTrackedProducts.length > 0) {
    return configuredTrackedProducts;
  }

  const result = await client.query(`
    SELECT DISTINCT products.slug
    FROM products
    JOIN collector_jobs ON collector_jobs.product_id = products.id
    WHERE collector_jobs.status = 'active'
      AND collector_jobs.job_config ->> 'collector_kind' = 'app_store'
    ORDER BY products.slug
  `);

  return result.rows.map((row) => row.slug).filter(Boolean);
}

async function checkExchangeRates(client) {
  if (!(await tableExists(client, "exchange_rates"))) {
    failures.push("exchange_rates table is missing.");
    printRow("fail", "exchange rates", "missing table");
    return;
  }

  const result = await client.query(`
    SELECT quote_currency, rate, rate_date, fetched_at
    FROM exchange_rates
    WHERE base_currency = 'USD' AND quote_currency = 'CNY'
    ORDER BY fetched_at DESC NULLS LAST, rate_date DESC NULLS LAST
    LIMIT 1
  `);

  const latest = result.rows[0];
  if (!latest) {
    failures.push("USD/CNY exchange rate is missing.");
    printRow("fail", "exchange rates", "USD/CNY missing");
    return;
  }

  const age = hoursSince(latest.fetched_at || latest.rate_date);
  const stale = age === null || age > maxExchangeRateAgeHours;
  if (stale) {
    failures.push(`USD/CNY exchange rate is older than ${maxExchangeRateAgeHours} hours.`);
  }

  printRow(
    stale ? "fail" : "ok",
    "exchange rates",
    `CNY ${Number(latest.rate).toFixed(4)}, updated ${formatDate(
      latest.fetched_at || latest.rate_date
    )}`
  );
}

async function checkTrackedProductCoverage(client, trackedProducts) {
  const result = await client.query(
    `
      WITH tracked AS (
        SELECT unnest($1::text[]) AS slug
      ),
      product_rows AS (
        SELECT p.id, p.slug, p.name
        FROM products p
        JOIN tracked t ON t.slug = p.slug
      ),
      plan_summary AS (
        SELECT product_id, COUNT(*)::int AS plan_count
        FROM plans
        WHERE status IS NULL OR status::text <> 'archived'
        GROUP BY product_id
      ),
      published_summary AS (
        SELECT
          product_id,
          COUNT(*) FILTER (
            WHERE status = 'published'
              AND billing_platform = 'ios'
              AND price_usd IS NOT NULL
          )::int AS published_prices,
          COUNT(DISTINCT plan_id) FILTER (
            WHERE status = 'published'
              AND billing_platform = 'ios'
              AND price_usd IS NOT NULL
          )::int AS published_plans,
          MAX(last_checked_at) FILTER (
            WHERE status = 'published'
              AND billing_platform = 'ios'
              AND price_usd IS NOT NULL
          ) AS latest_published_check
        FROM region_prices
        GROUP BY product_id
      ),
      pending_summary AS (
        SELECT
          product_id,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_observations,
          COUNT(*) FILTER (
            WHERE status = 'pending' AND COALESCE(anomaly_flag, FALSE)
          )::int AS pending_anomalies,
          MAX(observed_at) AS latest_observed_at
        FROM price_observations
        WHERE billing_platform = 'ios'
        GROUP BY product_id
      )
      SELECT
        t.slug,
        pr.name,
        COALESCE(ps.plan_count, 0)::int AS plan_count,
        COALESCE(pub.published_prices, 0)::int AS published_prices,
        COALESCE(pub.published_plans, 0)::int AS published_plans,
        pub.latest_published_check,
        COALESCE(pend.pending_observations, 0)::int AS pending_observations,
        COALESCE(pend.pending_anomalies, 0)::int AS pending_anomalies,
        pend.latest_observed_at
      FROM tracked t
      LEFT JOIN product_rows pr ON pr.slug = t.slug
      LEFT JOIN plan_summary ps ON ps.product_id = pr.id
      LEFT JOIN published_summary pub ON pub.product_id = pr.id
      LEFT JOIN pending_summary pend ON pend.product_id = pr.id
      ORDER BY array_position($1::text[], t.slug)
    `,
    [trackedProducts]
  );

  for (const row of result.rows) {
    if (!row.name) {
      failures.push(`Tracked product is missing from products: ${row.slug}`);
      printRow("fail", `product ${row.slug}`, "missing");
      continue;
    }

    if (row.published_prices <= 0) {
      failures.push(`Tracked product has no published App Store prices: ${row.slug}`);
    }

    const latestAge = daysSince(row.latest_published_check);
    if (latestAge !== null && latestAge > maxPublishedAgeDays) {
      warnings.push(
        `${row.slug} latest published price check is older than ${maxPublishedAgeDays} days.`
      );
    }

    const pendingTotal = row.pending_observations;
    const anomalyRatio = pendingTotal > 0 ? row.pending_anomalies / pendingTotal : 0;
    if (pendingTotal >= 10 && anomalyRatio > maxPendingAnomalyRatio) {
      warnings.push(
        `${row.slug} pending anomaly ratio is high: ${row.pending_anomalies}/${pendingTotal}.`
      );
    }

    const status = row.published_prices <= 0 ? "fail" : "ok";
    printRow(
      status,
      `product ${row.slug}`,
      `plans ${row.plan_count}, published ${row.published_prices}, pending ${row.pending_observations}, latest ${formatDate(
        row.latest_published_check
      )}`
    );
  }
}

async function checkPublishedLowPrices(client, trackedProducts) {
  const result = await client.query(
    `
      SELECT
        p.slug AS product,
        pl.slug AS plan,
        c.code AS country,
        rp.currency,
        rp.local_price,
        rp.price_usd,
        rp.last_checked_at
      FROM region_prices rp
      JOIN products p ON p.id = rp.product_id
      JOIN plans pl ON pl.id = rp.plan_id
      JOIN countries c ON c.id = rp.country_id
      WHERE p.slug = ANY($1::text[])
        AND rp.status = 'published'
        AND rp.billing_platform = 'ios'
        AND rp.price_usd IS NOT NULL
        AND rp.price_usd < $2
      ORDER BY rp.price_usd ASC, p.slug, pl.slug, c.code
      LIMIT 25
    `,
    [trackedProducts, minPublishedSubscriptionUsd]
  );

  if (result.rowCount === 0) {
    printRow("ok", "sub-dollar published", "none");
    return;
  }

  failures.push(
    `${result.rowCount} published App Store price(s) are below ${minPublishedSubscriptionUsd} USD.`
  );
  printRow("fail", "sub-dollar published", `${result.rowCount} row(s)`);
  for (const row of result.rows) {
    console.log(
      `      ${row.product}/${row.plan}/${row.country}: ${row.currency} ${row.local_price} = $${Number(
        row.price_usd
      ).toFixed(2)}`
    );
  }
}

async function checkPublishedMedianOutliers(client, trackedProducts) {
  const result = await client.query(
    `
      WITH published AS (
        SELECT
          rp.*,
          p.slug AS product,
          pl.slug AS plan,
          c.code AS country
        FROM region_prices rp
        JOIN products p ON p.id = rp.product_id
        JOIN plans pl ON pl.id = rp.plan_id
        JOIN countries c ON c.id = rp.country_id
        WHERE p.slug = ANY($1::text[])
          AND rp.status = 'published'
          AND rp.billing_platform = 'ios'
          AND rp.price_usd IS NOT NULL
          AND rp.price_usd >= $2
      ),
      stats AS (
        SELECT
          product_id,
          plan_id,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY price_usd)::numeric AS median_usd,
          COUNT(*) AS region_count
        FROM published
        GROUP BY product_id, plan_id
        HAVING COUNT(*) >= 8
      )
      SELECT
        published.product,
        published.plan,
        published.country,
        published.currency,
        published.local_price,
        published.price_usd,
        stats.median_usd,
        ROUND((published.price_usd / NULLIF(stats.median_usd, 0))::numeric, 2) AS median_ratio
      FROM published
      JOIN stats
        ON stats.product_id = published.product_id
       AND stats.plan_id = published.plan_id
      WHERE published.price_usd < stats.median_usd * 0.2
         OR published.price_usd > stats.median_usd * 3.5
      ORDER BY published.product, published.plan, median_ratio DESC
      LIMIT 40
    `,
    [trackedProducts, minPublishedSubscriptionUsd]
  );

  if (result.rowCount === 0) {
    printRow("ok", "published outliers", "none");
    return;
  }

  failures.push(`${result.rowCount} published price(s) are extreme versus plan median.`);
  printRow("fail", "published outliers", `${result.rowCount} row(s)`);
  for (const row of result.rows.slice(0, 10)) {
    console.log(
      `      ${row.product}/${row.plan}/${row.country}: $${Number(row.price_usd).toFixed(
        2
      )}, median $${Number(row.median_usd).toFixed(2)}, ratio ${row.median_ratio}`
    );
  }
}

async function checkTaxProfileCoverage(client) {
  const result = await client.query(`
    WITH published_countries AS (
      SELECT DISTINCT country_id
      FROM region_prices
      WHERE status = 'published'::publish_status
        AND billing_platform = 'ios'::billing_platform
    ),
    coverage AS (
      SELECT
        country.code,
        country.name_en,
        tax.id AS tax_profile_id,
        tax.confidence,
        tax.review_status
      FROM published_countries published_country
      JOIN countries country ON country.id = published_country.country_id
      LEFT JOIN country_tax_profiles tax
        ON tax.country_id = published_country.country_id
       AND tax.status = 'active'
    )
    SELECT
      COUNT(*)::int AS published_country_count,
      COUNT(*) FILTER (WHERE tax_profile_id IS NOT NULL)::int AS covered_country_count,
      COUNT(*) FILTER (WHERE tax_profile_id IS NULL)::int AS missing_country_count,
      COUNT(*) FILTER (
        WHERE confidence = 'high'
          AND review_status = 'verified'
      )::int AS verified_high_confidence_count,
      STRING_AGG(code, ', ' ORDER BY code) FILTER (WHERE tax_profile_id IS NULL) AS missing_country_codes
    FROM coverage
  `);

  const row = result.rows[0] || {};
  const missing = Number(row.missing_country_count || 0);
  const total = Number(row.published_country_count || 0);
  const covered = Number(row.covered_country_count || 0);
  const verified = Number(row.verified_high_confidence_count || 0);

  if (missing > 0) {
    failures.push(
      `${missing} published App Store country/countries are missing tax profiles: ${
        row.missing_country_codes || "unknown"
      }.`
    );
  }

  printRow(
    missing > 0 ? "fail" : "ok",
    "tax profiles",
    `${covered}/${total} covered, ${verified} high-confidence verified`
  );
}

async function checkCollectorRuns(client) {
  if (!(await tableExists(client, "collector_job_runs"))) {
    failures.push("collector_job_runs table is missing.");
    printRow("fail", "collector runs", "missing table");
    return;
  }

  const stale = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM collector_job_runs
      WHERE status = 'running'
        AND started_at < now() - ($1::text || ' minutes')::interval
    `,
    [String(maxRunningMinutes)]
  );

  if (stale.rows[0].count > 0) {
    failures.push(`${stale.rows[0].count} collector run(s) are stuck in running.`);
    printRow("fail", "collector stuck", `${stale.rows[0].count} stale running run(s)`);
  } else {
    printRow("ok", "collector stuck", "none");
  }

  const recent = await client.query(`
    SELECT status, COUNT(*)::int AS count
    FROM collector_job_runs
    WHERE started_at >= now() - interval '7 days'
    GROUP BY status
    ORDER BY status
  `);

  const summary = recent.rows.map((row) => `${row.status}:${row.count}`).join(", ") || "none";
  printRow("ok", "collector 7d runs", summary);
}

async function checkAppStoreProductRunFreshness(client, trackedProducts) {
  if (!(await tableExists(client, "collector_job_runs"))) {
    return;
  }

  const result = await client.query(
    `
      WITH tracked AS (
        SELECT unnest($1::text[]) AS slug
      )
      SELECT
        tracked.slug,
        MAX(runs.started_at) FILTER (
          WHERE runs.status = 'succeeded'
            AND runs.collector_kind = 'app_store'
        ) AS latest_success
      FROM tracked
      LEFT JOIN products ON products.slug = tracked.slug
      LEFT JOIN collector_job_runs runs ON runs.product_id = products.id
      GROUP BY tracked.slug
      ORDER BY tracked.slug
    `,
    [trackedProducts]
  );

  for (const row of result.rows) {
    const age = daysSince(row.latest_success);
    const stale = age === null || age > maxAppStoreProductRunAgeDays;
    if (stale) {
      failures.push(
        `${row.slug} has no successful App Store collection within ${maxAppStoreProductRunAgeDays} days.`
      );
    }
    printRow(
      stale ? "fail" : "ok",
      `collector ${row.slug}`,
      `latest success ${formatDate(row.latest_success)}`
    );
  }
}

async function checkUnrefreshedExactLocalPrices(client, trackedProducts) {
  const result = await client.query(
    `
      WITH candidates AS (
        SELECT DISTINCT ON (published.id)
          published.id,
          products.slug AS product,
          plans.slug AS plan,
          countries.code AS country
        FROM region_prices published
        JOIN products ON products.id = published.product_id
        JOIN plans ON plans.id = published.plan_id
        JOIN countries ON countries.id = published.country_id
        JOIN price_observations observation
          ON observation.product_id = published.product_id
         AND observation.plan_id = published.plan_id
         AND observation.country_id = published.country_id
         AND observation.billing_platform = published.billing_platform
         AND observation.price_type = published.price_type
        WHERE products.slug = ANY($1::text[])
          AND published.status = 'published'
          AND published.billing_platform = 'ios'
          AND observation.billing_platform = 'ios'
          AND (
            observation.status = 'pending'
            OR (
              observation.status = 'ignored'
              AND observation.raw_payload ->> 'auto_review_reason_code' = 'superseded_by_published_price'
            )
          )
          AND COALESCE(observation.anomaly_flag, FALSE) = FALSE
          AND observation.observed_at > COALESCE(published.last_checked_at, '-infinity'::timestamptz)
          AND published.currency IS NOT DISTINCT FROM observation.currency
          AND published.local_price IS NOT DISTINCT FROM observation.raw_price
          AND observation.converted_usd IS NOT NULL
          AND observation.converted_usd >= $2
        ORDER BY published.id, observation.observed_at DESC, observation.created_at DESC
      )
      SELECT product, plan, country
      FROM candidates
      ORDER BY product, plan, country
      LIMIT 25
    `,
    [trackedProducts, minPublishedSubscriptionUsd]
  );

  if (result.rowCount === 0) {
    printRow("ok", "exact-local refresh", "none pending");
    return;
  }

  failures.push(
    `${result.rowCount} published App Store price(s) have a newer exact-local observation.`
  );
  printRow("fail", "exact-local refresh", `${result.rowCount} row(s)`);
  for (const row of result.rows) {
    console.log(`      ${row.product}/${row.plan}/${row.country}`);
  }
}

async function main() {
  console.log("GeoSub price quality check");

  if (!databaseUrl) {
    failures.push("DATABASE_URL is not configured.");
    printRow("fail", "database", "DATABASE_URL missing");
  }

  if (failures.length > 0) {
    finish();
    return;
  }

  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });

  try {
    await client.connect();
    const required = await requireTables(client, [
      "products",
      "plans",
      "countries",
      "region_prices",
      "price_observations",
      "country_tax_profiles",
      "collector_jobs",
    ]);

    if (required) {
      const requiredFunctions = await requireDatabaseFunctions(client, [
        "run_app_store_stability_auto_review",
        "queue_app_store_anomaly_rechecks",
        "refresh_plan_affordability_metrics",
        "refresh_matching_app_store_prices",
        "quarantine_published_app_store_price_outliers",
        "refresh_inferred_app_store_tax_profiles",
      ]);
      if (!requiredFunctions) {
        finish();
        return;
      }

      const trackedProducts = await resolveTrackedProducts(client);
      if (trackedProducts.length === 0) {
        failures.push("No active App Store collector products were found.");
        printRow("fail", "tracked products", "none");
      } else {
        console.log(`Tracked products: ${trackedProducts.join(", ")}`);
        console.log("");
        await checkExchangeRates(client);
        await checkTrackedProductCoverage(client, trackedProducts);
        await checkPublishedLowPrices(client, trackedProducts);
        await checkPublishedMedianOutliers(client, trackedProducts);
        await checkUnrefreshedExactLocalPrices(client, trackedProducts);
        await checkTaxProfileCoverage(client);
        await checkCollectorRuns(client);
        await checkAppStoreProductRunFreshness(client, trackedProducts);
      }
    }
  } catch (error) {
    failures.push(error?.message || String(error));
    printRow("fail", "database", error?.message || String(error));
  } finally {
    await client.end().catch(() => {});
  }

  finish();
}

function finish() {
  console.log("");
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Price quality gate passed.");
}

main();
