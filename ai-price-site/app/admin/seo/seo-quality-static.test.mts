import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readSqlMigration } from "../../../test-utils/sql-migrations.mts";

const testDir = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(testDir, "page.tsx"), "utf8");
const qualityData = readFileSync(
  resolve(testDir, "../../../lib/product-seo-quality-data.ts"),
  "utf8",
);
const productSeoMigration = readSqlMigration("sql/073_product_seo_content_quality.sql");
const observationPanel = readFileSync(
  resolve(testDir, "SeoObservationPanel.tsx"),
  "utf8",
);
const observationActions = readFileSync(resolve(testDir, "actions.ts"), "utf8");
const priorityPanel = readFileSync(
  resolve(testDir, "SeoSearchPriorityPanel.tsx"),
  "utf8",
);
const conversionPanel = readFileSync(
  resolve(testDir, "SeoTrafficConversionPanel.tsx"),
  "utf8",
);
const promotionPanel = readFileSync(
  resolve(testDir, "PlanSitemapPromotionPanel.tsx"),
  "utf8",
);
const pageObservationPanel = readFileSync(
  new URL("./SeoPageObservationImportPanel.tsx", import.meta.url),
  "utf8",
);
const pageObservationImport = readFileSync(
  new URL("../../../lib/seo-search-observation-import.ts", import.meta.url),
  "utf8",
);
const promotionState = readFileSync(
  resolve(testDir, "../../../lib/seo-plan-promotion-state.ts"),
  "utf8",
);
const sitemap = readFileSync(resolve(testDir, "../../sitemap.ts"), "utf8");

test("admin SEO page scores real product data and visible decision content", () => {
  assert.match(page, /getCachedProductSeoQualityAudits/);
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
  assert.match(qualityData, /requiredProductSeoLocales/);
  assert.match(qualityData, /completeSeoLocaleCount/);
  assert.match(page, /getCachedProductSeoQualityAudits\(\)/);
  assert.match(page, /基础 SEO/);
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
  assert.match(page, /当前主动推广/);
  assert.match(page, /等待下一批/);
  assert.match(page, /搜索推广/);
  assert.match(page, /promotionSummary\.promotedPlanPages/);
  assert.match(page, /getProductPlanSitemapPromotion/);
  assert.match(page, /buildPlanSitemapPromotionRecommendations/);
  assert.match(page, /getPipelineGrowthSignals/);
  assert.match(page, /seoSitemapBudgets\.productPlanPages/);
  assert.match(promotionPanel, /下一批套餐推广建议/);
  assert.match(promotionPanel, /不会自动修改 sitemap/);
  assert.match(promotionPanel, /产品与套餐页预算/);
  assert.match(promotionPanel, /推广信号/);
  assert.match(promotionPanel, /确认调整/);
  assert.match(promotionPanel, /撤销上一次调整/);
  assert.match(promotionPanel, /AdminSelect/);
  assert.match(observationActions, /applyPlanSitemapPromotionAction/);
  assert.match(observationActions, /rollbackPlanSitemapPromotionAction/);
  assert.match(observationActions, /requireAdmin\(\)/);
  assert.match(observationActions, /seoSitemapBudgets\.productPlanPages/);
  assert.match(observationActions, /prisma\.\$transaction/);
  assert.match(promotionState, /previousActiveSlugs/);
  assert.match(promotionState, /SEO_PLAN_PROMOTION_HISTORY_LIMIT/);
  assert.match(sitemap, /getEffectivePlanSitemapProductSlugs/);
  assert.doesNotMatch(page, /执行后预计提交/);
  assert.match(page, /历史续订层/);
  assert.match(page, /currentPlanCount/);
  assert.doesNotMatch(page, /V1|MVP|内部规则代码/);
});

