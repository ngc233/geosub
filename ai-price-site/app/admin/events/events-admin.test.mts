import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildSearchGapQueue,
  type SearchDemandTerm,
} from "../../../lib/search-opportunity.ts";

const eventsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(eventsDir, "../../..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

test("event analytics filters production traffic with bounded dates", () => {
  const analytics = readProjectFile("lib/admin-event-analytics.ts");

  assert.match(analytics, /days < 1 \|\| days > 730 \|\| end > today/);
  assert.match(analytics, /click_affiliate/);
  assert.match(analytics, /click_official/);
  assert.match(analytics, /click_ad/);
  assert.match(analytics, /manual_test/);
  assert.match(analytics, /affiliate_test/);
  assert.match(analytics, /tracking-test/);
  assert.match(analytics, /HIGH_FREQUENCY_EVENT_THRESHOLD = 100/);
  assert.match(analytics, /AUTOMATED_USER_AGENT_MARKERS/);
  assert.match(analytics, /findHighFrequencyVisitorIds/);
  assert.match(analytics, /missing-session/);
  assert.match(analytics, /not-found/);
  assert.match(analytics, /unknown-device/);
  assert.match(analytics, /automated/);
});

test("event log page supports operational filters pagination and export", () => {
  const page = readProjectFile("app/admin/events/page.tsx");

  for (const filterName of ["from", "to", "type", "product", "device", "quality", "q"]) {
    assert.match(page, new RegExp(`name=\\"${filterName}\\"`));
  }

  assert.match(page, /PAGE_SIZE = 25/);
  assert.match(page, /上一页/);
  assert.match(page, /下一页/);
  assert.match(page, /\/admin\/events\/export/);
  assert.match(page, /distinct: \["anonymousId"\]/);
  assert.doesNotMatch(page, /where: \{ status: "PUBLISHED" \}/);
  assert.doesNotMatch(page, /userAgent: true/);
  assert.match(page, /疑似自动化/);
  assert.match(page, /缺会话/);
});

test("event CSV export is authenticated bounded and privacy conscious", () => {
  const route = readProjectFile("app/admin/events/export/route.ts");

  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /EXPORT_LIMIT = 10_000/);
  assert.match(route, /text\/csv; charset=utf-8/);
  assert.match(route, /anonymousId\?\.slice\(0, 8\)/);
  assert.doesNotMatch(route, /userAgent: true/);
  assert.match(route, /quality: url\.searchParams\.get\("quality"\)/);
  assert.match(route, /findHighFrequencyVisitorIds/);
});

test("search demand dashboard aggregates search and result-click events", () => {
  const analytics = readProjectFile("lib/admin-search-demand.ts");
  const page = readProjectFile("app/admin/search-demand/page.tsx");

  assert.match(analytics, /search_digital_service/);
  assert.match(analytics, /search_no_result/);
  assert.match(analytics, /click_search_result/);
  assert.match(analytics, /"metadata"->>'query'/);
  assert.match(analytics, /LIMIT 100/);
  assert.match(analytics, /SEARCH_DEMAND_RANGES = \[7, 30, 90\]/);
  assert.match(analytics, /unique_term_count/);
  assert.match(page, /无结果率/);
  assert.match(page, /结果点击率/);
  assert.match(page, /关键词需求/);
  assert.match(page, /点击最多的搜索结果/);
  assert.match(page, /搜索机会/);
  assert.match(page, /核验并接入/);
  assert.match(page, /创建内容草稿/);
  assert.match(page, /用户叫法建议/);
  assert.match(page, /系统不会凭空猜测别名/);
  assert.match(analytics, /buildSearchGapQueue/);
  assert.match(analytics, /classifySearchGap/);
  assert.match(analytics, /SearchAliasSuggestion/);
  assert.match(analytics, /"result_kind" IN \('product', 'plan'\)/);
  assert.match(analytics, /visitor_count/);
  assert.match(page, /可以处理/);
  assert.match(page, /继续观察/);
  assert.match(page, /暂不创建/);
});

test("search opportunities require repeat demand from multiple visitors", () => {
  const now = new Date("2026-07-30T00:00:00.000Z");
  const term = (
    overrides: Partial<SearchDemandTerm>
  ): SearchDemandTerm => ({
    query: "example service",
    locales: ["zh"],
    searchCount: 1,
    noResultCount: 1,
    clickCount: 0,
    clickRate: 0,
    visitorCount: 1,
    lastSeenAt: now,
    ...overrides,
  });

  const queue = buildSearchGapQueue([
    term({ query: "one-off", noResultCount: 1, visitorCount: 1 }),
    term({
      query: "new product",
      searchCount: 3,
      noResultCount: 3,
      visitorCount: 2,
    }),
    term({
      query: "how to cancel",
      locales: ["en"],
      searchCount: 2,
      noResultCount: 2,
      visitorCount: 2,
    }),
  ]);

  assert.equal(queue[0].status, "ready");
  assert.ok(queue[0].actionHref);
  assert.equal(queue[1].status, "validate");
  assert.match(queue[1].actionHref || "", /locale=EN/);
  assert.equal(queue[2].status, "observe");
  assert.equal(queue[2].actionHref, null);
});

test("search demand actions prefill existing growth workflows", () => {
  const discoveryPage = readProjectFile("app/admin/discovery/page.tsx");
  const discoveryForm = readProjectFile(
    "app/admin/discovery/DiscoveryIntakeForms.tsx"
  );
  const articlePage = readProjectFile("app/admin/articles/new/page.tsx");
  const articleForm = readProjectFile("app/admin/articles/ArticleForm.tsx");

  assert.match(discoveryPage, /params\.source === "search-demand"/);
  assert.match(discoveryPage, /params\.evidence/);
  assert.match(discoveryForm, /initialCandidateName/);
  assert.match(articlePage, /params\.topic/);
  assert.match(articlePage, /params\.brief/);
  assert.match(articleForm, /defaultTitle/);
  assert.match(articleForm, /defaultExcerpt/);
});

test("global search records query and destination without duplicate clicks", () => {
  const search = readProjectFile("components/GlobalSearch.tsx");

  assert.match(search, /function trackSearchResult/);
  assert.match(search, /resultTitle/);
  assert.match(search, /resultHref/);
  assert.match(search, /frontend_search_result/);
  assert.doesNotMatch(search, /data-track-event="click_search_result"/);
});

test("admin navigation exposes search demand as a growth workflow", () => {
  const sidebar = readProjectFile("components/admin/AdminSidebar.tsx");

  assert.match(sidebar, /href: "\/admin\/search-demand"/);
  assert.match(sidebar, /SearchCheck/);
});
