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

function readRepoFile(fileName: string) {
  return readFileSync(resolve(projectRoot, "..", fileName), "utf8");
}

test("admin sidebar exposes only operational modules", () => {
  const source = readProjectFile("components/admin/AdminSidebar.tsx");

  for (const href of [
    "/admin/system",
    "/admin/settings",
    "/admin/events",
    "/admin/discovery",
    "/admin/data-quality",
    "/admin/review",
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
  assert.doesNotMatch(source, /href: "\/admin\/pipeline"/);
  assert.match(source, /label: "今日工作"/);
  assert.match(source, /label: "数据生产"/);
  assert.match(source, /label: "数据资产"/);
  assert.match(source, /label: "采集与审核"/);
  assert.match(source, /label: "新产品接入"/);
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
  const source = readProjectFile("app/admin/page.tsx");

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

test("admin dashboard keeps today live while historical analytics are aggregated", () => {
  const dashboard = readProjectFile("app/admin/page.tsx");
  const packageJson = readProjectFile("package.json");
  const upgrade = readRepoFile("geosub-backend/deploy/linux-arm64/upgrade.sh");
  const postDeploy = readRepoFile(
    "geosub-backend/deploy/linux-arm64/post-deploy-check.sh",
  );

  assert.match(dashboard, /function getTodayStartUtc/);
  assert.match(dashboard, /DASHBOARD_INTERACTION_EVENT_KEYS/);
  assert.match(dashboard, /open_share_modal/);
  assert.match(dashboard, /metricValue: todayPageViews/);
  assert.match(dashboard, /metricValue: todayClickEvents/);
  assert.match(dashboard, /当天数据实时读取 event_logs/);
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
  const dashboard = readProjectFile("app/admin/page.tsx");

  assert.match(dashboard, /const hasTrendData = totalPageViews > 0 \|\| totalClicks > 0/);
  assert.match(dashboard, /const pageViewPoints = trend/);
  assert.match(dashboard, /const clickPoints = trend/);
  assert.match(dashboard, /<polyline\s+points=\{pageViewPoints\}/);
  assert.match(dashboard, /<polyline\s+points=\{clickPoints\}/);
  assert.match(dashboard, /所选时段还没有正式访问或点击数据/);
  assert.doesNotMatch(dashboard, /style=\{\{ height: `\$\{pageHeight\}%` \}\}/);
});

test("admin dashboard uses consolidated summaries and real service heat", () => {
  const dashboard = readProjectFile("app/admin/page.tsx");

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
  const dashboard = readProjectFile("app/admin/page.tsx");

  assert.match(dashboard, /function getDashboardPeriod/);
  assert.match(dashboard, /days < 1 \|\| days > 730 \|\| to > today/);
  assert.match(dashboard, /name="from"/);
  assert.match(dashboard, /name="to"/);
  assert.match(dashboard, /type="date"/);
  assert.match(dashboard, /所选时段暂无可归属到产品的正式访问或互动/);
});

test("admin dashboard attributes commercial clicks and links to event logs", () => {
  const dashboard = readProjectFile("app/admin/page.tsx");

  assert.match(dashboard, /CommercialAttributionRow/);
  assert.match(dashboard, /商业化归因/);
  assert.match(dashboard, /click_affiliate/);
  assert.match(dashboard, /click_official/);
  assert.match(dashboard, /click_ad/);
  assert.match(dashboard, /\/admin\/events\?type=commercial/);
  assert.match(dashboard, /actionHref="\/admin\/events"/);
});

test("admin dashboard sessionizes events and computes a chronological funnel", () => {
  const dashboard = readProjectFile("app/admin/page.tsx");
  const provider = readProjectFile(
    "components/analytics/AnalyticsProvider.tsx",
  );
  const schema = readProjectFile("prisma/schema.prisma");
  const migration = readProjectFile(
    "prisma/migrations/20260717160000_event_session_analytics_indexes/migration.sql",
  );

  assert.match(provider, /geosub_session_id/);
  assert.match(provider, /SESSION_TIMEOUT_MS = 30 \* 60 \* 1000/);
  assert.match(provider, /window\.sessionStorage\.setItem/);
  assert.match(provider, /sessionId: payload\.sessionId \|\| getSessionId\(\)/);

  assert.match(dashboard, /FunnelQualityRow/);
  assert.match(dashboard, /anonymous_event_gaps/);
  assert.match(dashboard, /INTERVAL '30 minutes'/);
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
