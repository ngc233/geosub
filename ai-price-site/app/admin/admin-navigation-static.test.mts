import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const adminDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(adminDir, "../..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

function readAdminDashboardSource() {
  return [
    "app/admin/page.tsx",
    "app/admin/queries.ts",
    "app/admin/DashboardComponents.tsx",
    "app/admin/TrendChart.tsx",
    "app/admin/dashboard-formatters.ts",
  ]
    .map(readProjectFile)
    .join("\n");
}

function readSearchDemandSource() {
  return [
    "app/admin/search-demand/page.tsx",
    "app/admin/search-demand/queries.ts",
    "app/admin/search-demand/presenters.ts",
    "app/admin/search-demand/AuthorityCoverageSection.tsx",
    "app/admin/search-demand/ConversionRepairSections.tsx",
    "app/admin/search-demand/SearchConversionSections.tsx",
    "app/admin/search-demand/SearchEvidenceSections.tsx",
    "app/admin/search-demand/SearchGrowthPrioritySection.tsx",
    "app/admin/search-demand/SearchOpportunityWorkflowSections.tsx",
  ]
    .map(readProjectFile)
    .join("\n");
}

function readDataQualitySource() {
  return [
    "app/admin/data-quality/page.tsx",
    "app/admin/data-quality/queries.ts",
    "app/admin/data-quality/model.ts",
    "app/admin/data-quality/DataQualityOverview.tsx",
  ]
    .map(readProjectFile)
    .join("\n");
}

function readCollectorJobsSource() {
  return [
    "app/admin/collector-jobs/page.tsx",
    "app/admin/collector-jobs/queries.ts",
    "app/admin/collector-jobs/model.ts",
    "app/admin/collector-jobs/CollectorJobsView.tsx",
  ]
    .map(readProjectFile)
    .join("\n");
}

function readDataQualityDetailSource() {
  return [
    "app/admin/data-quality/[slug]/page.tsx",
    "app/admin/data-quality/[slug]/queries.ts",
    "app/admin/data-quality/[slug]/model.ts",
    "app/admin/data-quality/[slug]/ProductDataQualityView.tsx",
  ]
    .map(readProjectFile)
    .join("\n");
}

function readRepoFile(fileName: string) {
  return readFileSync(resolve(projectRoot, "..", fileName), "utf8");
}

test("admin sidebar exposes only operational modules", () => {
  const source = readProjectFile("components/admin/AdminSidebar.tsx");

  for (const href of [
    "/admin/system",
    "/admin/settings",
    "/admin/events",
    "/admin/pipeline",
    "/admin/data-quality",
    "/admin/prices",
    "/admin/affordability",
    "/admin/products",
    "/admin/plans",
    "/admin/articles",
    "/admin/seo",
    "/admin/navigation",
  ]) {
    assert.match(source, new RegExp(href.replaceAll("/", "\\/")));
  }

  assert.doesNotMatch(source, /\/admin\/commercial/);
  assert.doesNotMatch(source, /\/admin\/pricing-preview/);
  assert.doesNotMatch(source, /\/admin\/affordability-preview/);
  assert.doesNotMatch(source, /href: "\/admin\/review"/);
  assert.doesNotMatch(source, /href: "\/admin\/discovery"/);
  assert.match(source, /label: "今日工作"/);
  assert.match(source, /label: "数据生产"/);
  assert.match(source, /label: "数据资产"/);
  assert.match(source, /label: "产品流水线"/);
});

test("product pipeline is the single lifecycle entry while specialist pages remain reachable", () => {
  const sidebar = readProjectFile("components/admin/AdminSidebar.tsx");
  const steps = readProjectFile("components/admin/AdminPipelineSteps.tsx");
  const pipeline = readProjectFile("app/admin/pipeline/page.tsx");
  const growth = readProjectFile("lib/admin-pipeline-growth.ts");

  assert.match(sidebar, /label: "产品流水线", href: "\/admin\/pipeline"/);
  assert.match(sidebar, /"\/admin\/collector-jobs"/);
  assert.doesNotMatch(sidebar, /href: "\/admin\/review"/);
  assert.doesNotMatch(sidebar, /href: "\/admin\/discovery"/);
  assert.match(steps, /href: "\/admin\/discovery"/);
  assert.match(steps, /href: "\/admin\/review"/);

  assert.match(pipeline, /label: "需要介入"/);
  assert.match(pipeline, /label: "系统处理中"/);
  assert.match(pipeline, /label: "未开始"/);
  assert.match(pipeline, /label: "已发布"/);
  assert.match(pipeline, /最接近发布/);
  assert.match(pipeline, /沉睡库存/);
  assert.match(pipeline, /getPublishReadiness/);
  assert.match(pipeline, /getPipelineGrowthSignals\(\)\.catch/);
  assert.match(growth, /pipeline:growth-signals:30/);
  assert.match(growth, /getSearchDemandSummary\(30\)/);
  assert.match(growth, /getCachedProductSeoQualityAudits/);
});
test("admin navigation remains usable on mobile", () => {
  const source = readProjectFile("components/admin/AdminSidebar.tsx");
  const layout = readProjectFile("app/admin/layout.tsx");

  assert.match(source, /当前版本/);
  assert.match(source, /v\{version\}/);
  assert.match(layout, /import packageJson from "\.\.\/\.\.\/package\.json"/);
  assert.match(layout, /version=\{packageJson\.version\}/);

  assert.match(source, /aria-label="打开后台导航"/);
  assert.match(source, /aria-label="关闭后台导航"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /className="fixed inset-0 z-50 lg:hidden"/);
  assert.match(source, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(layout, /flex-col lg:flex-row/);
});

test("admin dashboard does not link to placeholder modules", () => {
  const source = readAdminDashboardSource();

  assert.doesNotMatch(source, /\/admin\/commercial/);
  assert.doesNotMatch(source, /商业设置/);
  assert.match(source, /\/admin\/products/);
  assert.match(source, /\/admin\/review/);
  assert.match(source, /\/admin\/seo/);
  assert.match(source, /\/admin\/events/);
  assert.match(source, /title="今天需要处理什么"/);
  assert.match(source, /id="admin-tasks-title"/);
  assert.match(source, /href="\/admin\/pipeline"/);
  assert.match(source, /待审核数据/);
  assert.match(source, /过期价格/);
});

test("admin dashboard provides a product-level daily operations summary", () => {
  const dashboard = readAdminDashboardSource();
  const operations = readProjectFile("lib/admin-daily-operations.ts");

  assert.match(dashboard, /getDailyOperationsSummary/);
  assert.match(dashboard, /今日产品摘要/);
  assert.match(dashboard, /今天为什么要关注/);
  assert.match(dashboard, /系统进度/);
  assert.match(dashboard, /任务后的效果/);
  assert.match(dashboard, /运行中或已排队的产品无需重复操作/);
  assert.match(dashboard, /buildDailyOperationsBrief/);
  assert.match(dashboard, /dailyBrief\.counts\.failed/);
  assert.match(dashboard, /待处理 \{dailyBrief\.counts\.action\}/);

  assert.match(operations, /latest_run_failed/);
  assert.match(operations, /run_running/);
  assert.match(operations, /queue_pending/);
  assert.match(operations, /scheduled_due/);
  assert.match(operations, /latest_product_run AS/);
  assert.match(operations, /priority >= 100/);
  assert.match(operations, /updated_at > latest_run_started_at/);
  assert.match(operations, /buildAuthorityCoverageQueue\(audits, \[\]\)/);
  assert.match(operations, /getAuthorityCoverageTaskRecords\(audits\)/);
});

test("admin dashboard keeps today live but excludes it from completed-day trends", () => {
  const dashboard = readAdminDashboardSource();
  const packageJson = readProjectFile("package.json");
  const upgrade = readRepoFile("geosub-backend/deploy/linux-arm64/upgrade.sh");
  const postDeploy = readRepoFile(
    "geosub-backend/deploy/linux-arm64/post-deploy-check.sh",
  );

  assert.match(dashboard, /function getTodayStartUtc/);
  assert.match(dashboard, /function getYesterdayUtc/);
  assert.match(dashboard, /DASHBOARD_INTERACTION_EVENT_KEYS/);
  assert.match(dashboard, /open_share_modal/);
  assert.match(dashboard, /今天的实时数据单独显示在上方卡片中/);
  assert.match(dashboard, /todayPageViews/);
  assert.match(dashboard, /todayClickEvents/);
  assert.doesNotMatch(dashboard, /includesToday/);
  assert.doesNotMatch(dashboard, /prisma\.adSlot\.count/);
  assert.doesNotMatch(dashboard, /prisma\.siteSetting\.count/);

  assert.match(packageJson, /aggregate:daily-stats:recent/);
  assert.match(
    readProjectFile("scripts/aggregate-daily-stats.cjs"),
    /share_to_social/,
  );
  assert.match(upgrade, /geosub-analytics-aggregation\.timer/);
  assert.match(postDeploy, /geosub-analytics-aggregation\.timer/);
});

test("admin dashboard renders non-zero trend totals as visible svg lines", () => {
  const dashboard = readAdminDashboardSource();

  assert.match(dashboard, /const hasVisibleData =/);
  assert.match(dashboard, /const getPoints =/);
  assert.match(dashboard, /points=\{getPoints\(trend, "pageViews"\)\}/);
  assert.match(dashboard, /points=\{getPoints\(trend, "clicks"\)\}/);
  assert.match(dashboard, /所选时段还没有正式访问或点击数据/);
  assert.doesNotMatch(dashboard, /style=\{\{ height: `\$\{pageHeight\}%` \}\}/);
});

test("admin dashboard trend cards control series and can compare or export", () => {
  const dashboard = readAdminDashboardSource();

  assert.match(dashboard, /checked=\{showPageViews\}/);
  assert.match(dashboard, /checked=\{showClicks\}/);
  assert.match(dashboard, /checked=\{compare\}/);
  assert.match(dashboard, /strokeDasharray="10 8"/);
  assert.match(dashboard, /buildTrendCsv/);
  assert.match(dashboard, /导出 CSV/);
  assert.match(dashboard, /虚线为上一周期/);
});

test("admin dashboard uses consolidated summaries and real service heat", () => {
  const dashboard = readAdminDashboardSource();

  assert.match(dashboard, /DashboardSummaryRow/);
  assert.match(dashboard, /ServiceHeatRow/);
  assert.match(dashboard, /heat_score/);
  assert.match(dashboard, /服务热度排行/);
  assert.match(dashboard, /一次互动按 3 分计入热度/);
  assert.doesNotMatch(dashboard, /服务资产覆盖排行/);
  assert.doesNotMatch(dashboard, /prisma\.product\.count/);
  assert.doesNotMatch(dashboard, /prisma\.regionPrice\.count/);
});

test("admin dashboard supports bounded custom date ranges", () => {
  const dashboard = readAdminDashboardSource();

  assert.match(dashboard, /function getDashboardPeriod/);
  assert.match(dashboard, /days < 1 \|\| days > 730 \|\| to >= today/);
  assert.match(dashboard, /name="from"/);
  assert.match(dashboard, /name="to"/);
  assert.match(dashboard, /type="text"/);
  assert.match(dashboard, /placeholder="YYYY-MM-DD"/);
  assert.match(dashboard, /结束日期不能晚于昨天/);
  assert.match(dashboard, /所选时段暂无可归属到产品的正式访问或互动/);
});

test("admin runtime reports slow dashboard workloads without logging payloads", () => {
  const dashboard = readAdminDashboardSource();
  const layout = readProjectFile("app/admin/layout.tsx");
  const review = readProjectFile("app/admin/review/queries.ts");
  const dataQuality = readDataQualitySource();
  const dataQualityDetail = readDataQualityDetailSource();
  const collectorJobs = readCollectorJobsSource();
  const searchDemand = readSearchDemandSource();
  const system = readProjectFile("app/admin/system/page.tsx");
  const performance = readProjectFile("lib/admin-performance.ts");

  assert.match(layout, /measureAdminWorkload\("admin\.auth"/);
  assert.match(dashboard, /measureAdminWorkload\("dashboard\.analytics"/);
  assert.match(
    dashboard,
    /measureAdminWorkload\("dashboard\.daily-operations"/,
  );
  assert.match(review, /measureAdminWorkload\("review\.page-data"/);
  assert.match(review, /measureAdminWorkload\("review\.pending-data"/);
  assert.match(review, /measureAdminWorkload\("review\.history-data"/);
  assert.match(review, /const detailRowsPerProduct = productQuery \? 120 : 6/);
  assert.match(review, /FROM price_observation_evidence_view evidence/);
  assert.match(review, /evidence\.published_comparison NOT IN/);
  assert.doesNotMatch(
    review,
    /FROM pending_price_observations_view pending[\s\S]{0,1600}LEFT JOIN price_observation_evidence_view evidence/,
  );
  assert.match(dataQuality, /measureAdminWorkload\(\s*"data-quality\.page-data"/);
  assert.match(dataQuality, /observation_reason_state AS/);
  assert.match(dataQualityDetail, /measureAdminWorkload\(\s*"data-quality-detail\.page-data"/);
  assert.match(collectorJobs, /measureAdminWorkload\(\s*"collector-jobs\.page-data"/);
  assert.match(searchDemand, /measureAdminWorkload\("search-demand\.summary"/);
  assert.match(searchDemand, /measureAdminWorkload\(\s*"search-demand\.supporting-data"/);
  assert.match(system, /measureAdminWorkload\("system\.health"/);
  assert.match(performance, /GEOSUB_ADMIN_SLOW_WORKLOAD_MS/);
  assert.match(performance, /GEOSUB_ADMIN_PERFORMANCE_LOG/);
  assert.match(performance, /durationMs/);
  assert.doesNotMatch(performance, /DATABASE_URL|queryText|queryParams|sqlText/);
});

test("admin read pages do not reconcile collector runs during navigation", () => {
  const readPages = [
    "app/admin/review/queries.ts",
    "app/admin/data-quality/queries.ts",
    "app/admin/data-quality/[slug]/queries.ts",
    "app/admin/collector-jobs/queries.ts",
  ];

  for (const fileName of readPages) {
    assert.doesNotMatch(
      readProjectFile(fileName),
      /reconcileStaleCollectorRuns/,
      `${fileName} should stay read-only during page navigation`,
    );
  }

  const runner = readRepoFile("geosub-backend/scripts/run-collector-jobs.ps1");
  assert.match(runner, /if \(!\$DryRun\) \{[\s\S]*?reconcile_stale_collector_runs\(3, 20, 3\)/);
  assert.ok(
    runner.indexOf("reconcile_stale_collector_runs(3, 20, 3)") <
      runner.indexOf("$jobs = @(Get-DueJobs)"),
  );
});

test("heavy admin query waves leave database capacity for navigation", () => {
  const review = readProjectFile("app/admin/review/queries.ts");
  const searchDemand = readSearchDemandSource();
  const searchReadModel = readProjectFile("lib/admin-search-demand.ts");
  const dashboard = readAdminDashboardSource();
  const dataQuality = readDataQualitySource();
  const seoQuality = readProjectFile("lib/product-seo-quality-data.ts");

  assert.match(review, /"review\.pending-data"[\s\S]*?Promise\.all\(\[/);
  assert.match(review, /"review\.history-data"[\s\S]*?Promise\.all\(\[/);
  assert.match(review, /const getHistoryStatsRows = \(\) =>/);
  assert.match(review, /const getAutoReviewReasonRows = \(\) =>/);
  assert.match(searchDemand, /const summaryPromise = measureAdminWorkload/);
  assert.match(searchDemand, /const workflowRecordsPromise = getSearchOpportunityRecords\(\)/);
  assert.match(searchDemand, /const aliasRecordsPromise = getSearchAliasRecords\(\)/);
  assert.match(searchDemand, /const summary = await summaryPromise/);
  assert.match(searchReadModel, /WITH search_events AS MATERIALIZED/);
  assert.equal(
    (searchReadModel.match(/prisma\.\$queryRaw</g) || []).length,
    2,
    "search demand should use one shared aggregate query and one conversion query",
  );
  assert.match(searchReadModel, /search-demand:summary:/);
  assert.match(dashboard, /dashboard:analytics:/);
  assert.match(dashboard, /dashboard:daily-operations/);
  assert.match(dataQuality, /data-quality:product-summary/);
  assert.match(seoQuality, /product-seo-quality:/);
});

test("database runtime keeps the web pool bounded and audits indexes read-only", () => {
  const prisma = readProjectFile("lib/prisma.ts");
  const audit = readProjectFile("scripts/audit-database-indexes.cjs");
  const explain = readProjectFile("scripts/explain-read-only-query.cjs");
  const performanceSummary = readProjectFile(
    "scripts/summarize-admin-performance.cjs",
  );
  const packageJson = readProjectFile("package.json");
  const deploymentEnvironment = readRepoFile(
    "geosub-backend/deploy/linux-arm64/env.example",
  );
  const cleanupPlan = readRepoFile(
    "geosub-backend/deploy/linux-arm64/duplicate-index-cleanup-plan.md",
  );

  assert.match(prisma, /GEOSUB_DB_POOL_MAX/);
  assert.match(prisma, /GEOSUB_DB_CONNECTION_TIMEOUT_MS/);
  assert.match(prisma, /GEOSUB_DB_IDLE_TIMEOUT_MS/);
  assert.match(prisma, /maximum: 30/);
  assert.match(prisma, /globalForPrisma\.prisma \?\? createPrismaClient\(\)/);
  assert.match(deploymentEnvironment, /GEOSUB_DB_POOL_MAX=10/);
  assert.match(deploymentEnvironment, /GEOSUB_ADMIN_SLOW_WORKLOAD_MS=750/);
  assert.match(deploymentEnvironment, /GEOSUB_ADMIN_READ_MODEL_TTL_MS=10000/);

  assert.match(packageJson, /"audit:indexes"/);
  assert.match(packageJson, /"profile:admin-logs"/);
  assert.match(packageJson, /"explain:query"/);
  assert.match(packageJson, /"test:performance-tools"/);
  assert.match(audit, /GeoSub database index audit \(read-only\)/);
  assert.match(audit, /FROM pg_index/);
  assert.match(audit, /structure_signature/);
  assert.doesNotMatch(audit, /DROP\s+INDEX|CREATE\s+INDEX|ALTER\s+TABLE/i);
  assert.match(cleanupPlan, /DROP INDEX CONCURRENTLY IF EXISTS/);
  assert.match(cleanupPlan, /Do not add the drop statements/);
  assert.match(explain, /BEGIN TRANSACTION READ ONLY/);
  assert.match(explain, /statement_timeout/);
  assert.match(explain, /Only SELECT or WITH queries can be explained/);
  assert.match(explain, /ROLLBACK/);
  assert.doesNotMatch(explain, /client\.query\(["'`]\s*(INSERT|UPDATE|DELETE|DROP)/i);
  assert.match(performanceSummary, /\[admin-performance\]/);
  assert.match(performanceSummary, /p95Ms/);
  assert.doesNotMatch(performanceSummary, /DATABASE_URL|queryText|queryParams|sqlText/);
});

test("admin dashboard attributes commercial clicks and links to event logs", () => {
  const dashboard = readAdminDashboardSource();

  assert.match(dashboard, /CommercialAttributionRow/);
  assert.match(dashboard, /商业化归因/);
  assert.match(dashboard, /click_affiliate/);
  assert.match(dashboard, /click_official/);
  assert.match(dashboard, /click_ad/);
  assert.match(dashboard, /\/admin\/events\?type=commercial/);
  assert.match(dashboard, /actionHref="\/admin\/events"/);
});

test("admin dashboard sessionizes events and computes a chronological funnel", () => {
  const dashboard = readAdminDashboardSource();
  const provider = readProjectFile(
    "components/analytics/AnalyticsProvider.tsx",
  );
  const session = readProjectFile("lib/client-analytics-session.ts");
  const schema = readProjectFile("prisma/schema.prisma");
  const migration = readProjectFile(
    "prisma/migrations/20260717160000_event_session_analytics_indexes/migration.sql",
  );

  assert.match(session, /geosub_session_id/);
  assert.match(session, /SESSION_TIMEOUT_MS = 30 \* 60 \* 1000/);
  assert.match(session, /window\.sessionStorage\.setItem/);
  assert.match(provider, /sessionId: payload\.sessionId \|\| getAnalyticsSessionId\(\)/);

  assert.match(dashboard, /FunnelQualityRow/);
  assert.match(dashboard, /anonymous_event_gaps/);
  assert.match(dashboard, /INTERVAL '30 minutes'/);
  assert.match(dashboard, /detail_events AS MATERIALIZED/);
  assert.match(dashboard, /plan_events AS MATERIALIZED/);
  assert.match(dashboard, /commercial_events AS MATERIALIZED/);
  assert.match(dashboard, /JOIN detail_events event/);
  assert.match(dashboard, /JOIN plan_events event/);
  assert.match(dashboard, /JOIN commercial_events event/);
  assert.match(dashboard, /event\.created_at >= list\.list_at/);
  assert.match(dashboard, /event\.created_at >= detail\.detail_at/);
  assert.match(dashboard, /event\.created_at >= plan\.plan_at/);
  assert.match(dashboard, /high_frequency_visitor_days/);
  assert.match(dashboard, /HAVING COUNT\(\*\) >= 100/);
  assert.match(dashboard, /严格会话转化漏斗/);
  assert.match(dashboard, /流量质量监控/);
  assert.match(dashboard, /直接进入详情页不会计入列表起始漏斗/);
  assert.match(dashboard, /会话 ID 缺失事件/);
  assert.match(dashboard, /404 页面访问/);
  assert.match(dashboard, /device_segments/);
  assert.match(dashboard, /source_segments/);
  assert.match(dashboard, /product_segments/);
  assert.match(dashboard, /漏斗切片/);
  assert.match(dashboard, /按产品/);
  assert.match(dashboard, /按设备/);
  assert.match(dashboard, /按来源/);
  assert.match(dashboard, /quality=missing-session/);
  assert.match(dashboard, /quality=not-found/);
  assert.match(dashboard, /quality=automated/);
  assert.match(schema, /@@index\(\[sessionId, createdAt\]\)/);
  assert.match(schema, /@@index\(\[anonymousId, createdAt\]\)/);
  assert.match(migration, /event_logs_session_id_created_at_idx/);
  assert.match(migration, /event_logs_anonymous_id_created_at_idx/);
});

test("admin quality and review summaries materialize repeated aggregates", () => {
  const qualityQueries = readProjectFile("app/admin/data-quality/queries.ts");
  const reviewQueries = readProjectFile("app/admin/review/queries.ts");

  assert.match(qualityQueries, /published_plan_stats AS MATERIALIZED/);
  assert.match(reviewQueries, /JOIN price_observations history ON history\.product_id = page\.product_id/);
  assert.match(reviewQueries, /selected_history AS MATERIALIZED/);
  assert.match(reviewQueries, /observation\.updated_at DESC, observation\.id DESC/);
  assert.match(reviewQueries, /FROM price_observations\s+WHERE status <> 'pending'/);
  assert.doesNotMatch(
    reviewQueries,
    /FROM price_observations_review_history_view history\s+JOIN product_page/,
  );
});

test("major admin data pages report slow workloads", () => {
  const sources = [
    "app/admin/pipeline/page.tsx",
    "app/admin/products/page.tsx",
    "app/admin/prices/page.tsx",
    "app/admin/discovery/page.tsx",
    "app/admin/affordability/page.tsx",
    "app/admin/events/page.tsx",
  ].map(readProjectFile).join("\n");

  assert.match(sources, /pipeline\.page-data/);
  assert.match(sources, /products\.page-data/);
  assert.match(sources, /prices\.page-data/);
  assert.match(sources, /discovery\.page-data/);
  assert.match(sources, /affordability\.page-data/);
  assert.match(sources, /events\.page-data/);
});

test("all admin asset views share one four-level operational status model", () => {
  const sharedStatus = readProjectFile("lib/admin-operational-status.ts");
  const badge = readProjectFile("components/admin/AdminStatusBadge.tsx");
  const productPage = readProjectFile("app/admin/products/page.tsx");
  const planPage = readProjectFile("app/admin/plans/page.tsx");
  const pricePage = readProjectFile("app/admin/prices/page.tsx");
  const pipelinePage = readProjectFile("app/admin/pipeline/page.tsx");
  const qualityModel = readProjectFile("app/admin/data-quality/model.ts");
  const qualityOverview = readProjectFile("app/admin/data-quality/DataQualityOverview.tsx");

  for (const label of ["未开始", "待处理", "异常", "已发布"]) {
    assert.match(sharedStatus, new RegExp(label));
  }

  assert.match(sharedStatus, /assessProductOperationalStatus/);
  assert.match(sharedStatus, /assessPlanOperationalStatus/);
  assert.match(sharedStatus, /assessPriceOperationalStatus/);
  assert.match(sharedStatus, /countAdminOperationalAssessments/);
  assert.match(sharedStatus, /getAdminOperationalTotal/);
  assert.match(sharedStatus, /isArchivedPublishStatus/);
  assert.match(sharedStatus, /normalizedQuality === "STALE"/);
  assert.match(badge, /adminOperationalStatusMeta\[status\]/);
  assert.match(productPage, /<AdminStatusBadge/);
  assert.match(productPage, /assessProductOperationalStatus/);
  assert.match(planPage, /<AdminStatusBadge/);
  assert.match(planPage, /assessPlanOperationalStatus/);
  assert.match(pricePage, /assessPriceOperationalStatus/);
  assert.match(pricePage, /qualityLabel\(normalizeStatus\(price\.data_quality\)\)/);
  assert.match(pipelinePage, /assessProductOperationalStatus/);
  assert.match(qualityModel, /assessProductOperationalStatus/);
  assert.match(qualityModel, /pendingWorkCount: row\.pending_app_store_count/);
  assert.match(qualityModel, /blockedCount: row\.pending_anomaly_count/);
  assert.doesNotMatch(qualityModel, /pendingWorkCount:[\s\S]{0,120}missing_pair_count/);
  assert.doesNotMatch(badge, /label\?: string/);
  assert.match(qualityOverview, /AdminStatCard label="已发布"/);
  assert.doesNotMatch(qualityOverview, /operationalStatus === "published" \? "正常"/);
  assert.match(planPage, /activeTotal = getAdminOperationalTotal\(operationalCounts\)/);
  assert.match(productPage, /activeTotal = getAdminOperationalTotal\(operationalCounts\)/);
  assert.match(pricePage, /activeTotal = getAdminOperationalTotal\(operationalCounts\)/);
});
