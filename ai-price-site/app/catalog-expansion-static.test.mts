import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(import.meta.dirname, "../..");
const catalog = JSON.parse(
  readFileSync(
    resolve(repoRoot, "geosub-backend/data/catalog-expansion-2026-08.json"),
    "utf8",
  ),
);
const migration = readFileSync(
  resolve(repoRoot, "geosub-backend/sql/backfill/049_expand_competitor_catalog.sql"),
  "utf8",
);
const collector = readFileSync(
  resolve(repoRoot, "geosub-backend/scripts/collect-app-store-prices.ps1"),
  "utf8",
);
const sunoNormalization = readFileSync(
  resolve(repoRoot, "geosub-backend/sql/backfill/051_normalize_suno_app_store_plans.sql"),
  "utf8",
);
const copilotNormalization = readFileSync(
  resolve(repoRoot, "geosub-backend/sql/backfill/052_normalize_copilot_app_store_plans.sql"),
  "utf8",
);

type CatalogProduct = {
  slug: string;
  match_product_name?: string;
  plans: Array<{
    slug: string;
    allow_recurring_consumable_terms?: boolean;
  }>;
};

const expectedMissingProducts = [
  "anghami",
  "boomplay",
  "captions",
  "catcosplay",
  "character-ai",
  "crunchyroll",
  "deezer",
  "dramabox",
  "f1-tv",
  "glm",
  "goodshort",
  "heygen",
  "invideo-ai",
  "kling-ai",
  "le-chat",
  "leonardo-ai",
  "microsoft-copilot",
  "mubi",
  "podimo",
  "poe",
  "pollo-ai",
  "reelshort",
  "runwayml",
  "sora",
  "soundcloud",
  "spotify",
  "viki",
  "x-premium",
  "youtube-premium",
];
const bySlug = new Map<string, CatalogProduct>(
  catalog.products.map(
    (product: CatalogProduct) => [product.slug, product] as const,
  ),
);

test("competitor catalog gap is represented once with guarded collection", () => {
  assert.equal(catalog.products.length, 29);
  assert.deepEqual(
    catalog.products.map((product: { slug: string }) => product.slug).sort(),
    expectedMissingProducts,
  );
  assert.equal(
    catalog.products.filter((product: { category: string }) => product.category === "ai")
      .length,
    15,
  );
  assert.equal(
    catalog.products.filter(
      (product: { category: string }) => product.category === "streaming",
    ).length,
    14,
  );

  const enabled = catalog.products.filter(
    (product: { app_store?: { collector_enabled?: boolean } }) =>
      product.app_store?.collector_enabled,
  );
  assert.equal(enabled.length, 25);
  assert.deepEqual(
    catalog.products
      .filter(
        (product: { app_store?: { collector_enabled?: boolean } }) =>
          !product.app_store?.collector_enabled,
      )
      .map((product: { slug: string }) => product.slug)
      .sort(),
    ["catcosplay", "glm", "sora", "spotify"],
  );

  for (const product of enabled) {
    assert.match(product.app_store.id, /^\d+$/);
    for (const plan of product.plans) {
      assert.ok(plan.expected_usd_min > 0, `${product.slug}/${plan.slug} min`);
      assert.ok(
        plan.expected_usd_max > plan.expected_usd_min,
        `${product.slug}/${plan.slug} max`,
      );
    }
  }
});

test("required existing products are reproducible on a clean database", () => {
  assert.deepEqual(
    catalog.required_products
      .map((product: { slug: string }) => product.slug)
      .sort(),
    ["kimi", "perplexity", "suno"],
  );
  assert.match(migration, /catalog-expansion-2026-08/);
  const suno = catalog.required_products.find(
    (product: { slug: string }) => product.slug === "suno",
  );
  assert.deepEqual(
    suno.plans.map((plan: { slug: string }) => plan.slug),
    ["basic", "pro", "premier-plan"],
  );
  assert.match(sunoNormalization, /status = 'archived'::publish_status/);
  assert.doesNotMatch(sunoNormalization, /DELETE FROM/);
  assert.match(copilotNormalization, /Microsoft 365 Personal/);
  assert.match(copilotNormalization, /status = 'archived'::publish_status/);
  assert.doesNotMatch(copilotNormalization, /DELETE FROM/);
});

test("catalog migration is review-first, idempotent and staggered", () => {
  assert.match(migration, /'review'::publish_status/);
  assert.doesNotMatch(migration, /'published'::publish_status/);
  assert.match(migration, /ON CONFLICT \(slug\) DO UPDATE/);
  assert.match(migration, /'daily_light'/);
  assert.match(migration, /'weekly_full'/);
  assert.match(migration, /make_interval\(days => variant\.delay_days/);
  assert.match(migration, /catalog-expansion-2026-08/);
});

test("collector reads expansion specs and preserves billing and country scope", () => {
  assert.match(collector, /catalog-expansion-2026-08\.json/);
  assert.match(collector, /required_products/);
  assert.match(collector, /Test-ProductSpecCountryScope/);
  assert.match(collector, /match_product_name/);
  assert.equal(bySlug.get("x-premium")?.match_product_name, "X");
  assert.match(collector, /Test-PlanAllowsIgnoredRecurringItem/);
  assert.equal(
    bySlug.get("heygen")?.plans.find((plan: { slug: string }) => plan.slug === "pro-1000")
      ?.allow_recurring_consumable_terms,
    true,
  );
  assert.match(collector, /billing_cycle = .*::billing_cycle/);
  assert.match(collector, /Ignoring unmatched App Store item for known product spec/);
});
