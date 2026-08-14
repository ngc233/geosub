#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const backendDir = path.resolve(__dirname, "..");
const catalogPath = path.join(backendDir, "data", "catalog-expansion-2026-08.json");
const outputPath = path.join(
  backendDir,
  "sql",
  "backfill",
  "049_expand_competitor_catalog.sql",
);
const requiredProductMigrationPaths = [
  path.join(backendDir, "sql", "backfill", "050_ensure_required_catalog_products.sql"),
  path.join(backendDir, "sql", "backfill", "051_normalize_suno_app_store_plans.sql"),
  path.join(backendDir, "sql", "backfill", "052_normalize_copilot_app_store_plans.sql"),
];
const allowedCategories = new Set(["ai", "streaming"]);
const allowedBillingCycles = new Set([
  "monthly",
  "yearly",
  "weekly",
  "quarterly",
  "one_time",
  "lifetime",
  "unknown",
]);

function normalizeAlias(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replaceAll("+", " plus ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function validatePlan(product, plan, planSlugs, aliasOwners) {
  if (!plan.slug || !plan.name || planSlugs.has(plan.slug)) {
    throw new Error(`${product.slug} has a missing or duplicate plan slug: ${plan.slug}.`);
  }
  planSlugs.add(plan.slug);

  if (!allowedBillingCycles.has(plan.billing_cycle)) {
    throw new Error(`${product.slug}/${plan.slug} has invalid billing cycle ${plan.billing_cycle}.`);
  }
  if (!Number.isInteger(plan.sort_order)) {
    throw new Error(`${product.slug}/${plan.slug} has no integer sort_order.`);
  }

  const aliases = [...new Set([...(plan.aliases || []), plan.slug, plan.name])];
  for (const alias of aliases) {
    const normalized = normalizeAlias(alias);
    if (!normalized) throw new Error(`${product.slug}/${plan.slug} has an empty alias.`);
    const owner = aliasOwners.get(normalized);
    if (owner && owner !== plan.slug) {
      throw new Error(
        `${product.slug} alias ${JSON.stringify(alias)} belongs to ${owner} and ${plan.slug}.`,
      );
    }
    aliasOwners.set(normalized, plan.slug);
  }

  if (product.app_store?.collector_enabled) {
    if (
      !Number.isFinite(plan.expected_usd_min) ||
      !Number.isFinite(plan.expected_usd_max) ||
      plan.expected_usd_min <= 0 ||
      plan.expected_usd_max <= plan.expected_usd_min
    ) {
      throw new Error(`${product.slug}/${plan.slug} needs a valid expected USD range.`);
    }
  }
}

function validateCatalog(catalog) {
  if (catalog.version !== 1 || !Array.isArray(catalog.products)) {
    throw new Error("Catalog expansion must use version 1 and contain products.");
  }
  if (catalog.products.length !== 29) {
    throw new Error(`Expected 29 missing products, found ${catalog.products.length}.`);
  }

  const slugs = new Set();
  const categoryCounts = { ai: 0, streaming: 0 };
  let collectorCount = 0;

  for (const product of catalog.products) {
    if (!product.slug || slugs.has(product.slug)) {
      throw new Error(`Missing or duplicate product slug: ${product.slug}.`);
    }
    slugs.add(product.slug);
    if (!allowedCategories.has(product.category)) {
      throw new Error(`${product.slug} has invalid category ${product.category}.`);
    }
    categoryCounts[product.category] += 1;
    if (!product.name || !product.provider || !product.official_url) {
      throw new Error(`${product.slug} is missing public product metadata.`);
    }
    if (!Array.isArray(product.plans) || product.plans.length === 0) {
      throw new Error(`${product.slug} has no maintained plans.`);
    }

    if (product.app_store?.collector_enabled) {
      collectorCount += 1;
      if (!/^\d+$/.test(product.app_store.id || "")) {
        throw new Error(`${product.slug} has an invalid App Store id.`);
      }
    } else if (!product.integration_status || !product.integration_note) {
      throw new Error(`${product.slug} needs a reason for not enabling collection.`);
    }

    const planSlugs = new Set();
    const aliasOwners = new Map();
    product.plans.forEach((plan) => validatePlan(product, plan, planSlugs, aliasOwners));
  }

  if (categoryCounts.ai !== 15 || categoryCounts.streaming !== 14) {
    throw new Error(
      `Expected 15 AI and 14 streaming products, found ${categoryCounts.ai} and ${categoryCounts.streaming}.`,
    );
  }
  if (collectorCount !== 25) {
    throw new Error(`Expected 25 App Store-ready products, found ${collectorCount}.`);
  }

  const requiredProducts = catalog.required_products || [];
  if (requiredProducts.length !== 3) {
    throw new Error(`Expected 3 required existing products, found ${requiredProducts.length}.`);
  }
  for (const product of requiredProducts) {
    if (!product.slug || !product.app_store?.collector_enabled) {
      throw new Error("Required products need a slug and an enabled App Store source.");
    }
    const planSlugs = new Set();
    const aliasOwners = new Map();
    product.plans.forEach((plan) => validatePlan(product, plan, planSlugs, aliasOwners));
  }
}

function buildSql(catalog) {
  const productsJson = JSON.stringify(catalog.products, null, 2);
  return `-- Generated by scripts/generate-catalog-expansion-sql.cjs.
-- Do not edit this file by hand; update data/catalog-expansion-2026-08.json.
-- New products and plans enter review. Existing lifecycle state is preserved.

BEGIN;

CREATE TEMP TABLE geosub_catalog_expansion(payload JSONB) ON COMMIT DROP;
INSERT INTO geosub_catalog_expansion(payload)
VALUES ($catalog$${productsJson}$catalog$::jsonb);

WITH catalog AS (
  SELECT item AS product
  FROM geosub_catalog_expansion,
       jsonb_array_elements(payload) AS item
)
INSERT INTO products (
  id, slug, name, category, provider, description, official_url,
  status, featured, sort_order, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  product ->> 'slug',
  product ->> 'name',
  (product ->> 'category')::product_category,
  product ->> 'provider',
  product ->> 'description',
  product ->> 'official_url',
  'review'::publish_status,
  FALSE,
  (product ->> 'sort_order')::integer,
  NOW(),
  NOW()
FROM catalog
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  provider = EXCLUDED.provider,
  description = COALESCE(NULLIF(products.description, ''), EXCLUDED.description),
  official_url = EXCLUDED.official_url,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH catalog AS (
  SELECT item AS product
  FROM geosub_catalog_expansion,
       jsonb_array_elements(payload) AS item
), canonical_plans AS (
  SELECT
    product ->> 'slug' AS product_slug,
    plan
  FROM catalog,
       jsonb_array_elements(product -> 'plans') AS plan
)
INSERT INTO plans (
  id, product_id, slug, name, billing_cycle, status, sort_order, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  product.id,
  canonical.plan ->> 'slug',
  canonical.plan ->> 'name',
  (canonical.plan ->> 'billing_cycle')::billing_cycle,
  'review'::publish_status,
  (canonical.plan ->> 'sort_order')::integer,
  NOW(),
  NOW()
FROM canonical_plans canonical
JOIN products product ON product.slug = canonical.product_slug
ON CONFLICT (product_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  billing_cycle = EXCLUDED.billing_cycle,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH catalog AS (
  SELECT item AS product
  FROM geosub_catalog_expansion,
       jsonb_array_elements(payload) AS item
)
UPDATE product_source_profiles profile
SET
  product_id = product.id,
  source_name = product.name || ' official pricing',
  source_url = catalog.product ->> 'official_url',
  config = jsonb_build_object(
    'integration_status', COALESCE(catalog.product ->> 'integration_status', 'app_store_ready'),
    'integration_note', catalog.product ->> 'integration_note',
    'catalog_source', 'catalog-expansion-2026-08'
  ),
  is_active = TRUE,
  updated_at = NOW()
FROM catalog
JOIN products product ON product.slug = catalog.product ->> 'slug'
WHERE profile.product_slug = product.slug
  AND profile.platform = 'web'
  AND profile.source_type = 'official_page';

WITH catalog AS (
  SELECT item AS product
  FROM geosub_catalog_expansion,
       jsonb_array_elements(payload) AS item
)
INSERT INTO product_source_profiles (
  id, product_id, product_slug, platform, source_type, source_name,
  source_url, config, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  product.id,
  product.slug,
  'web',
  'official_page',
  product.name || ' official pricing',
  catalog.product ->> 'official_url',
  jsonb_build_object(
    'integration_status', COALESCE(catalog.product ->> 'integration_status', 'app_store_ready'),
    'integration_note', catalog.product ->> 'integration_note',
    'catalog_source', 'catalog-expansion-2026-08'
  ),
  TRUE,
  NOW(),
  NOW()
FROM catalog
JOIN products product ON product.slug = catalog.product ->> 'slug'
WHERE NOT EXISTS (
  SELECT 1
  FROM product_source_profiles existing
  WHERE existing.product_slug = product.slug
    AND existing.platform = 'web'
    AND existing.source_type = 'official_page'
);

WITH catalog AS (
  SELECT item AS product
  FROM geosub_catalog_expansion,
       jsonb_array_elements(payload) AS item
  WHERE COALESCE((item -> 'app_store' ->> 'collector_enabled')::boolean, FALSE)
)
UPDATE product_source_profiles profile
SET
  product_id = product.id,
  source_name = product.name || ' App Store',
  external_app_id = catalog.product -> 'app_store' ->> 'id',
  bundle_id = catalog.product -> 'app_store' ->> 'bundle_id',
  source_url = 'https://apps.apple.com/us/app/id' || (catalog.product -> 'app_store' ->> 'id'),
  config = jsonb_build_object(
    'collector_kind', 'app_store',
    'catalog_source', 'catalog-expansion-2026-08'
  ),
  is_active = TRUE,
  updated_at = NOW()
FROM catalog
JOIN products product ON product.slug = catalog.product ->> 'slug'
WHERE profile.product_slug = product.slug
  AND profile.platform = 'app_store_ios'
  AND profile.source_type = 'app_store_page'
  AND COALESCE(profile.external_app_id, '') = catalog.product -> 'app_store' ->> 'id';

WITH catalog AS (
  SELECT item AS product
  FROM geosub_catalog_expansion,
       jsonb_array_elements(payload) AS item
  WHERE COALESCE((item -> 'app_store' ->> 'collector_enabled')::boolean, FALSE)
)
INSERT INTO product_source_profiles (
  id, product_id, product_slug, platform, source_type, source_name,
  external_app_id, bundle_id, source_url, config, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  product.id,
  product.slug,
  'app_store_ios',
  'app_store_page',
  product.name || ' App Store',
  catalog.product -> 'app_store' ->> 'id',
  catalog.product -> 'app_store' ->> 'bundle_id',
  'https://apps.apple.com/us/app/id' || (catalog.product -> 'app_store' ->> 'id'),
  jsonb_build_object(
    'collector_kind', 'app_store',
    'catalog_source', 'catalog-expansion-2026-08'
  ),
  TRUE,
  NOW(),
  NOW()
FROM catalog
JOIN products product ON product.slug = catalog.product ->> 'slug'
WHERE NOT EXISTS (
  SELECT 1
  FROM product_source_profiles existing
  WHERE existing.product_slug = product.slug
    AND existing.platform = 'app_store_ios'
    AND existing.source_type = 'app_store_page'
    AND COALESCE(existing.external_app_id, '') = catalog.product -> 'app_store' ->> 'id'
);

WITH app_store_catalog AS (
  SELECT
    item AS product,
    ROW_NUMBER() OVER (ORDER BY (item ->> 'sort_order')::integer, item ->> 'slug') - 1 AS sequence
  FROM geosub_catalog_expansion,
       jsonb_array_elements(payload) AS item
  WHERE COALESCE((item -> 'app_store' ->> 'collector_enabled')::boolean, FALSE)
), job_variants(schedule, priority, delay_days, country_codes, accuracy_policy) AS (
  VALUES
    ('daily_light', 90, 0, '["US","JP","GB","DE","FR","IN","TR","BR","CA","SG","AU","KR","MX","ID","PH","TH","MY","VN","ZA","AE"]'::jsonb, 'daily_core_regions'),
    ('weekly_full', 55, 3, '["DEFAULT"]'::jsonb, 'weekly_common_regions')
)
INSERT INTO collector_jobs (
  id, product_id, job_type, schedule, status, next_run_at,
  success_count, error_count, last_error, job_config, priority, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  product.id,
  CASE
    WHEN product.category = 'streaming'::product_category THEN 'streaming_pricing'
    ELSE 'ai_pricing'
  END,
  variant.schedule,
  'active',
  NOW() + make_interval(days => variant.delay_days, hours => catalog.sequence::integer),
  0,
  0,
  NULL,
  jsonb_build_object(
    'url', 'https://apps.apple.com/us/app/id' || (catalog.product -> 'app_store' ->> 'id'),
    'product_id', product.id,
    'source_kind', 'app-store',
    'app_store_id', catalog.product -> 'app_store' ->> 'id',
    'collector_kind', 'app_store',
    'schedule_strategy', variant.schedule,
    'country_codes', variant.country_codes,
    'accuracy_policy', variant.accuracy_policy,
    'created_from', 'catalog-expansion-2026-08'
  ),
  variant.priority,
  NOW(),
  NOW()
FROM app_store_catalog catalog
JOIN products product ON product.slug = catalog.product ->> 'slug'
CROSS JOIN job_variants variant
WHERE NOT EXISTS (
  SELECT 1
  FROM collector_jobs existing
  WHERE existing.product_id = product.id
    AND existing.job_config ->> 'collector_kind' = 'app_store'
    AND existing.schedule = variant.schedule
    AND existing.status <> 'archived'
);

COMMIT;
`;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  validateCatalog(catalog);
  const generated = buildSql(catalog);

  if (process.argv.includes("--check")) {
    if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== generated) {
      throw new Error("Generated catalog migration is missing or out of date.");
    }
    const missingRequiredMigrations = requiredProductMigrationPaths.filter(
      (migrationPath) => !fs.existsSync(migrationPath),
    );
    if (missingRequiredMigrations.length > 0) {
      throw new Error(
        `Required-product migrations are missing: ${missingRequiredMigrations
          .map((migrationPath) => path.relative(backendDir, migrationPath))
          .join(", ")}.`,
      );
    }
    console.log("Catalog expansion is current; existing-product corrections are immutable migrations.");
    return;
  }

  fs.writeFileSync(outputPath, generated, "utf8");
  console.log(`Wrote ${path.relative(backendDir, outputPath)}.`);
  console.log("Required existing products remain managed by immutable correction migrations.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
