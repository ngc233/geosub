import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(testDir, "page.tsx"), "utf8");
const qualityData = readFileSync(
  resolve(testDir, "../../../lib/product-seo-quality-data.ts"),
  "utf8",
);

test("admin SEO page scores real product data and visible decision content", () => {
  assert.match(page, /getProductSeoQualityAudits/);
  assert.match(qualityData, /scoreProductSeoQuality/);
  assert.match(qualityData, /billingPlatform:\s*"IOS"/);
  assert.match(qualityData, /lastCheckedAt/);
  assert.match(qualityData, /country_tax_profiles/);
  assert.match(qualityData, /missing_tax_profile_count/);
  assert.match(qualityData, /countPublishedOutliers/);
  assert.match(qualityData, /countDuplicatePlanGroups/);
  assert.match(qualityData, /getProductEditorialCoverage/);
  assert.match(qualityData, /describedPlanCount/);
  assert.match(qualityData, /getPlanEditorialIndexingStatus/);
  assert.match(qualityData, /legacyPlanCount/);
});

test("admin SEO page explains index recommendations in operator language", () => {
  assert.match(page, /页面收录质量/);
  assert.match(page, /可收录/);
  assert.match(page, /待完善/);
  assert.match(page, /建议暂缓收录/);
  assert.match(page, /优先处理/);
  assert.match(page, /搜索 \{item\.sections\.search\}\/20/);
  assert.match(page, /数据概况/);
  assert.match(page, /产品级收录门禁/);
  assert.match(page, /观察模式/);
  assert.match(page, /执行后预计提交/);
  assert.match(page, /历史续订层/);
  assert.match(page, /currentPlanCount/);
  assert.doesNotMatch(page, /V1|MVP|内部规则代码/);
});
