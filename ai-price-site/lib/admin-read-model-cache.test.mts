import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ADMIN_READ_MODEL_PREFIXES,
  invalidateAdminCatalogReadModels,
  invalidateAdminPricingReadModels,
  invalidateAdminReadModels,
  invalidateAdminSeoReadModels,
  invalidateAdminSystemReadModels,
  readAdminReadModel,
} from "./admin-read-model-cache.ts";

test.beforeEach(() => {
  invalidateAdminReadModels();
});

test("admin read models coalesce concurrent identical loads", async () => {
  let loadCount = 0;
  const loader = async () => {
    loadCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { value: 42 };
  };

  const [first, second] = await Promise.all([
    readAdminReadModel("dashboard:test", loader, 1_000),
    readAdminReadModel("dashboard:test", loader, 1_000),
  ]);

  assert.equal(loadCount, 1);
  assert.strictEqual(first, second);
});

test("admin read models keep slow in-flight loads coalesced", async () => {
  let loadCount = 0;
  const loader = async () => {
    loadCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 15));
    return loadCount;
  };

  const first = readAdminReadModel("dashboard:slow", loader, 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = readAdminReadModel("dashboard:slow", loader, 1);

  assert.deepEqual(await Promise.all([first, second]), [1, 1]);
  assert.equal(loadCount, 1);
});

test("admin read models expire and can be invalidated by prefix", async () => {
  let loadCount = 0;
  const loader = async () => ++loadCount;

  assert.equal(await readAdminReadModel("search:30", loader, 10), 1);
  assert.equal(await readAdminReadModel("search:30", loader, 10), 1);
  invalidateAdminReadModels("search:");
  assert.equal(await readAdminReadModel("search:30", loader, 10), 2);

  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(await readAdminReadModel("search:30", loader, 10), 3);
});

test("failed admin read models are never retained", async () => {
  let loadCount = 0;
  const loader = async () => {
    loadCount += 1;
    if (loadCount === 1) throw new Error("temporary database failure");
    return "recovered";
  };

  await assert.rejects(
    readAdminReadModel("data-quality:test", loader, 1_000),
    /temporary database failure/,
  );
  assert.equal(
    await readAdminReadModel("data-quality:test", loader, 1_000),
    "recovered",
  );
  assert.equal(loadCount, 2);
});

test("domain invalidators evict all seven production read-model cache prefixes", async () => {
  const sampleKeys = [
    `${ADMIN_READ_MODEL_PREFIXES.dataQuality}product-summary`,
    `${ADMIN_READ_MODEL_PREFIXES.dashboard}daily-operations`,
    `${ADMIN_READ_MODEL_PREFIXES.productSeoQuality}chatgpt:50`,
    `${ADMIN_READ_MODEL_PREFIXES.seoTrafficConversion}30`,
    `${ADMIN_READ_MODEL_PREFIXES.searchDemand}summary:30`,
    `${ADMIN_READ_MODEL_PREFIXES.pipelineGrowthSignals}30`,
    ADMIN_READ_MODEL_PREFIXES.versionsOverview,
  ];
  const counts = new Map<string, number>();
  const load = (key: string) =>
    readAdminReadModel(
      key,
      async () => {
        const next = (counts.get(key) ?? 0) + 1;
        counts.set(key, next);
        return next;
      },
      10_000,
    );

  for (const key of sampleKeys) {
    assert.equal(await load(key), 1);
    assert.equal(await load(key), 1);
  }

  invalidateAdminPricingReadModels();
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.dataQuality}product-summary`), 2);
  assert.equal(await load(ADMIN_READ_MODEL_PREFIXES.versionsOverview), 2);
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.productSeoQuality}chatgpt:50`), 2);
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.searchDemand}summary:30`), 1);

  invalidateAdminSeoReadModels();
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.searchDemand}summary:30`), 2);
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.seoTrafficConversion}30`), 2);
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.productSeoQuality}chatgpt:50`), 3);
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.pipelineGrowthSignals}30`), 2);

  invalidateAdminCatalogReadModels();
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.pipelineGrowthSignals}30`), 3);
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.dashboard}daily-operations`), 2);

  invalidateAdminSystemReadModels();
  assert.equal(await load(`${ADMIN_READ_MODEL_PREFIXES.dashboard}daily-operations`), 3);
});

test("production mutation modules wire admin read-model invalidation", () => {
  const files = [
    "./public-pricing-cache-actions.ts",
    "../app/admin/review/actions.ts",
    "../app/admin/price-observations/actions.ts",
    "../app/admin/collector-jobs/actions.ts",
    "../app/admin/articles/actions.ts",
    "../app/admin/seo/actions.ts",
    "../app/admin/search-demand/actions.ts",
    "../app/admin/settings/actions.ts",
    "../app/admin/discovery/actions.ts",
  ];

  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(
      source,
      /invalidateAdmin(?:Pricing|Catalog|Seo|System)ReadModels\(/,
      `${file} must invalidate admin read models after mutations`,
    );
  }
});
