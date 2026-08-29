import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readProjectFile(path: string) {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

test("data-quality query reads App Store, official Web, and source-profile state", () => {
  const query = readProjectFile("app/admin/data-quality/queries.ts");

  assert.match(query, /AS app_store_job_count/);
  assert.match(query, /AS active_app_store_job_count/);
  assert.match(query, /AS official_web_job_count/);
  assert.match(query, /AS pending_web_observation_count/);
  assert.match(query, /AS pending_web_country_count/);
  assert.match(query, /FROM product_source_profiles profile/);
  assert.match(query, /source_integration_status/);
});

test("data-quality rows use source-aware copy and hide unsupported manual collection", () => {
  const model = readProjectFile("app/admin/data-quality/model.ts");
  const overview = readProjectFile(
    "app/admin/data-quality/DataQualityOverview.tsx",
  );
  const page = readProjectFile("app/admin/data-quality/page.tsx");

  assert.match(model, /label: "Web 样本待审"/);
  assert.match(model, /label: "等待官网采集器"/);
  assert.match(model, /label: "一次性商品"/);
  assert.match(model, /supportsManualCollection: false/);
  assert.match(overview, /collection\.taskSummary/);
  assert.match(overview, /collection\.supportsManualCollection \? \(/);
  assert.doesNotMatch(overview, /App Store 任务 \{row\.active_app_store_job_count\}/);
  assert.match(page, /getProductCollectionState\(row\)/);
  assert.match(page, /collectionState === "app_store_active"/);
});