test("remaining published-product SEO gaps are filled and deduplicated", () => {
  assert.match(productSeoMigration, /uniq_seo_meta_product_plan_locale/);
  assert.match(productSeoMigration, /'chatgpt'/);
  assert.match(productSeoMigration, /'perplexity'/);
  assert.match(productSeoMigration, /'suno'/);
  assert.match(productSeoMigration, /Perplexity Pro 与 Max/);
  assert.match(productSeoMigration, /Suno Pro 与 Premier/);
  assert.match(productSeoMigration, /published_product_defaults/);
  assert.match(productSeoMigration, /CROSS JOIN \(VALUES \('zh'\), \('en'\)\)/);
  assert.match(productSeoMigration, /ensure_published_product_seo_metadata/);
  assert.match(productSeoMigration, /trg_products_ensure_published_seo/);
  assert.match(productSeoMigration, /product\.status = 'published'/);
});

test("admin SEO page keeps bounded read-only Google and Bing observation baselines", () => {
  assert.match(page, /SeoObservationPanel/);
  assert.match(page, /SEO_OBSERVATION_SETTING_KEY/);
  assert.match(page, /SEO_BING_OBSERVATION_SETTING_KEY/);
  assert.match(observationPanel, /双搜索引擎观察基线/);
  assert.match(observationPanel, /不会连接搜索平台、提交网址或触发验证/);
  assert.match(observationPanel, /最多保留最近 24 次/);
  assert.match(observationPanel, /保存 Google 快照/);
  assert.match(observationPanel, /保存 Bing 快照/);
  assert.match(observationActions, /requireAdmin\(\)/);
  assert.match(observationActions, /save_seo_observation_snapshot/);
  assert.match(observationActions, /save_bing_observation_snapshot/);
  assert.match(observationActions, /prisma\.\$transaction/);
  assert.match(observationActions, /baselineError=invalid/);
  assert.match(observationActions, /bingError=invalid/);
});

test("admin SEO page imports audited page-level Google and Bing observations", () => {
  assert.match(page, /SEO_SEARCH_PAGE_IMPORT_SETTING_KEY/);
  assert.match(page, /effectiveSearchObservations/);
  assert.match(page, /SeoPageObservationImportPanel/);
  assert.match(pageObservationPanel, /页面级搜索信号/);
  assert.match(pageObservationPanel, /导入新的完整页面报表/);
  assert.match(pageObservationPanel, /撤销最近导入/);
  assert.match(pageObservationPanel, /不与旧周期相加/);
  assert.match(observationActions, /importSeoSearchPageObservationsAction/);
  assert.match(observationActions, /rollbackSeoSearchPageObservationsAction/);
  assert.match(observationActions, /import_seo_search_page_observations/);
  assert.match(observationActions, /rollback_seo_search_page_observations/);
  assert.match(pageObservationImport, /SEO_SEARCH_PAGE_IMPORT_ROW_LIMIT = 500/);
  assert.match(pageObservationImport, /hostname !== "geosub\.org"/);
  assert.match(pageObservationImport, /getEffectiveSeoSearchPageObservations/);
});

test("admin SEO page exposes a dated cross-engine page priority queue", () => {
  assert.match(page, /SeoSearchPriorityPanel/);
  assert.match(page, /buildSeoSearchPagePriorities/);
  assert.match(priorityPanel, /双引擎页面优先级/);
  assert.match(priorityPanel, /手工核验快照，非实时 API/);
  assert.match(priorityPanel, /旧地址曝光/);
});

test("admin SEO page separates webmaster observations from on-site search conversion", () => {
  assert.match(page, /getSeoTrafficConversionOverview/);
  assert.match(page, /<SeoTrafficConversionPanel overview=\{trafficConversion\}/);
  assert.match(conversionPanel, /搜索落地后的用户动作/);
  assert.match(conversionPanel, /不与站内搜索漏斗混算/);
  assert.match(conversionPanel, /进入价格内容/);
  assert.match(conversionPanel, /访问官网/);
  assert.match(conversionPanel, /完成关键路径/);
  assert.match(conversionPanel, /站长平台口径/);
  assert.match(conversionPanel, /站内转化口径/);
  assert.match(conversionPanel, /判断趋势，不要求数字完全相等/);
});
