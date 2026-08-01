import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildSearchGrowthQueue,
  classifySearchOpportunityEffect,
  isSearchOpportunityWorkflowStatus,
  normalizeSearchOpportunityQuery,
  shouldShowSearchOpportunity,
} from "../../../lib/search-opportunity.ts";
import {
  diagnoseSearchConversionBlocker,
  type SearchConversionTargetSnapshot,
} from "../../../lib/search-conversion-diagnostics.ts";
import {
  classifySearchConversionRepairEffect,
  searchConversionRepairKey,
} from "../../../lib/search-conversion-repair.ts";
import {
  buildAuthorityCoverageQueue,
  type AuthorityProductAudit,
} from "../../../lib/search-authority-coverage.ts";
import {
  classifyAuthorityCoverageBusinessEffect,
  classifyAuthorityCoverageTaskEffect,
  type AuthorityCoverageSnapshot,
} from "../../../lib/search-authority-task.ts";

const conversionTerm = {
  query: "chatgpt plus",
  locale: "zh",
  productId: "product-1",
  planId: "plan-1",
  targetTitle: "ChatGPT Plus",
  targetHref: "/zh/ai-pricing/chatgpt/plus",
  targetKind: "plan",
  resultClickCount: 4,
  visitorCount: 3,
  planEngagementCount: 3,
  commercialConversionCount: 0,
  commercialConversionRate: 0,
  lastClickedAt: new Date("2026-07-31T00:00:00.000Z"),
};

const healthyTarget: SearchConversionTargetSnapshot = {
  productId: "product-1",
  productSlug: "chatgpt",
  productName: "ChatGPT",
  planId: "plan-1",
  planName: "ChatGPT Plus",
  planDescription: "A complete plan description that explains features and audience clearly.",
  officialUrl: "https://chatgpt.com/",
  publishedAffiliateCount: 0,
  priceCount: 39,
  countryCount: 39,
  stalePriceCount: 0,
  taxGapCount: 0,
  seoScore: 95,
  seoStatus: "indexable",
  dataQualityPath: "/admin/data-quality/chatgpt",
  editPath: "/admin/products/product-1/edit",
};

test("conversion blocker diagnostics prioritize structural blockers", () => {
  const missingTarget = diagnoseSearchConversionBlocker(conversionTerm, null);
  const missingPrices = diagnoseSearchConversionBlocker(conversionTerm, {
    ...healthyTarget,
    priceCount: 0,
    countryCount: 0,
  });
  const missingEntry = diagnoseSearchConversionBlocker(conversionTerm, {
    ...healthyTarget,
    officialUrl: null,
  });
  const stalePrices = diagnoseSearchConversionBlocker(conversionTerm, {
    ...healthyTarget,
    stalePriceCount: 25,
  });

  assert.equal(missingTarget.severity, "critical");
  assert.equal(missingTarget.blockerCode, "missing_target");
  assert.equal(missingPrices.severity, "critical");
  assert.equal(missingPrices.blockerCode, "missing_price");
  assert.equal(missingEntry.severity, "critical");
  assert.equal(missingEntry.blockerCode, "missing_entry");
  assert.equal(stalePrices.severity, "high");
  assert.equal(stalePrices.blockerCode, "stale_price");
  assert.match(missingPrices.actionHref, /data-quality/);
});

test("conversion blocker diagnostics separate content gaps from UX review", () => {
  const thinPlan = diagnoseSearchConversionBlocker(conversionTerm, {
    ...healthyTarget,
    planDescription: "Too short",
  });
  const healthy = diagnoseSearchConversionBlocker(
    conversionTerm,
    healthyTarget,
  );

  assert.equal(thinPlan.severity, "high");
  assert.equal(thinPlan.blockerCode, "thin_plan_copy");
  assert.equal(healthy.severity, "ready");
  assert.equal(healthy.blockerCode, "ux_review");
  assert.equal(healthy.actionHref, conversionTerm.targetHref);
});

