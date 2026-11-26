import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  evaluateObservationAnomaly,
  getObservedCurrency,
  parsePriceNumber,
} from "./collect-app-store-prices.mjs";
import {
  buildSoftwareCatalogSql,
  defaultCatalogPath,
  defaultPlanSpecsPath,
  normalizePlanMatchText,
  validateSoftwareCatalog,
} from "./generate-software-catalog-sql.mjs";

const scriptsDir = import.meta.dirname;
const runnerSource = fs.readFileSync(path.join(scriptsDir, "run-collector-jobs.ps1"), "utf8");
const catalog = JSON.parse(fs.readFileSync(defaultCatalogPath, "utf8"));
const planSpecs = JSON.parse(fs.readFileSync(defaultPlanSpecsPath, "utf8"));

function resolveExactPlanSpec(productSpec, itemName) {
  const normalizedItem = normalizePlanMatchText(itemName);
  for (const plan of productSpec.plans || []) {
    for (const alias of plan.aliases || []) {
      if (normalizePlanMatchText(alias) === normalizedItem) {
        return plan;
      }
    }
  }
  return null;
}

test("scheduler enables category-generic software App Store collection without per-product branches", () => {
  assert.match(
    runnerSource,
    /job\.job_type = 'price_check' AND product\.category = 'software'\s+AND COALESCE\(job\.job_config ->> 'collector_kind', source\.type::text, 'unknown'\) = 'app_store'/,
  );
  for (const slug of ["canva", "notion", "capcut", "adobe-lightroom", "goodnotes"]) {
    assert.doesNotMatch(runnerSource, new RegExp(`['"]${slug}['"]`, "i"));
  }
});

test("initial 5-product software catalog passes cross-validation against product-plan-specs.json", () => {
  assert.doesNotThrow(() => validateSoftwareCatalog(catalog, planSpecs));
  assert.deepEqual(
    catalog.products.map((product) => product.slug),
    ["canva", "notion", "capcut", "adobe-lightroom", "goodnotes"],
  );
  for (const product of catalog.products) {
    const spec = planSpecs[product.slug];
    assert.ok(spec, `Missing spec for ${product.slug}`);
    assert.equal(spec.exact_plan_aliases, true);
    for (const plan of spec.plans) {
      assert.equal(plan.review_only, true, `${product.slug}/${plan.slug} must remain review_only`);
    }
  }
});

test("software exact plan aliases match live IAP subscription titles and reject ambiguous or consumable items", () => {
  const cases = [
    ["canva", "Canva Pro - Monthly", "pro"],
    ["canva", "Canva Business - Monthly", "business"],
    ["canva", "Canva Pro - Yearly", null],
    ["canva", "Canva Credit", null],
    ["notion", "Notion – Plus Monthly", "plus"],
    ["notion", "Notion Business", null],
    ["notion", "Notion – Plus Yearly", null],
    ["capcut", "Standard Monthly Subscription", "standard"],
    ["capcut", "Pro Monthly Subscription", "pro"],
    ["capcut", "Monthly Subscription", null],
    ["capcut", "Yearly Subscription", null],
    ["capcut", "Purchased Credits", null],
    ["adobe-lightroom", "Premium monthly 40GB", "premium-40gb"],
    ["adobe-lightroom", "Premium Monthly 40GB", "premium-40gb"],
    ["adobe-lightroom", "Premium Monthly 100GB", "premium-100gb"],
    ["adobe-lightroom", "Premium Yearly 100GB", null],
    ["adobe-lightroom", "Premium Weekly 100GB", null],
    ["adobe-lightroom", "Lightroom plan 1TB", null],
    ["goodnotes", "Essential (Yearly)", "essential-yearly"],
    ["goodnotes", "Goodnotes Pro (Yearly)", "pro-yearly"],
    ["goodnotes", "Pro (Yearly)", "pro-yearly"],
    ["goodnotes", "AI Pass (Monthly)", "ai-pass"],
    ["goodnotes", "Goodnotes 6 Free Trial", null],
    ["goodnotes", "Goodnotes 6 One-Time Payment", null],
    ["goodnotes", "Marketplace Content", null],
  ];

  for (const [slug, itemName, expectedPlanSlug] of cases) {
    const resolved = resolveExactPlanSpec(planSpecs[slug], itemName);
    assert.equal(resolved?.slug ?? null, expectedPlanSlug, `${slug}: ${itemName}`);
  }
});

test("validateSoftwareCatalog rejects missing plan specs and mismatched App Store IDs", () => {
  const missingSpecCatalog = {
    ...catalog,
    products: [{ ...catalog.products[0], slug: "unregistered-software" }],
  };
  assert.throws(
    () => validateSoftwareCatalog(missingSpecCatalog, planSpecs),
    /missing a maintained spec/,
  );

  const mismatchedIdCatalog = {
    ...catalog,
    products: [
      {
        ...catalog.products[0],
        app_store: { ...catalog.products[0].app_store, id: "999999999" },
      },
    ],
  };
  assert.throws(
    () => validateSoftwareCatalog(mismatchedIdCatalog, planSpecs),
    /does not match product-plan-specs\.json/,
  );
});

test("scheduler dispatches software App Store jobs to collect-app-store-prices.mjs while keeping legacy ps1 untouched", () => {
  assert.match(runnerSource, /product\.category::text AS product_category/);
  assert.match(runnerSource, /\[string\]\$Job\.product_category -eq "software"/);
  assert.match(runnerSource, /Join-Path \$PSScriptRoot "collect-app-store-prices\.mjs"/);
  assert.match(runnerSource, /Join-Path \$PSScriptRoot "collect-app-store-prices\.ps1"/);
});

test("collect-app-store-prices.mjs parses localized prices, currencies, and review-only anomalies", () => {
  assert.equal(parsePriceNumber("$14.99"), 14.99);
  assert.equal(parsePriceNumber("₺1.919,99"), 1919.99);
  assert.equal(parsePriceNumber("₹\u00A01,199"), 1199);
  assert.equal(getObservedCurrency("£12.99", "GBP"), "GBP");
  assert.equal(getObservedCurrency("₺239,99", "TRY"), "TRY");

  const anomaly = evaluateObservationAnomaly({
    countryCurrency: "USD",
    observedCurrency: "USD",
    convertedUsd: 14.99,
    originalPriceText: "$14.99",
    planSpec: planSpecs.canva.plans[0],
  });
  assert.equal(anomaly.flag, true);
  assert.match(anomaly.reason, /manual identity/);
});

test("buildSoftwareCatalogSql generates idempotent review-only onboarding SQL with price_check app_store jobs", () => {
  const sql = buildSoftwareCatalogSql(catalog);
  assert.match(sql, /'software'::product_category/);
  assert.match(sql, /'review'::publish_status/);
  assert.match(sql, /'price_check'/);
  assert.match(sql, /'collector_kind', 'app_store'/);
  assert.match(sql, /ON CONFLICT \(slug\) DO UPDATE/);
  assert.match(sql, /ON CONFLICT \(product_id, slug\) DO UPDATE/);
});
