#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
export const defaultCatalogPath = path.join(backendDir, "data", "software-catalog.json");
export const defaultPlanSpecsPath = path.join(backendDir, "data", "product-plan-specs.json");

const allowedBillingCycles = new Set([
  "monthly",
  "yearly",
  "weekly",
  "quarterly",
]);

export function normalizePlanMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replaceAll("+", " plus ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateSoftwareCatalog(catalog, planSpecs) {
  if (!catalog || catalog.version !== 1 || catalog.category !== "software" || !Array.isArray(catalog.products)) {
    throw new Error("Software catalog must use version 1, category 'software', and a products array.");
  }
  if (catalog.products.length === 0) {
    throw new Error("Software catalog must contain at least one product.");
  }

  const productSlugs = new Set();
  for (const product of catalog.products) {
    if (!product.slug || productSlugs.has(product.slug)) {
      throw new Error(`Missing or duplicate software product slug: ${product.slug}.`);
    }
    productSlugs.add(product.slug);

    if (product.category !== "software") {
      throw new Error(`${product.slug} must have category 'software', got '${product.category}'.`);
    }
    if (!product.name || !product.provider || !product.official_url || !Number.isInteger(product.sort_order)) {
      throw new Error(`${product.slug} is missing required product metadata.`);
    }
    if (!Array.isArray(product.plans) || product.plans.length === 0) {
      throw new Error(`${product.slug} must declare at least one canonical plan.`);
    }

    const spec = planSpecs?.[product.slug];
    if (!spec) {
      throw new Error(`${product.slug} is missing a maintained spec in data/product-plan-specs.json.`);
    }
    if (spec.exact_plan_aliases !== true) {
      throw new Error(`${product.slug} spec must set exact_plan_aliases=true for software collection.`);
    }

    if (product.app_store?.collector_enabled) {
      if (!/^\d+$/.test(String(product.app_store.id || ""))) {
        throw new Error(`${product.slug} has an invalid App Store id.`);
      }
      if (!product.app_store.bundle_id) {
        throw new Error(`${product.slug} is missing app_store.bundle_id.`);
      }
      if (String(spec.app_store_id || "") !== String(product.app_store.id)) {
        throw new Error(
          `${product.slug} app_store.id (${product.app_store.id}) does not match product-plan-specs.json (${spec.app_store_id}).`,
        );
      }
    }

    const specPlansBySlug = new Map((spec.plans || []).map((plan) => [plan.slug, plan]));
    const seenPlanSlugs = new Set();
    const aliasOwners = new Map();

    for (const plan of product.plans) {
      if (!plan.slug || !plan.name || seenPlanSlugs.has(plan.slug)) {
        throw new Error(`${product.slug} has missing or duplicate plan slug: ${plan.slug}.`);
      }
      seenPlanSlugs.add(plan.slug);

      if (!allowedBillingCycles.has(plan.billing_cycle)) {
        throw new Error(`${product.slug}/${plan.slug} has unsupported billing_cycle '${plan.billing_cycle}'.`);
      }
      if (!Number.isInteger(plan.sort_order)) {
        throw new Error(`${product.slug}/${plan.slug} needs an integer sort_order.`);
      }

      const specPlan = specPlansBySlug.get(plan.slug);
      if (!specPlan) {
        throw new Error(`${product.slug}/${plan.slug} is missing from product-plan-specs.json.`);
      }
      if (specPlan.billing_cycle !== plan.billing_cycle) {
        throw new Error(
          `${product.slug}/${plan.slug} billing_cycle (${plan.billing_cycle}) disagrees with product-plan-specs.json (${specPlan.billing_cycle}).`,
        );
      }
      if (!Array.isArray(specPlan.aliases) || specPlan.aliases.length === 0) {
        throw new Error(`${product.slug}/${plan.slug} spec needs at least one exact alias.`);
      }
      if (
        !Number.isFinite(specPlan.expected_monthly_usd_min) ||
        !Number.isFinite(specPlan.expected_monthly_usd_max) ||
        specPlan.expected_monthly_usd_min <= 0 ||
        specPlan.expected_monthly_usd_max <= specPlan.expected_monthly_usd_min
      ) {
        throw new Error(`${product.slug}/${plan.slug} spec needs a valid expected USD range.`);
      }

      for (const alias of specPlan.aliases) {
        const normalized = normalizePlanMatchText(alias);
        if (!normalized) {
          throw new Error(`${product.slug}/${plan.slug} has an empty normalized alias.`);
        }
        const existingOwner = aliasOwners.get(normalized);
        if (existingOwner && existingOwner !== plan.slug) {
          throw new Error(
            `${product.slug} alias ${JSON.stringify(alias)} collides between ${existingOwner} and ${plan.slug}.`,
          );
        }
        aliasOwners.set(normalized, plan.slug);
      }
    }
  }
}

