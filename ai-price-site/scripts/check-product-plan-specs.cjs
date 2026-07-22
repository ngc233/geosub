const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..");
const specPath = path.join(repoDir, "geosub-backend", "data", "product-plan-specs.json");

dotenv.config({ path: path.join(appDir, ".env.local") });
dotenv.config({ path: path.join(appDir, ".env") });

const mojibakePattern = /\uFFFD|Ã.|Â.|â€|ðŸ|锟/;

function normalizeAlias(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function validateSpecs(specs) {
  const failures = [];

  for (const [productSlug, product] of Object.entries(specs)) {
    const planSlugs = new Set();
    const aliasOwners = new Map();

    if (!Array.isArray(product.plans) || product.plans.length === 0) {
      failures.push(`${productSlug} has no canonical plans.`);
      continue;
    }

    for (const plan of product.plans) {
      if (!plan.slug || !plan.name || planSlugs.has(plan.slug)) {
        failures.push(`${productSlug} has a missing or duplicate plan slug: ${plan.slug || "<empty>"}.`);
      }
      planSlugs.add(plan.slug);

      if (!Number.isFinite(plan.sort_order)) {
        failures.push(`${productSlug}/${plan.slug} has no numeric sort_order.`);
      }
      if (
        !Number.isFinite(plan.expected_monthly_usd_min) ||
        !Number.isFinite(plan.expected_monthly_usd_max) ||
        plan.expected_monthly_usd_min <= 0 ||
        plan.expected_monthly_usd_max <= plan.expected_monthly_usd_min
      ) {
        failures.push(`${productSlug}/${plan.slug} has an invalid expected monthly USD range.`);
      }

      const aliases = [...new Set([...(plan.aliases || []), plan.slug, plan.name])];
      if (aliases.length < 2) {
        failures.push(`${productSlug}/${plan.slug} has insufficient aliases.`);
      }

      for (const alias of aliases) {
        if (mojibakePattern.test(alias)) {
          failures.push(`${productSlug}/${plan.slug} contains a mojibake alias: ${alias}.`);
        }

        const normalized = normalizeAlias(alias);
        if (!normalized) {
          failures.push(`${productSlug}/${plan.slug} contains an empty normalized alias.`);
          continue;
        }

        const owner = aliasOwners.get(normalized);
        if (owner && owner !== plan.slug) {
          failures.push(
            `${productSlug} alias "${alias}" resolves to both ${owner} and ${plan.slug}.`,
          );
        } else {
          aliasOwners.set(normalized, plan.slug);
        }
      }
    }
  }

  return failures;
}

async function validateDatabase(specs) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const productSlugs = Object.keys(specs);
    const productResult = await client.query(
        `
          SELECT slug
          FROM products
          WHERE slug = ANY($1::text[])
            AND status <> 'archived'::publish_status
        `,
        [productSlugs],
      );
    const planResult = await client.query(
        `
          SELECT
            product.slug AS product_slug,
            plan.slug AS plan_slug,
            plan.name AS plan_name,
            plan.sort_order,
            plan.status::text AS plan_status
          FROM products product
          JOIN plans plan ON plan.product_id = product.id
          WHERE product.slug = ANY($1::text[])
            AND plan.status <> 'archived'::publish_status
          ORDER BY product.slug, plan.sort_order, plan.slug
        `,
        [productSlugs],
      );
    const collectorResult = await client.query(`
        SELECT DISTINCT product.slug
        FROM products product
        JOIN collector_jobs job ON job.product_id = product.id
        WHERE product.status <> 'archived'::publish_status
          AND job.status <> 'archived'
          AND job.job_config ->> 'collector_kind' = 'app_store'
        ORDER BY product.slug
      `);

    const failures = [];
    const existingProducts = new Set(productResult.rows.map((row) => row.slug));
    const collectorProducts = new Set(collectorResult.rows.map((row) => row.slug));
    const rowsByProduct = new Map();
    for (const row of planResult.rows) {
      const rows = rowsByProduct.get(row.product_slug) || [];
      rows.push(row);
      rowsByProduct.set(row.product_slug, rows);
    }

    for (const [productSlug, product] of Object.entries(specs)) {
      if (!existingProducts.has(productSlug)) {
        failures.push(`${productSlug} is missing from the active product catalog.`);
        continue;
      }

      if (!collectorProducts.has(productSlug)) {
        failures.push(`${productSlug} has no active App Store collector.`);
      }

      const actualPlans = rowsByProduct.get(productSlug) || [];
      const actualBySlug = new Map(actualPlans.map((plan) => [plan.plan_slug, plan]));
      const expectedSlugs = new Set(product.plans.map((plan) => plan.slug));

      for (const plan of product.plans) {
        const actual = actualBySlug.get(plan.slug);
        if (!actual) {
          failures.push(`${productSlug}/${plan.slug} is missing from active database plans.`);
          continue;
        }
        if (actual.plan_name !== plan.name) {
          failures.push(
            `${productSlug}/${plan.slug} name differs: database "${actual.plan_name}", spec "${plan.name}".`,
          );
        }
        if (Number(actual.sort_order) !== Number(plan.sort_order)) {
          failures.push(
            `${productSlug}/${plan.slug} sort order differs: database ${actual.sort_order}, spec ${plan.sort_order}.`,
          );
        }
      }

      for (const actual of actualPlans) {
        if (!expectedSlugs.has(actual.plan_slug)) {
          failures.push(`${productSlug}/${actual.plan_slug} is active but absent from the canonical spec.`);
        }
      }
    }

    for (const row of collectorResult.rows) {
      if (!specs[row.slug]) {
        failures.push(`${row.slug} has an active App Store collector but no canonical product plan spec.`);
      }
    }

    return failures;
  } finally {
    await client.end();
  }
}

async function main() {
  const specs = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const failures = [...validateSpecs(specs), ...(await validateDatabase(specs))];

  console.log(`Canonical plan products: ${Object.keys(specs).join(", ")}`);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL  ${failure}`);
    throw new Error(`${failures.length} product plan specification problem(s) found.`);
  }

  console.log("Product plan specification check passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