test("conversion repair identity keeps products plans and blockers separate", () => {
  const base = {
    normalizedQuery: "chatgpt plus",
    locale: "zh",
    productId: "product-1",
    planId: "plan-1",
    blockerCode: "stale_price" as const,
  };
  const first = searchConversionRepairKey(base);
  assert.notEqual(first, searchConversionRepairKey({
    ...base,
    planId: "plan-2",
  }));
  assert.notEqual(first, searchConversionRepairKey({
    ...base,
    blockerCode: "thin_plan_copy",
  }));
});

test("conversion repair effect requires a new commercial click for conversion", () => {
  assert.equal(classifySearchConversionRepairEffect({
    resultClickDelta: 0,
    planEngagementDelta: 0,
    commercialConversionDelta: 0,
  }), "waiting");
  assert.equal(classifySearchConversionRepairEffect({
    resultClickDelta: 2,
    planEngagementDelta: 0,
    commercialConversionDelta: 0,
  }), "traffic_only");
  assert.equal(classifySearchConversionRepairEffect({
    resultClickDelta: 3,
    planEngagementDelta: 2,
    commercialConversionDelta: 0,
  }), "engagement_up");
  assert.equal(classifySearchConversionRepairEffect({
    resultClickDelta: 3,
    planEngagementDelta: 2,
    commercialConversionDelta: 1,
  }), "converted");
});

test("conversion repair workflow is authenticated audited and reversible", async () => {
  const [actions, page, migration] = await Promise.all([
    readFile(new URL("./actions.ts", import.meta.url), "utf8"),
    readFile(new URL("./page.tsx", import.meta.url), "utf8"),
    readFile(new URL(
      "../../../prisma/migrations/20260801093000_search_conversion_repairs/migration.sql",
      import.meta.url,
    ), "utf8"),
  ]);

  assert.match(migration, /CREATE TABLE "search_conversion_repairs"/);
  assert.match(migration, /baseline_commercial_conversions/);
  assert.match(migration, /'in_progress', 'resolved', 'ignored'/);
  assert.match(actions, /startSearchConversionRepairAction/);
  assert.match(actions, /updateSearchConversionRepairAction/);
  assert.match(actions, /await requireAdmin\(\)/);
  assert.match(actions, /start_search_conversion_repair/);
  assert.match(page, /转化修复任务/);
  assert.match(page, /只有新增商业点击才算完成转化/);
  assert.match(page, /record\.effect === "converted"/);
});

test("authority coverage ranks demand-backed quality gaps without hiding products", () => {
  const weakAudit: AuthorityProductAudit = {
    id: "product-1",
    slug: "chatgpt",
    title: "ChatGPT",
    score: 50,
    status: "hold",
    issues: ["较多价格已超过 14 天未复核"],
    nextAction: "优先复核价格",
    sections: { search: 10, data: 20, trust: 10, decision: 5 },
    editPath: "/admin/products/product-1/edit",
    path: "/zh/ai-pricing/chatgpt",
    priceCount: 39,
    countryCount: 12,
    stalePriceCount: 25,
    taxGapCount: 3,
    completeSeoLocaleCount: 1,
    requiredSeoLocaleCount: 2,
  };
  const healthyAudit: AuthorityProductAudit = {
    ...weakAudit,
    id: "product-2",
    slug: "claude",
    title: "Claude",
    score: 100,
    status: "indexable",
    issues: [],
    nextAction: "保持更新",
    sections: { search: 20, data: 45, trust: 20, decision: 15 },
    editPath: "/admin/products/product-2/edit",
    path: "/zh/ai-pricing/claude",
    countryCount: 39,
    stalePriceCount: 0,
    taxGapCount: 0,
    completeSeoLocaleCount: 2,
  };
  const queue = buildAuthorityCoverageQueue(
    [healthyAudit, weakAudit],
    [{
      ...conversionTerm,
      resultClickCount: 8,
      visitorCount: 5,
      planEngagementCount: 5,
      commercialConversionCount: 2,
    }],
  );

  assert.equal(queue.length, 2);
  assert.equal(queue[0].productId, "product-1");
  assert.equal(queue[0].priority, "urgent");
  assert.equal(queue[0].demandScore, 40);
  assert.match(queue[0].recommendedAction, /过期价格/);
  assert.equal(queue[0].actionKind, "collect");
  assert.match(queue[0].actionEvidence, /25 条价格/);
  assert.equal(queue[1].productId, "product-2");
  assert.equal(queue[1].priority, "monitor");
  assert.equal(queue[1].demandScore, 0);
  assert.equal(queue[1].actionKind, "monitor");
});

