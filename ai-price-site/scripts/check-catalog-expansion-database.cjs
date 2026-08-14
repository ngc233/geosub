const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const appDir = path.resolve(__dirname, "..");
const catalog = require("../../geosub-backend/data/catalog-expansion-2026-08.json");

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

function assertEqual(actual, expected, label) {
  if (Number(actual) !== expected) {
    throw new Error(`${label}: expected ${expected}, found ${actual}.`);
  }
}

function expectedPlanKey(productSlug, planSlug) {
  return `${productSlug}/${planSlug}`;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const managedProducts = [
      ...catalog.products,
      ...(catalog.required_products || []),
    ];
    const slugs = managedProducts.map((product) => product.slug);
    const expectedPlans = new Set(
      managedProducts.flatMap((product) =>
        product.plans.map((plan) => expectedPlanKey(product.slug, plan.slug)),
      ),
    );
    const expectedAppProducts = managedProducts.filter(
      (product) => product.app_store?.collector_enabled,
    ).length;
    const result = await client.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM products WHERE slug = ANY($1::text[])) AS products,
          (SELECT COUNT(*)::int FROM products WHERE slug = ANY($1::text[]) AND status = 'review'::publish_status) AS review_products,
          (SELECT COUNT(*)::int FROM products WHERE slug = ANY($1::text[]) AND status = 'published'::publish_status) AS published_products,
          (SELECT COUNT(*)::int FROM products WHERE slug = ANY($1::text[]) AND status = 'archived'::publish_status) AS archived_products,
          (
            SELECT COUNT(*)::int
            FROM collector_jobs job
            JOIN products product ON product.id = job.product_id
            WHERE product.slug = ANY($1::text[])
              AND job.status <> 'archived'
              AND job.job_config ->> 'collector_kind' = 'app_store'
              AND job.schedule IN ('daily_light', 'weekly_full')
          ) AS jobs,
          (
            SELECT COUNT(*)::int
            FROM product_source_profiles profile
            WHERE profile.product_slug = ANY($1::text[])
              AND profile.source_type = 'official_page'
          ) AS official_profiles,
          (
            SELECT COUNT(*)::int
            FROM product_source_profiles profile
            WHERE profile.product_slug = ANY($1::text[])
              AND profile.source_type = 'app_store_page'
          ) AS app_profiles
      `,
      [slugs],
    );
    const row = result.rows[0];

    assertEqual(row.products, managedProducts.length, "products");
    assertEqual(
      Number(row.review_products) + Number(row.published_products),
      managedProducts.length,
      "active products",
    );
    assertEqual(row.archived_products, 0, "archived products");
    assertEqual(row.jobs, expectedAppProducts * 2, "collector jobs");
    assertEqual(row.official_profiles, managedProducts.length, "official profiles");
    assertEqual(row.app_profiles, expectedAppProducts, "App Store profiles");

    const planResult = await client.query(
      `
        SELECT
          product.slug AS product_slug,
          plan.slug AS plan_slug,
          plan.status::text AS plan_status
        FROM plans plan
        JOIN products product ON product.id = plan.product_id
        WHERE product.slug = ANY($1::text[])
      `,
      [slugs],
    );
    const activePlanKeys = new Set(
      planResult.rows
        .filter((plan) => plan.plan_status !== "archived")
        .map((plan) => expectedPlanKey(plan.product_slug, plan.plan_slug)),
    );
    const missingPlans = [...expectedPlans].filter((key) => !activePlanKeys.has(key));
    if (missingPlans.length > 0) {
      throw new Error(`canonical plans missing or archived: ${missingPlans.join(", ")}.`);
    }
    const unexpectedActivePlans = [...activePlanKeys].filter(
      (key) => !expectedPlans.has(key),
    );
    if (unexpectedActivePlans.length > 0) {
      throw new Error(
        `active plans outside the canonical catalog: ${unexpectedActivePlans.join(", ")}.`,
      );
    }
    const historicalPlanCount = planResult.rows.length - expectedPlans.size;

    const cycleResult = await client.query(
      `
        SELECT plan.billing_cycle::text AS billing_cycle, COUNT(*)::int AS count
        FROM plans plan
        JOIN products product ON product.id = plan.product_id
        WHERE product.slug = ANY($1::text[])
        GROUP BY plan.billing_cycle
        ORDER BY plan.billing_cycle
      `,
      [slugs],
    );

    console.log("Catalog expansion database check passed.");
    console.log({
      ...row,
      canonical_plans: expectedPlans.size,
      retained_historical_plans: historicalPlanCount,
    });
    console.log(cycleResult.rows);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
