import AdminLink from "@/components/admin/AdminLink";
import {
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import {
  buildSearchGapQueue,
  buildSearchGrowthQueue,
  parseSearchDemandRange,
  SEARCH_DEMAND_RANGES,
  shouldShowSearchOpportunity,
} from "../../../lib/admin-search-demand";
import { normalizeSearchOpportunityQuery } from "../../../lib/admin-search-opportunities";
import { buildAuthorityCoverageQueue } from "../../../lib/search-authority-coverage";
import { searchConversionRepairKey } from "../../../lib/admin-search-conversion-repairs";
import {
  growthFocusHref,
  matchesGrowthFocus,
  parseGrowthFocus,
} from "./presenters";
import { loadSearchDemandData } from "./queries";
import { AuthorityCoverageSection } from "./AuthorityCoverageSection";
import { ConversionRepairSections } from "./ConversionRepairSections";
import { SearchConversionSections } from "./SearchConversionSections";
import { SearchEvidenceSections } from "./SearchEvidenceSections";
import { SearchGrowthPrioritySection } from "./SearchGrowthPrioritySection";
import { SearchOpportunityWorkflowSections } from "./SearchOpportunityWorkflowSections";

export const dynamic = "force-dynamic";

export default async function AdminSearchDemandPage({
  searchParams,
}: {
  searchParams?: Promise<{
    days?: string;
    focus?: string;
    aliasResult?: string;
    repairResult?: string;
    authorityResult?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const days = parseSearchDemandRange(params.days);
  const growthFocus = parseGrowthFocus(params.focus);
  const {
    summary,
    workflowRecords,
    aliasRecords,
    conversionDiagnostics,
    repairRecords,
    productAudits,
    authorityTaskRecords,
  } = await loadSearchDemandData(days);
  const authorityCoverageQueue = buildAuthorityCoverageQueue(
    productAudits,
    summary.conversionTerms,
  );
  const noResultRate = summary.totalSearches > 0
    ? Math.round((summary.totalNoResults / summary.totalSearches) * 100)
    : 0;
  const clickRate = summary.totalSearches > 0
    ? Math.round((summary.totalClicks / summary.totalSearches) * 100)
    : 0;
  const gapQueue = buildSearchGapQueue(summary.terms);
  const growthQueue = buildSearchGrowthQueue(
    summary.terms,
    summary.conversionTerms.map((term) => ({
      query: term.query,
      locales: [term.locale],
      resultClickCount: term.resultClickCount,
      visitorCount: term.visitorCount,
      planEngagementCount: term.planEngagementCount,
      commercialConversionCount: term.commercialConversionCount,
      commercialConversionRate: term.commercialConversionRate,
      lastClickedAt: term.lastClickedAt,
    })),
  );
  const workflowByQuery = new Map(
    workflowRecords.map((record) => [record.normalizedQuery, record]),
  );
  const conversionTermByTarget = new Map(
    summary.conversionTerms.map((term) => [
      searchConversionRepairKey({
        normalizedQuery: normalizeSearchOpportunityQuery(term.query),
        locale: term.locale,
        productId: term.productId,
        planId: term.planId,
        blockerCode: conversionDiagnostics.find((diagnostic) =>
          diagnostic.query === term.query
          && diagnostic.locale === term.locale
          && diagnostic.productId === term.productId
          && diagnostic.planId === term.planId
        )?.blockerCode || "ux_review",
      }),
      term,
    ]),
  );
  const repairByKey = new Map(
    repairRecords.map((record) => [
      searchConversionRepairKey({
        normalizedQuery: record.normalizedQuery,
        locale: record.locale,
        productId: record.productId,
        planId: record.planId,
        blockerCode: record.blockerCode,
      }),
      record,
    ]),
  );
  const activeGapQueue = gapQueue.filter((gap) => {
    const workflow = workflowByQuery.get(
      normalizeSearchOpportunityQuery(gap.query),
    );
    return shouldShowSearchOpportunity(workflow?.status);
  });
  const gapByQuery = new Map(
    activeGapQueue.map((gap) => [
      normalizeSearchOpportunityQuery(gap.query),
      gap,
    ]),
  );
  const activeGrowthQueue = growthQueue.filter((opportunity) => {
    const workflow = workflowByQuery.get(
      normalizeSearchOpportunityQuery(opportunity.query),
    );
    const hiddenByWorkflow = workflow?.status === "ignored"
      || (
        workflow?.status === "resolved"
        && opportunity.stage === "unmet"
      );
    return !hiddenByWorkflow && matchesGrowthFocus(opportunity, growthFocus);
  });
  const completedWorkflow = workflowRecords.filter((record) =>
    record.status === "resolved" || record.status === "ignored"
  );
  const effectWorkflow = workflowRecords.filter(
    (record) => record.evaluationStartedAt && record.status !== "ignored",
  );
  const resolvableCount = effectWorkflow.filter(
    (record) =>
      record.status === "in_progress" && record.effectState === "converted",
  ).length;
  const improvingEffectCount = effectWorkflow.filter(
    (record) => record.effectState === "improving",
  ).length;
  const reopenCount = effectWorkflow.filter(
    (record) => record.status === "resolved" && record.effectState === "regressed",
  ).length;
  const pendingEffectCount = effectWorkflow.filter(
    (record) => record.effectState === "pending",
  ).length;
  const actionableCount = activeGapQueue.filter((gap) => gap.status === "ready").length;
  const validationCount = activeGapQueue.filter((gap) => gap.status === "validate").length;
  const observationCount = activeGapQueue.filter((gap) => gap.status === "observe").length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Growth"
        title="搜索需求"
        description="查看访客真正想找的产品、套餐和问题。优先处理反复出现的无结果关键词，再观察搜索后是否进入了对应页面。"
        action={(
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {SEARCH_DEMAND_RANGES.map((range) => (
              <AdminLink
                key={range}
                href={growthFocusHref(range, growthFocus)}
                aria-current={days === range ? "page" : undefined}
                className={[
                  "rounded-md px-3 py-2 text-sm font-bold transition",
                  days === range
                    ? "bg-blue-700 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                {range} 天
              </AdminLink>
            ))}
          </div>
        )}
      />

      {params.aliasResult ? (
        <div
          className={[
            "mb-6 rounded-lg border px-4 py-3 text-sm font-semibold",
            params.aliasResult === "insufficient"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-green-200 bg-green-50 text-green-800",
          ].join(" ")}
        >
          {params.aliasResult === "insufficient"
            ? "别名尚未达到启用门槛，或目标记录已经变化。系统没有修改公开搜索。"
            : params.aliasResult === "approved"
              ? "搜索别名已启用，新的搜索请求会立即使用它。"
              : params.aliasResult === "disabled"
                ? "搜索别名已停用，历史证据仍保留。"
                : "搜索别名已重新启用。"}
        </div>
      ) : null}

      {params.repairResult ? (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {params.repairResult === "started"
            ? "转化修复任务已开始，系统已保存当前数据作为比较基线。"
            : params.repairResult === "resolved"
              ? "任务已确认解决，后续数据仍会保留用于复盘。"
              : "任务已停止观察，历史基线和处理记录仍然保留。"}
        </div>
      ) : null}

      {params.authorityResult ? (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {params.authorityResult === "queued"
            ? "该产品的定向复采已进入后台运行，后续结果会回到价格审核与数据质量页面。"
            : params.authorityResult === "fresh"
              ? "该产品最近已经成功采集，系统没有重复启动任务。"
              : params.authorityResult === "resolved"
                ? "权威覆盖任务已确认完成，处理前基线和改善结果均已保留。"
                : params.authorityResult === "ignored"
                  ? "任务已暂停，历史基线仍然保留，可以随时重新处理。"
                  : params.authorityResult === "not-ready"
                    ? "当前指标尚未达到目标，系统没有把任务标记为完成。"
              : "定向复采未能启动，请查看采集任务与系统状态。"}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="搜索次数"
          value={summary.totalSearches}
          helper={`最近 ${days} 天`}
        />
        <AdminStatCard
          label="搜索关键词"
          value={summary.uniqueTerms}
          helper="按规范化关键词去重"
        />
        <AdminStatCard
          label="无结果率"
          value={`${noResultRate}%`}
          helper={`${summary.totalNoResults} 次没有匹配内容`}
        />
        <AdminStatCard
          label="结果点击率"
          value={`${clickRate}%`}
          helper={`${summary.totalClicks} 次进入结果页`}
        />
      </div>

      <AuthorityCoverageSection
        items={authorityCoverageQueue}
        taskRecords={authorityTaskRecords}
        days={days}
      />

      <ConversionRepairSections
        days={days}
        conversionDiagnostics={conversionDiagnostics}
        repairRecords={repairRecords}
        conversionTermByTarget={conversionTermByTarget}
        repairByKey={repairByKey}
      />

      <SearchGrowthPrioritySection
        days={days}
        growthFocus={growthFocus}
        activeGrowthQueue={activeGrowthQueue}
        gapByQuery={gapByQuery}
        workflowByQuery={workflowByQuery}
      />

      <SearchConversionSections
        days={days}
        summary={summary}
        effectWorkflow={effectWorkflow}
        resolvableCount={resolvableCount}
        improvingEffectCount={improvingEffectCount}
        reopenCount={reopenCount}
        pendingEffectCount={pendingEffectCount}
      />

      <SearchOpportunityWorkflowSections
        days={days}
        activeGapQueue={activeGapQueue}
        completedWorkflow={completedWorkflow}
        workflowByQuery={workflowByQuery}
        actionableCount={actionableCount}
        validationCount={validationCount}
        observationCount={observationCount}
      />

      <SearchEvidenceSections
        summary={summary}
        aliasRecords={aliasRecords}
        days={days}
      />
    </div>
  );
}