test("authority coverage never hides a small explicit freshness gap", () => {
  const audit: AuthorityProductAudit = {
    id: "product-3",
    slug: "gemini",
    title: "Gemini",
    score: 100,
    status: "indexable",
    issues: [],
    nextAction: "保持更新",
    sections: { search: 20, data: 45, trust: 20, decision: 15 },
    editPath: "/admin/products/product-3/edit",
    path: "/zh/ai-pricing/gemini",
    priceCount: 100,
    countryCount: 39,
    stalePriceCount: 1,
    taxGapCount: 0,
    completeSeoLocaleCount: 2,
    requiredSeoLocaleCount: 2,
  };
  const [item] = buildAuthorityCoverageQueue([audit], []);
  assert.equal(item.authorityGapScore, 1);
  assert.match(item.recommendedAction, /过期价格/);
  assert.equal(item.actionKind, "collect");
});

test("authority coverage routes each gap to a controlled action", () => {
  const base: AuthorityProductAudit = {
    id: "product-4",
    slug: "perplexity",
    title: "Perplexity",
    score: 80,
    status: "needs_work",
    issues: [],
    nextAction: "完善资料",
    sections: { search: 20, data: 45, trust: 20, decision: 15 },
    editPath: "/admin/products/product-4/edit",
    path: "/zh/ai-pricing/perplexity",
    priceCount: 39,
    countryCount: 39,
    stalePriceCount: 0,
    taxGapCount: 4,
    completeSeoLocaleCount: 2,
    requiredSeoLocaleCount: 2,
  };
  const taxItem = buildAuthorityCoverageQueue([base], [])[0];
  const contentItem = buildAuthorityCoverageQueue([{
    ...base,
    taxGapCount: 0,
    completeSeoLocaleCount: 1,
  }], [])[0];

  assert.equal(taxItem.actionKind, "review_data");
  assert.match(taxItem.actionHref, /data-quality\/perplexity/);
  assert.equal(contentItem.actionKind, "edit_content");
  assert.match(contentItem.actionHref, /source=authority-coverage/);
  assert.match(contentItem.actionHref, /evidence=/);
});

