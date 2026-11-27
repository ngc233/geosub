import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getClaudeDuetOverviewNotice, hasClaudeOverviewDecision } from "./claude-overview-decision.ts";
import { preparedSiteLocaleDefinitions, type SiteLocale } from "./site-locale.ts";

test("Duet notice is confined to the Chinese Claude overview without enabling the English decision layout", () => {
  for (const locale of Object.keys(preparedSiteLocaleDefinitions) as SiteLocale[]) {
    assert.equal(Boolean(getClaudeDuetOverviewNotice(locale, "claude")), locale === "zh");
    for (const slug of ["chatgpt", "gemini", "grok", "disney", "claude-duet", ""]) {
      assert.equal(getClaudeDuetOverviewNotice(locale, slug), null);
    }
  }
  assert.equal(hasClaudeOverviewDecision("zh", "claude"), false);
  assert.equal(hasClaudeOverviewDecision("en", "claude"), true);
});

test("Duet notice preserves approved eligibility and shared-usage wording with exact official sources", () => {
  const notice = getClaudeDuetOverviewNotice("zh", "claude")!;
  assert.equal(notice.title, "Claude Duet：订阅 Pro、Max 不等于立即可用");
  assert.equal(notice.description, "Anthropic 于 2026 年 10 月 21 日宣布 Claude Duet 研究预览，首批面向美国 Pro、Max 订阅用户，需加入候补名单。预览期间，它包含在现有套餐内，但与其他 Claude 功能共享使用额度，后台检查和持续任务也会消耗额度。因此，购买订阅不代表立即获得 Duet，也不会额外得到一份独立额度；购买前应确认地区资格及开放状态。");
  assert.deepEqual(notice.sources.map(({ href }) => href), [
    "https://claude.com/resources/articles/claude-duet",
    "https://support.claude.com/en/articles/12138966-release-notes",
  ]);
});

test("Duet is a server-rendered aside in the overview only, not a plan card or structured-data offer", () => {
  const overview = readFileSync(new URL("../components/ProductPlanOverview.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("../components/PricingDetailPage.tsx", import.meta.url), "utf8");
  assert.match(overview, /const duetNotice = getClaudeDuetOverviewNotice\(locale, product\.slug\)/);
  assert.match(overview, /\{duetNotice \? \(\s*<aside aria-labelledby="claude-duet-notice-title"/);
  assert.match(overview, /<h3 id="claude-duet-notice-title"/);
  assert.match(overview, /<p className="mt-2">\{duetNotice\.description\}<\/p>/);
  assert.match(overview, /duetNotice\.sources\.map/);
  assert.match(overview, /target="_blank" rel="noopener noreferrer"/);
  assert.match(overview, /min-h-11.*focus-visible:outline-\[var\(--color-focus\)\]/);
  assert.doesNotMatch(overview, /["']use client["']/);
  assert.equal((detail.match(/<ProductPlanOverview /g) || []).length, 1);
  const overviewStart = detail.indexOf("if (!routePlanSlug) {");
  const planStart = detail.indexOf("const activePlan =", overviewStart);
  assert.ok(detail.slice(overviewStart, planStart).includes("<ProductPlanOverview product={product} locale={locale} />"));
  assert.doesNotMatch(detail.slice(planStart), /ProductPlanOverview|Duet/);
});