export function buildSoftwareCatalogSql(catalog) {
  const catalogSource = String(catalog.catalog_source || "software-catalog").replaceAll("'", "''");
  const productsJson = JSON.stringify(catalog.products, null, 2);

  return `-- Generated by scripts/generate-software-catalog-sql.mjs.
-- Source: data/software-catalog.json (generic category='software' App Store onboarding).
-- New software products and plans enter 'review' status; existing lifecycle state is preserved.

BEGIN;

CREATE TEMP TABLE geosub_software_catalog(payload JSONB) ON COMMIT DROP;
INSERT INTO geosub_software_catalog(payload)
VALUES ($software_catalog$${productsJson}$software_catalog$::jsonb);

WITH catalog AS (
  SELECT item AS product
  FROM geosub_software_catalog,
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
  'software'::product_category,
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
  FROM geosub_software_catalog,
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
  FROM geosub_software_catalog,
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
    'integration_status', 'app_store_ready',
    'catalog_source', '${catalogSource}'
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
  FROM geosub_software_catalog,
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
    'catalog_source', '${catalogSource}'
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
  FROM geosub_software_catalog,
       jsonb_array_elements(payload) AS item
  WHERE COALESCE((item -> 'app_store' ->> 'collector_enabled')::boolean, FALSE)
), job_variants(schedule, priority, delay_days, country_codes, accuracy_policy) AS (
  VALUES
    ('daily_light', 85, 0, '["US","JP","GB","DE","FR","IN","TR","BR","CA","SG","AU","KR","MX","ID","PH","TH","MY","VN","ZA","AE"]'::jsonb, 'daily_core_regions'),
    ('weekly_full', 50, 3, '["DEFAULT"]'::jsonb, 'weekly_common_regions')
)
INSERT INTO collector_jobs (
  id, product_id, job_type, schedule, status, next_run_at,
  success_count, error_count, last_error, job_config, priority, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  product.id,
  'price_check',
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
    'created_from', '${catalogSource}'
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
  const args = process.argv.slice(2);
  const catalogPath = args.includes("--catalog")
    ? path.resolve(args[args.indexOf("--catalog") + 1])
    : defaultCatalogPath;
  const planSpecsPath = args.includes("--plan-specs")
    ? path.resolve(args[args.indexOf("--plan-specs") + 1])
    : defaultPlanSpecsPath;

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const planSpecs = JSON.parse(fs.readFileSync(planSpecsPath, "utf8"));
  validateSoftwareCatalog(catalog, planSpecs);

  if (args.includes("--check")) {
    console.log(
      `Software catalog valid: ${catalog.products.length} products (${catalog.products
        .map((product) => product.slug)
        .join(", ")}).`,
    );
    return;
  }

  const sql = buildSoftwareCatalogSql(catalog);
  if (args.includes("--output")) {
    const outPath = path.resolve(args[args.indexOf("--output") + 1]);
    fs.writeFileSync(outPath, sql, "utf8");
    console.log(`Wrote ${path.relative(backendDir, outPath)}.`);
    return;
  }

  process.stdout.write(sql);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