test("authority collection is authenticated scoped and audited", async () => {
  const [route, page, editor, actions, migration] = await Promise.all([
    readFile(new URL("./authority-collect/route.ts", import.meta.url), "utf8"),
    readFile(new URL("./page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../products/[id]/edit/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("./actions.ts", import.meta.url), "utf8"),
    readFile(new URL(
      "../../../prisma/migrations/20260801143000_authority_coverage_tasks/migration.sql",
      import.meta.url,
    ), "utf8"),
  ]);

  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /queueAndRunAppStoreCollection\(productSlug\)/);
  assert.match(route, /queue_authority_coverage_collection/);
  assert.match(route, /getProductSeoQualityAudit\(productSlug\)/);
  assert.match(route, /item\.actionKind !== "collect"/);
  assert.match(page, /submitUrl="\/admin\/search-demand\/authority-collect"/);
  assert.match(page, /productSlug=\{item\.productSlug\}/);
  assert.match(page, /确认恢复/);
  assert.match(page, /问题复发/);
  assert.match(editor, /权威覆盖任务/);
  assert.match(editor, /不会自动改写公开内容/);
  assert.match(actions, /startAuthorityCoverageTaskAction/);
  assert.match(actions, /record\.effect !== "resolved"/);
  assert.match(actions, /update_authority_coverage_task/);
  assert.match(migration, /CREATE TABLE "authority_coverage_tasks"/);
  assert.match(migration, /baseline_stale_price_count/);
  assert.match(migration, /'in_progress', 'resolved', 'ignored'/);
});

test("authority task effects require real metric improvement", () => {
  const baseline: AuthorityCoverageSnapshot = {
    priceCount: 39,
    stalePriceCount: 8,
    countryCount: 12,
    taxGapCount: 4,
    completeSeoLocaleCount: 1,
    requiredSeoLocaleCount: 2,
    decisionScore: 8,
    score: 60,
  };

  assert.equal(classifyAuthorityCoverageTaskEffect({
    gapCode: "stale_price",
    baseline,
    current: { ...baseline, stalePriceCount: 4 },
    taskStatus: "in_progress",
  }), "improving");
  assert.equal(classifyAuthorityCoverageTaskEffect({
    gapCode: "stale_price",
    baseline,
    current: { ...baseline, stalePriceCount: 0 },
    taskStatus: "in_progress",
  }), "resolved");
  assert.equal(classifyAuthorityCoverageTaskEffect({
    gapCode: "region_gap",
    baseline,
    current: { ...baseline, countryCount: 18 },
    taskStatus: "in_progress",
  }), "improving");
  assert.equal(classifyAuthorityCoverageTaskEffect({
    gapCode: "seo_gap",
    baseline,
    current: { ...baseline, completeSeoLocaleCount: 2 },
    taskStatus: "in_progress",
  }), "resolved");
  assert.equal(classifyAuthorityCoverageTaskEffect({
    gapCode: "decision_gap",
    baseline,
    current: baseline,
    taskStatus: "resolved",
  }), "regressed");
});

test("authority business effect only advances on post-task user behavior", () => {
  assert.equal(classifyAuthorityCoverageBusinessEffect({
    resultClicks: 0,
    planEngagements: 0,
    commercialConversions: 0,
  }), "waiting");
  assert.equal(classifyAuthorityCoverageBusinessEffect({
    resultClicks: 2,
    planEngagements: 0,
    commercialConversions: 0,
  }), "traffic");
  assert.equal(classifyAuthorityCoverageBusinessEffect({
    resultClicks: 2,
    planEngagements: 1,
    commercialConversions: 0,
  }), "engagement");
  assert.equal(classifyAuthorityCoverageBusinessEffect({
    resultClicks: 2,
    planEngagements: 1,
    commercialConversions: 1,
  }), "converted");
});

test("authority task business evidence is product scoped and starts with the task", async () => {
  const [source, page] = await Promise.all([
    readFile(
      new URL("../../../lib/admin-authority-coverage-tasks.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("./page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(source, /event\.product_id = task\.product_id/);
  assert.match(source, /event\.created_at >= task\.evaluation_started_at/);
  assert.match(source, /'click_search_result'/);
  assert.match(source, /'select_plan'/);
  assert.match(source, /'click_official'/);
  assert.match(page, /数据状态/);
  assert.match(page, /业务效果/);
  assert.match(page, /从任务开始后计算，不包含历史流量/);
});

test("search demand page explains authority coverage in operator language", async () => {
  const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
  assert.match(page, /权威覆盖优先级/);
  assert.match(page, /覆盖全部已上线产品/);
  assert.match(page, /真实需求/);
  assert.match(page, /权威缺口/);
  assert.doesNotMatch(page, /record\.blockerCode}/);
});

test("search conversion attribution retains the dominant clicked target", async () => {
  const source = await readFile(
    new URL("../../../lib/admin-search-demand.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /event\.product_id/);
  assert.match(source, /event\.plan_id/);
  assert.match(source, /target_counts AS/);
  assert.match(source, /target\.target_rank = 1/);
});

test("growth opportunity scoring combines demand gap intent and conversion", () => {
  const now = new Date("2026-07-31T00:00:00.000Z");
  const queue = buildSearchGrowthQueue(
    [
      {
        query: "new ai service",
        locales: ["en"],
        searchCount: 4,
        noResultCount: 4,
        clickCount: 0,
        clickRate: 0,
        visitorCount: 3,
        lastSeenAt: now,
      },
      {
        query: "chatgpt plus",
        locales: ["zh"],
        searchCount: 4,
        noResultCount: 0,
        clickCount: 3,
        clickRate: 75,
        visitorCount: 3,
        lastSeenAt: now,
      },
      {
        query: "one click",
        locales: ["zh"],
        searchCount: 1,
        noResultCount: 0,
        clickCount: 1,
        clickRate: 100,
        visitorCount: 1,
        lastSeenAt: now,
      },
    ],
    [
      {
        query: "chatgpt plus",
        locales: ["zh"],
        resultClickCount: 3,
        visitorCount: 3,
        planEngagementCount: 2,
        commercialConversionCount: 1,
        commercialConversionRate: 33,
        lastClickedAt: now,
      },
    ],
  );

  const gap = queue.find((item) => item.query === "new ai service");
  const commercial = queue.find((item) => item.query === "chatgpt plus");
  const oneClick = queue.find((item) => item.query === "one click");

  assert.equal(gap?.stage, "unmet");
  assert.equal(gap?.priorityTier, "high");
  assert.match(gap?.recommendedAction || "", /接入产品/);
  assert.equal(commercial?.stage, "commercial");
  assert.equal(commercial?.priorityTier, "high");
  assert.match(commercial?.recommendedAction || "", /放大高转化入口/);
  assert.equal(oneClick?.priorityTier, "observe");
  assert.ok((queue[0]?.priorityScore || 0) >= (queue[1]?.priorityScore || 0));

  for (const opportunity of queue) {
    const total = Object.values(opportunity.scoreBreakdown)
      .reduce((sum, score) => sum + score, 0);
    assert.equal(opportunity.priorityScore, total);
    assert.ok(opportunity.priorityScore >= 0);
    assert.ok(opportunity.priorityScore <= 100);
  }
});

test("search opportunity effect uses only meaningful post-processing evidence", () => {
  assert.equal(
    classifySearchOpportunityEffect({
      searchCount: 1,
      noResultCount: 0,
      clickCount: 1,
      visitorCount: 1,
    }),
    "converted",
  );
  assert.equal(
    classifySearchOpportunityEffect({
      searchCount: 3,
      noResultCount: 1,
      clickCount: 0,
      visitorCount: 2,
    }),
    "improving",
  );
  assert.equal(
    classifySearchOpportunityEffect({
      searchCount: 2,
      noResultCount: 2,
      clickCount: 0,
      visitorCount: 2,
    }),
    "regressed",
  );
  assert.equal(
    classifySearchOpportunityEffect({
      searchCount: 0,
      noResultCount: 0,
      clickCount: 0,
      visitorCount: 0,
    }),
    "pending",
  );
});

test("search opportunity workflow normalizes and validates lifecycle state", () => {
  assert.equal(
    normalizeSearchOpportunityQuery("  Netflix   Student  "),
    "netflix student",
  );
  assert.equal(isSearchOpportunityWorkflowStatus("in_progress"), true);
  assert.equal(isSearchOpportunityWorkflowStatus("deleted"), false);
  assert.equal(shouldShowSearchOpportunity("open"), true);
  assert.equal(shouldShowSearchOpportunity("in_progress"), true);
  assert.equal(shouldShowSearchOpportunity("resolved"), false);
  assert.equal(shouldShowSearchOpportunity("ignored"), false);
});

test("search opportunity actions require admin and restrict redirects", async () => {
  const source = await readFile(
    new URL("./actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /await requireAdmin\(\)/);
  assert.match(source, /ALLOWED_DESTINATIONS/);
  assert.match(source, /\/admin\/discovery\?/);
  assert.match(source, /\/admin\/articles\/new\?/);
  assert.match(source, /Invalid search opportunity destination/);
  assert.match(source, /saveSearchOpportunity/);
  assert.match(source, /auditLog\.create/);
});

test("created candidates and articles link back to the originating opportunity", async () => {
  const [discovery, articles] = await Promise.all([
    readFile(new URL("../discovery/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../articles/actions.ts", import.meta.url), "utf8"),
  ]);

  assert.match(discovery, /linkSearchOpportunity/);
  assert.match(discovery, /candidateId/);
  assert.match(articles, /linkSearchOpportunity/);
  assert.match(articles, /articleId: article\.id/);
});

test("effect observation starts on processing and aggregates later search events", async () => {
  const source = await readFile(
    new URL("../../../lib/admin-search-opportunities.ts", import.meta.url),
    "utf8",
  );
  const migration = await readFile(
    new URL(
      "../../../prisma/migrations/20260730143000_search_opportunity_effect_window/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /evaluation_started_at/);
  assert.match(source, /evaluation_started_at = CASE/);
  assert.match(source, /EXCLUDED\.status = 'open' THEN NULL/);
  assert.match(source, /REGEXP_REPLACE/);
  assert.match(source, /click_search_result/);
  assert.match(source, /event\.created_at >= opportunity\.evaluation_started_at/);
});

test("controlled search aliases require repeat visitor evidence and remain reversible", async () => {
  const [helper, actions, migration] = await Promise.all([
    readFile(
      new URL("../../../lib/admin-search-aliases.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("./actions.ts", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../../../prisma/migrations/20260730170000_controlled_search_aliases/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(migration, /CREATE TABLE "search_aliases"/);
  assert.match(migration, /'active', 'disabled'/);
  assert.match(helper, /evidence\.clickCount < 2/);
  assert.match(helper, /evidence\.visitorCount < 2/);
  assert.match(helper, /event_key = 'click_search_result'/);
  assert.match(actions, /approveSearchAliasAction/);
  assert.match(actions, /updateSearchAliasAction/);
  assert.match(actions, /approve_search_alias/);
});

test("public search reads only active locale-specific controlled aliases", async () => {
  const [route, aliases] = await Promise.all([
    readFile(new URL("../../api/search/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../../lib/search-aliases.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(route, /getActiveSearchAliases\(locale\)/);
  assert.match(route, /productAliasesById/);
  assert.match(route, /planAliasesById/);
  assert.match(aliases, /WHERE status = 'active'/);
  assert.match(aliases, /AND locale =/);
});

test("search conversion attribution follows the latest search for thirty minutes", async () => {
  const [source, page] = await Promise.all([
    readFile(
      new URL("../../../lib/admin-search-demand.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("./page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(source, /WITH search_journeys AS/);
  assert.match(source, /LEAD\(event\.created_at\) OVER/);
  assert.match(source, /INTERVAL '30 minutes'/);
  assert.match(source, /click_affiliate/);
  assert.match(source, /click_official/);
  assert.match(source, /click_ad/);
  assert.match(source, /commercialConversionRate/);
  assert.match(page, /搜索转化路径/);
  assert.match(page, /最近一次搜索/);
  assert.match(page, /带来商业点击/);
  assert.match(page, /增长机会优先级/);
  assert.match(page, /需求 25 分、缺口 35 分、套餐意向 20 分、商业转化 20 分/);
  assert.match(page, /查看行为/);
});
