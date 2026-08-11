import AdminLink from "@/components/admin/AdminLink";
import { ArrowUpRight, SearchCheck } from "lucide-react";
import { AdminBadge } from "../../../components/admin/AdminBadge";
import {
  AdminButton,
  AdminLinkButton,
} from "../../../components/admin/AdminButton";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
} from "../../../components/admin/AdminTable";
import {
  buildSearchGapQueue,
  buildSearchGrowthQueue,
  getSearchDemandSummary,
  parseSearchDemandRange,
  SEARCH_DEMAND_RANGES,
  type SearchGapKind,
  type SearchGapSuggestion,
  type SearchGrowthOpportunity,
  type SearchGrowthPriorityTier,
  type SearchGrowthStage,
  type SearchConversionTerm,
  type SearchDemandTerm,
  type SearchOpportunityStatus,
  shouldShowSearchOpportunity,
} from "../../../lib/admin-search-demand";
import {
  getSearchOpportunityRecords,
  normalizeSearchOpportunityQuery,
  type SearchOpportunityRecord,
} from "../../../lib/admin-search-opportunities";
import { getSearchAliasRecords } from "../../../lib/admin-search-aliases";
import { getSearchConversionDiagnostics } from "../../../lib/admin-search-conversion-diagnostics";
import { measureAdminWorkload } from "../../../lib/admin-performance";
import { getCachedProductSeoQualityAudits } from "../../../lib/product-seo-quality-data";
import {
  buildAuthorityCoverageQueue,
  type AuthorityCoveragePriority,
} from "../../../lib/search-authority-coverage";
import {
  getSearchConversionRepairRecords,
  searchConversionRepairKey,
  type SearchConversionRepairRecord,
} from "../../../lib/admin-search-conversion-repairs";
import { getAuthorityCoverageTaskRecords } from "../../../lib/admin-authority-coverage-tasks";
import type {
  AuthorityCoverageBusinessEffect,
  AuthorityCoverageTaskEffect,
  AuthorityCoverageTaskStatus,
} from "../../../lib/search-authority-task";
import type {
  SearchConversionBlockerSeverity,
} from "../../../lib/search-conversion-diagnostics";
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";
import {
  approveSearchAliasAction,
  startAuthorityCoverageTaskAction,
  startSearchOpportunityAction,
  startSearchConversionRepairAction,
  updateSearchAliasAction,
  updateAuthorityCoverageTaskAction,
  updateSearchConversionRepairAction,
  updateSearchOpportunityAction,
} from "./actions";

export const dynamic = "force-dynamic";

const SEARCH_GROWTH_FOCUSES = [
  "all",
  "actionable",
  "unmet",
  "intent",
  "commercial",
] as const;
type SearchGrowthFocus = (typeof SEARCH_GROWTH_FOCUSES)[number];

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(value);
}

function termStatus(term: SearchDemandTerm) {
  if (term.noResultCount > 0 && term.noResultCount === term.searchCount) {
    return { label: "内容缺口", variant: "danger" as const };
  }
  if (term.noResultCount > 0) {
    return { label: "部分无结果", variant: "review" as const };
  }
  if (term.clickCount > 0) {
    return { label: "已有点击", variant: "published" as const };
  }
  return { label: "有结果未点击", variant: "neutral" as const };
}

function resultKindLabel(kind: string) {
  const labels: Record<string, string> = {
    product: "产品",
    plan: "套餐",
    article: "指南",
    tool: "工具",
  };
  return labels[kind] || "其他";
}

function gapKindLabel(kind: SearchGapKind) {
  const labels: Record<SearchGapKind, string> = {
    product: "疑似缺产品",
    plan: "疑似缺套餐",
    content: "疑似缺内容",
  };
  return labels[kind];
}

function gapActionLabel(kind: SearchGapKind) {
  return kind === "content" ? "创建内容草稿" : "核验并接入";
}

function opportunityStatus(status: SearchOpportunityStatus) {
  const values = {
    ready: {
      label: "可以处理",
      helper: "重复需求且来自多位访客",
      variant: "published" as const,
    },
    validate: {
      label: "待验证",
      helper: "已有需求信号，先核实",
      variant: "review" as const,
    },
    observe: {
      label: "继续观察",
      helper: "证据不足，暂不创建",
      variant: "neutral" as const,
    },
  };
  return values[status];
}

function effectPresentation(record: SearchOpportunityRecord) {
  if (!record.evaluationStartedAt) {
    return {
      label: "尚未观察",
      helper: "开始处理后才会记录效果",
      variant: "neutral" as const,
    };
  }

  if (record.effectState === "converted") {
    return {
      label: "已产生点击",
      helper: "用户已从搜索结果进入页面，可标记为已解决",
      variant: "published" as const,
    };
  }
  if (record.effectState === "improving") {
    return {
      label: "已有搜索结果",
      helper: "未再全部落空，继续观察是否产生点击",
      variant: "review" as const,
    };
  }
  if (record.effectState === "regressed") {
    return {
      label: "仍反复无结果",
      helper: "不同访客仍遇到空结果，建议重新处理",
      variant: "danger" as const,
    };
  }
  return {
    label: "等待新搜索",
    helper: "处理后尚无足够用户行为用于判断",
    variant: "neutral" as const,
  };
}

function conversionPresentation(
  planEngagements: number,
  commercialConversions: number,
) {
  if (commercialConversions > 0) {
    return {
      label: "带来商业点击",
      variant: "published" as const,
    };
  }
  if (planEngagements > 0) {
    return {
      label: "已有套餐意向",
      variant: "review" as const,
    };
  }
  return {
    label: "仅进入结果页",
    variant: "neutral" as const,
  };
}

function parseGrowthFocus(value?: string): SearchGrowthFocus {
  return SEARCH_GROWTH_FOCUSES.includes(value as SearchGrowthFocus)
    ? value as SearchGrowthFocus
    : "all";
}

function growthFocusHref(days: number, focus: SearchGrowthFocus) {
  const query = new URLSearchParams({ days: String(days) });
  if (focus !== "all") query.set("focus", focus);
  return `/admin/search-demand?${query.toString()}`;
}

function growthPriorityPresentation(tier: SearchGrowthPriorityTier) {
  const presentations = {
    urgent: {
      label: "立即处理",
      variant: "danger" as const,
    },
    high: {
      label: "优先处理",
      variant: "review" as const,
    },
    validate: {
      label: "验证优化",
      variant: "neutral" as const,
    },
    observe: {
      label: "继续观察",
      variant: "neutral" as const,
    },
  };
  return presentations[tier];
}

function blockerSeverityPresentation(
  severity: SearchConversionBlockerSeverity,
) {
  const presentations = {
    critical: {
      label: "明确阻塞",
      variant: "danger" as const,
    },
    high: {
      label: "优先修复",
      variant: "review" as const,
    },
    review: {
      label: "需要完善",
      variant: "neutral" as const,
    },
    ready: {
      label: "基础完整",
      variant: "published" as const,
    },
  };
  return presentations[severity];
}

function repairStatusPresentation(record: SearchConversionRepairRecord) {
  if (record.status === "resolved") {
    return { label: "已解决", variant: "published" as const };
  }
  if (record.status === "ignored") {
    return { label: "已忽略", variant: "neutral" as const };
  }
  return { label: "修复中", variant: "review" as const };
}

function repairBlockerLabel(code: SearchConversionRepairRecord["blockerCode"]) {
  return {
    missing_target: "目标关联缺失",
    missing_price: "正式价格缺失",
    missing_entry: "购买入口缺失",
    stale_price: "价格过期",
    thin_plan_copy: "套餐说明不足",
    trust_gap: "可信资料不足",
    ux_review: "购买路径待优化",
  }[code];
}

function repairEffectPresentation(record: SearchConversionRepairRecord) {
  if (record.effect === "converted") {
    return {
      label: "已产生转化",
      helper: `商业点击 +${record.commercialConversionDelta}`,
      variant: "published" as const,
    };
  }
  if (record.effect === "engagement_up") {
    return {
      label: "套餐意向增加",
      helper: `套餐意向 +${record.planEngagementDelta}，尚无新商业点击`,
      variant: "review" as const,
    };
  }
  if (record.effect === "traffic_only") {
    return {
      label: "仅流量增加",
      helper: `结果点击 +${record.resultClickDelta}，尚未进入套餐`,
      variant: "neutral" as const,
    };
  }
  return {
    label: "等待新流量",
    helper: "开始处理后尚无可比较的新行为",
    variant: "neutral" as const,
  };
}

function authorityPriorityPresentation(priority: AuthorityCoveragePriority) {
  return {
    urgent: { label: "立即补强", variant: "danger" as const },
    high: { label: "优先处理", variant: "review" as const },
    planned: { label: "计划完善", variant: "neutral" as const },
    monitor: { label: "持续观察", variant: "published" as const },
  }[priority];
}

function authorityTaskPresentation(
  status: AuthorityCoverageTaskStatus,
  effect: AuthorityCoverageTaskEffect,
) {
  if (status === "ignored") {
    return { label: "已暂停", helper: "保留基线，可随时重新处理", variant: "neutral" as const };
  }
  if (effect === "resolved") {
    return { label: "已恢复健康", helper: "当前指标已达到目标", variant: "published" as const };
  }
  if (effect === "improving") {
    return { label: "正在改善", helper: "指标比处理前更好，但尚未达标", variant: "review" as const };
  }
  if (effect === "regressed") {
    return { label: "问题复发", helper: "完成后指标再次低于目标", variant: "danger" as const };
  }
  return { label: "等待变化", helper: "任务已开始，当前指标尚未改善", variant: "neutral" as const };
}

function authorityBusinessPresentation(effect: AuthorityCoverageBusinessEffect) {
  return {
    waiting: {
      label: "尚无后续行为",
      helper: "从任务开始后计算，不包含历史流量",
      variant: "neutral" as const,
    },
    traffic: {
      label: "带来搜索点击",
      helper: "用户已从站内搜索进入产品页面",
      variant: "neutral" as const,
    },
    engagement: {
      label: "带来套餐意向",
      helper: "用户已进一步查看或选择套餐",
      variant: "review" as const,
    },
    converted: {
      label: "带来商业点击",
      helper: "用户已点击官方、Affiliate 或广告入口",
      variant: "published" as const,
    },
  }[effect];
}

function growthStagePresentation(stage: SearchGrowthStage) {
  const presentations = {
    unmet: {
      label: "需求未满足",
      variant: "danger" as const,
    },
    result: {
      label: "进入结果页",
      variant: "neutral" as const,
    },
    plan: {
      label: "产生套餐意向",
      variant: "review" as const,
    },
    commercial: {
      label: "产生商业点击",
      variant: "published" as const,
    },
  };
  return presentations[stage];
}

function matchesGrowthFocus(
  opportunity: SearchGrowthOpportunity,
  focus: SearchGrowthFocus,
) {
  if (focus === "actionable") {
    return opportunity.priorityTier === "urgent"
      || opportunity.priorityTier === "high";
  }
  if (focus === "unmet") return opportunity.noResultCount > 0;
  if (focus === "intent") return opportunity.planEngagementCount > 0;
  if (focus === "commercial") {
    return opportunity.commercialConversionCount > 0;
  }
  return true;
}

function SearchOpportunityActions({
  days,
  gap,
  workflow,
}: {
  days: number;
  gap: SearchGapSuggestion;
  workflow?: SearchOpportunityRecord;
}) {
  return (
    <div className="flex min-w-40 flex-col items-end gap-2">
      {gap.actionHref ? (
        <form action={startSearchOpportunityAction}>
          <input type="hidden" name="query" value={gap.query} />
          <input type="hidden" name="kind" value={gap.kind} />
          <input type="hidden" name="destination" value={gap.actionHref} />
          <AdminButton
            type="submit"
            size="sm"
            variant={workflow?.status === "in_progress" ? "secondary" : "primary"}
          >
            {workflow?.status === "in_progress"
              ? "继续处理"
              : gapActionLabel(gap.kind)}
            <ArrowUpRight size={14} />
          </AdminButton>
        </form>
      ) : (
        <span className="text-xs font-semibold text-slate-400">
          暂不创建
        </span>
      )}

      <div className="flex flex-wrap justify-end gap-1">
        {workflow?.status === "in_progress" ? (
          <form action={updateSearchOpportunityAction}>
            <input type="hidden" name="query" value={gap.query} />
            <input type="hidden" name="kind" value={gap.kind} />
            <input type="hidden" name="status" value="resolved" />
            <input type="hidden" name="days" value={days} />
            <AdminButton type="submit" size="sm" variant="success">
              标记已解决
            </AdminButton>
          </form>
        ) : null}
        <form action={updateSearchOpportunityAction}>
          <input type="hidden" name="query" value={gap.query} />
          <input type="hidden" name="kind" value={gap.kind} />
          <input type="hidden" name="status" value="ignored" />
          <input type="hidden" name="days" value={days} />
          <AdminButton type="submit" size="sm" variant="ghost">
            忽略
          </AdminButton>
        </form>
      </div>
    </div>
  );
}

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
  const summaryPromise = measureAdminWorkload("search-demand.summary", () =>
    getSearchDemandSummary(days),
  );
  const productAuditsPromise = getCachedProductSeoQualityAudits();
  const workflowRecordsPromise = getSearchOpportunityRecords();
  const aliasRecordsPromise = getSearchAliasRecords();
  const summary = await summaryPromise;
  const [
    workflowRecords,
    aliasRecords,
    conversionDiagnostics,
    repairRecords,
    productAudits,
    authorityTaskRecords,
  ] = await measureAdminWorkload(
    "search-demand.supporting-data",
    () => Promise.all([
      workflowRecordsPromise,
      aliasRecordsPromise,
      productAuditsPromise.then((audits) =>
        getSearchConversionDiagnostics(summary.conversionTerms, audits)
      ),
      getSearchConversionRepairRecords(summary.conversionTerms),
      productAuditsPromise,
      productAuditsPromise.then((audits) => getAuthorityCoverageTaskRecords(audits)),
    ]),
  );
  const authorityCoverageQueue = buildAuthorityCoverageQueue(
    productAudits,
    summary.conversionTerms,
  );
  const authorityTaskByProductGap = new Map(
    authorityTaskRecords.map((record) => [
      `${record.productId}:${record.gapCode}`,
      record,
    ]),
  );
  const latestAuthorityTaskByProduct = new Map<string, (typeof authorityTaskRecords)[number]>();
  for (const record of authorityTaskRecords) {
    if (!latestAuthorityTaskByProduct.has(record.productId)) {
      latestAuthorityTaskByProduct.set(record.productId, record);
    }
  }
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
  const aliasByQueryAndLocale = new Map(
    aliasRecords.map((record) => [
      `${record.normalizedAlias}:${record.locale}`,
      record,
    ]),
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

      <div className="mb-6">
        <AdminTableShell
          title="权威覆盖优先级"
          description={`覆盖全部已上线产品。优先级由最近 ${days} 天真实搜索需求和产品权威缺口共同决定；没有搜索样本的产品仍会保留在队列中。`}
        >
          <AdminTable className="min-w-[1160px]">
            <AdminTableHead>
              <tr>
                <AdminTh>优先级</AdminTh>
                <AdminTh>产品</AdminTh>
                <AdminTh>真实需求</AdminTh>
                <AdminTh>权威缺口</AdminTh>
                <AdminTh>优先补什么</AdminTh>
                <AdminTh align="right">操作</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {authorityCoverageQueue.slice(0, 20).map((item) => {
                const priority = authorityPriorityPresentation(item.priority);
                const task = item.gapCode
                  ? authorityTaskByProductGap.get(`${item.productId}:${item.gapCode}`)
                  : latestAuthorityTaskByProduct.get(item.productId);
                const taskState = task
                  ? authorityTaskPresentation(task.status, task.effect)
                  : null;
                const businessState = task
                  ? authorityBusinessPresentation(task.businessEffect)
                  : null;
                const taskActive = task?.status === "in_progress";
                const taskCanResolve = taskActive && task.effect === "resolved";
                const taskNeedsRestart = task?.status === "ignored"
                  || task?.effect === "regressed";
                return (
                  <AdminTr key={item.productId}>
                    <AdminTd>
                      <AdminBadge variant={priority.variant}>
                        {priority.label}
                      </AdminBadge>
                      <span className="mt-2 block text-xs font-bold tabular-nums text-slate-500">
                        {item.priorityScore}/100
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="font-bold text-slate-950">
                        {item.productName}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        页面质量 {item.qualityScore}/100
                      </span>
                    </AdminTd>
                    <AdminTd>
                      {item.demandScore > 0 ? (
                        <div className="text-xs leading-5 text-slate-600">
                          <div>
                            结果点击 {item.resultClickCount} · 套餐意向 {item.planEngagementCount}
                          </div>
                          <div>
                            商业点击 {item.commercialConversionCount} · 访客 {item.visitorCount}
                          </div>
                          {item.demandQueries.length > 0 ? (
                            <div className="mt-1 max-w-xs truncate text-slate-400">
                              搜索：{item.demandQueries.join("、")}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          暂无站内搜索样本，按产品质量排队
                        </span>
                      )}
                    </AdminTd>
                    <AdminTd>
                      <div className="flex max-w-sm flex-wrap gap-1.5">
                        {item.gaps.length > 0 ? item.gaps.map((gap) => (
                          <span
                            key={gap}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                          >
                            {gap}
                          </span>
                        )) : (
                          <span className="text-xs font-semibold text-green-700">
                            当前核心资料完整
                          </span>
                        )}
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-sm font-bold text-slate-800">
                        {item.recommendedAction}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        需求 {item.demandScore}/40 · 缺口 {item.authorityGapScore}/60
                      </span>
                      <span className="mt-1 block max-w-xs text-xs leading-5 text-slate-500">
                        {item.actionEvidence}
                      </span>
                      {taskState ? (
                        <div className="mt-2 space-y-2">
                          <div>
                            <AdminBadge variant={taskState.variant}>{taskState.label}</AdminBadge>
                            <span className="ml-2 text-xs text-slate-400">数据状态 · {taskState.helper}</span>
                          </div>
                          {businessState && task ? (
                            <div>
                              <AdminBadge variant={businessState.variant}>{businessState.label}</AdminBadge>
                              <span className="ml-2 text-xs text-slate-400">
                                业务效果 · {businessState.helper}
                              </span>
                              <span className="mt-1 block text-xs tabular-nums text-slate-400">
                                搜索点击 {task.businessMetrics.resultClicks} · 套餐意向 {task.businessMetrics.planEngagements} · 商业点击 {task.businessMetrics.commercialConversions}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </AdminTd>
                    <AdminTd align="right">
                      <div className="flex max-w-xs flex-wrap justify-end gap-2">
                        {taskCanResolve && task ? (
                          <form action={updateAuthorityCoverageTaskAction}>
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="status" value="resolved" />
                            <input type="hidden" name="days" value={days} />
                            <AdminButton type="submit" size="sm" variant="success">
                              确认恢复
                            </AdminButton>
                          </form>
                        ) : item.actionKind === "collect" && (!taskActive || taskNeedsRestart) ? (
                          <ManualCollectionProgressForm
                            productSlug={item.productSlug}
                            buttonLabel={taskNeedsRestart ? "重新复采" : "定向复采"}
                            pendingLabel="正在启动"
                            submitUrl="/admin/search-demand/authority-collect"
                          />
                        ) : item.actionKind !== "collect" && item.actionKind !== "monitor" && (!taskActive || taskNeedsRestart) ? (
                          <form action={startAuthorityCoverageTaskAction}>
                            <input type="hidden" name="productId" value={item.productId} />
                            <input type="hidden" name="days" value={days} />
                            <AdminButton
                              type="submit"
                              size="sm"
                              variant={item.priority === "urgent" ? "primary" : "secondary"}
                            >
                              {taskNeedsRestart ? "重新处理" : "开始处理"}
                              <ArrowUpRight size={14} />
                            </AdminButton>
                          </form>
                        ) : taskActive && task ? (
                          <AdminLinkButton
                            href={task.actionKind === "collect"
                              ? `/admin/review?q=${encodeURIComponent(item.productSlug)}`
                              : task.actionHref}
                            size="sm"
                            variant="secondary"
                          >
                            {task.actionKind === "collect" ? "查看进度" : "继续处理"}
                            <ArrowUpRight size={14} />
                          </AdminLinkButton>
                        ) : (
                          <AdminLinkButton href={item.actionHref} size="sm" variant="secondary">
                            查看
                            <ArrowUpRight size={14} />
                          </AdminLinkButton>
                        )}
                        {taskActive && task && !taskCanResolve ? (
                          <form action={updateAuthorityCoverageTaskAction}>
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="status" value="ignored" />
                            <input type="hidden" name="days" value={days} />
                            <AdminButton type="submit" size="sm" variant="ghost">
                              暂停
                            </AdminButton>
                          </form>
                        ) : null}
                        <AdminLinkButton
                          href={item.publicPath}
                          size="sm"
                          variant="ghost"
                        >
                          查看
                        </AdminLinkButton>
                      </div>
                    </AdminTd>
                  </AdminTr>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        </AdminTableShell>
      </div>

      <div className="mb-6">
        <AdminTableShell
          title="高意向低转化诊断"
          description={`只分析最近 ${days} 天已经查看套餐、但没有继续点击官方、合作或广告入口的搜索。这里展示的是基于现有数据的可能阻塞点，不把相关性当作确定原因。`}
        >
          <AdminTable className="min-w-[1080px]">
            <AdminTableHead>
              <tr>
                <AdminTh>优先级</AdminTh>
                <AdminTh>搜索与目标</AdminTh>
                <AdminTh>可能阻塞点</AdminTh>
                <AdminTh>判断证据</AdminTh>
                <AdminTh align="right">下一步</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {conversionDiagnostics.length > 0 ? (
                conversionDiagnostics.slice(0, 30).map((diagnostic) => {
                  const severity = blockerSeverityPresentation(
                    diagnostic.severity,
                  );
                  const repairKey = searchConversionRepairKey({
                    normalizedQuery: normalizeSearchOpportunityQuery(
                      diagnostic.query,
                    ),
                    locale: diagnostic.locale,
                    productId: diagnostic.productId,
                    planId: diagnostic.planId,
                    blockerCode: diagnostic.blockerCode,
                  });
                  const repair = repairByKey.get(repairKey);
                  const term = conversionTermByTarget.get(repairKey) as
                    | SearchConversionTerm
                    | undefined;
                  return (
                    <AdminTr
                      key={repairKey}
                    >
                      <AdminTd>
                        <AdminBadge variant={severity.variant}>
                          {severity.label}
                        </AdminBadge>
                      </AdminTd>
                      <AdminTd>
                        <span className="font-bold text-slate-950">
                          {diagnostic.query}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          主要目标：{diagnostic.targetTitle}
                        </span>
                        <span className="mt-1 block text-xs font-semibold uppercase text-slate-400">
                          {diagnostic.locale}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="block max-w-md text-sm leading-6 text-slate-700">
                          {diagnostic.summary}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <div className="flex max-w-sm flex-wrap gap-1.5">
                          {diagnostic.evidence.map((item) => (
                            <span
                              key={item}
                              className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </AdminTd>
                      <AdminTd align="right">
                        <div className="flex min-w-40 flex-col items-end gap-2">
                          {repair?.status === "in_progress" ? (
                            <AdminBadge variant="review">修复中</AdminBadge>
                          ) : term ? (
                            <form action={startSearchConversionRepairAction}>
                              <input type="hidden" name="days" value={days} />
                              <input type="hidden" name="query" value={diagnostic.query} />
                              <input type="hidden" name="locale" value={diagnostic.locale} />
                              <input type="hidden" name="productId" value={diagnostic.productId || ""} />
                              <input type="hidden" name="planId" value={diagnostic.planId || ""} />
                              <input type="hidden" name="blockerCode" value={diagnostic.blockerCode} />
                              <input type="hidden" name="actionHref" value={diagnostic.actionHref} />
                              <input type="hidden" name="resultClickCount" value={term.resultClickCount} />
                              <input type="hidden" name="planEngagementCount" value={term.planEngagementCount} />
                              <input type="hidden" name="commercialConversionCount" value={term.commercialConversionCount} />
                              <AdminButton type="submit" size="sm" variant="primary">
                                {repair ? "重新开始" : "开始修复"}
                              </AdminButton>
                            </form>
                          ) : null}
                          <AdminLinkButton
                            href={diagnostic.actionHref}
                            size="sm"
                            variant="secondary"
                          >
                            {diagnostic.actionLabel}
                            <ArrowUpRight size={14} />
                          </AdminLinkButton>
                        </div>
                      </AdminTd>
                    </AdminTr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    当前时段没有“已查看套餐但未继续点击购买入口”的搜索记录。
                  </td>
                </tr>
              )}
            </AdminTableBody>
          </AdminTable>
        </AdminTableShell>
      </div>

      {repairRecords.length > 0 ? (
        <div className="mb-6">
          <AdminTableShell
            title="转化修复任务"
            description="基线是开始处理时同一统计窗口的数据。只有新增商业点击才算完成转化；仅有浏览或套餐意向增长会继续观察。"
          >
            <AdminTable className="min-w-[1120px]">
              <AdminTableHead>
                <tr>
                  <AdminTh>搜索与目标</AdminTh>
                  <AdminTh>任务状态</AdminTh>
                  <AdminTh>开始时基线</AdminTh>
                  <AdminTh>当前窗口</AdminTh>
                  <AdminTh>效果判断</AdminTh>
                  <AdminTh align="right">操作</AdminTh>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {repairRecords.map((record) => {
                  const status = repairStatusPresentation(record);
                  const effect = repairEffectPresentation(record);
                  return (
                    <AdminTr key={record.id}>
                      <AdminTd>
                        <span className="font-bold text-slate-950">
                          {record.query}
                        </span>
                        <span className="mt-1 block text-xs uppercase text-slate-400">
                          {record.locale} · {repairBlockerLabel(record.blockerCode)}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <AdminBadge variant={status.variant}>{status.label}</AdminBadge>
                        <span className="mt-1 block text-xs text-slate-500">
                          {formatDate(record.evaluationStartedAt)} UTC
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="block text-xs leading-5 text-slate-600">
                          结果 {record.baselineResultClicks} · 套餐 {record.baselinePlanEngagements}
                          <br />商业 {record.baselineCommercialConversions} · {record.baselineWindowDays} 天窗口
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="block text-xs leading-5 text-slate-600">
                          结果 {record.currentResultClicks} · 套餐 {record.currentPlanEngagements}
                          <br />商业 {record.currentCommercialConversions}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <AdminBadge variant={effect.variant}>{effect.label}</AdminBadge>
                        <span className="mt-1 block max-w-xs text-xs text-slate-500">
                          {effect.helper}
                        </span>
                      </AdminTd>
                      <AdminTd align="right">
                        <div className="flex justify-end gap-2">
                          <AdminLinkButton href={record.actionHref} size="sm" variant="secondary">
                            处理
                            <ArrowUpRight size={14} />
                          </AdminLinkButton>
                          {record.status === "in_progress" && record.effect === "converted" ? (
                            <form action={updateSearchConversionRepairAction}>
                              <input type="hidden" name="id" value={record.id} />
                              <input type="hidden" name="status" value="resolved" />
                              <input type="hidden" name="days" value={days} />
                              <AdminButton type="submit" size="sm" variant="primary">
                                确认解决
                              </AdminButton>
                            </form>
                          ) : null}
                          {record.status === "in_progress" ? (
                            <form action={updateSearchConversionRepairAction}>
                              <input type="hidden" name="id" value={record.id} />
                              <input type="hidden" name="status" value="ignored" />
                              <input type="hidden" name="days" value={days} />
                              <AdminButton type="submit" size="sm" variant="ghost">
                                停止观察
                              </AdminButton>
                            </form>
                          ) : null}
                        </div>
                      </AdminTd>
                    </AdminTr>
                  );
                })}
              </AdminTableBody>
            </AdminTable>
          </AdminTableShell>
        </div>
      ) : null}

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-950">增长机会优先级</h2>
            <p className="mt-1 text-sm text-slate-500">
              总分由需求、缺口、套餐意向和商业转化组成。分数用于排序，判断依据始终可见。
            </p>
          </div>
          <div className="flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {[
              ["all", "全部"],
              ["actionable", "优先处理"],
              ["unmet", "需求未满足"],
              ["intent", "套餐意向"],
              ["commercial", "商业点击"],
            ].map(([focus, label]) => (
              <AdminLink
                key={focus}
                href={growthFocusHref(days, focus as SearchGrowthFocus)}
                aria-current={growthFocus === focus ? "page" : undefined}
                className={[
                  "rounded-md px-3 py-2 text-xs font-bold transition",
                  growthFocus === focus
                    ? "bg-blue-700 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                {label}
              </AdminLink>
            ))}
          </div>
        </div>
        <AdminTableShell
          description={`当前显示 ${activeGrowthQueue.length} 项。需求 25 分、缺口 35 分、套餐意向 20 分、商业转化 20 分；达到 45 分进入优先处理。`}
        >
          <AdminTable className="min-w-[1180px]">
            <AdminTableHead>
              <tr>
                <AdminTh>优先级</AdminTh>
                <AdminTh>搜索词</AdminTh>
                <AdminTh>当前阶段</AdminTh>
                <AdminTh>分数组成</AdminTh>
                <AdminTh>建议动作</AdminTh>
                <AdminTh>判断依据</AdminTh>
                <AdminTh align="right">处理</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {activeGrowthQueue.length > 0 ? (
                activeGrowthQueue.slice(0, 50).map((opportunity) => {
                  const priority = growthPriorityPresentation(
                    opportunity.priorityTier,
                  );
                  const stage = growthStagePresentation(opportunity.stage);
                  const normalized = normalizeSearchOpportunityQuery(
                    opportunity.query,
                  );
                  const gap = gapByQuery.get(normalized);
                  const workflow = workflowByQuery.get(normalized);

                  return (
                    <AdminTr key={`growth:${normalized}`}>
                      <AdminTd>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex min-w-11 justify-center rounded-md bg-slate-950 px-2 py-1 text-xs font-bold tabular-nums text-white">
                            {opportunity.priorityScore}
                          </span>
                          <AdminBadge variant={priority.variant}>
                            {priority.label}
                          </AdminBadge>
                        </div>
                      </AdminTd>
                      <AdminTd>
                        <span className="font-bold text-slate-950">
                          {opportunity.query}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {opportunity.visitorCount} 位访客 ·{" "}
                          {opportunity.locales.join(", ") || "unknown"}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <div className="flex flex-col items-start gap-1.5">
                          <AdminBadge variant={stage.variant}>
                            {stage.label}
                          </AdminBadge>
                          <span className="text-xs text-slate-400">
                            无结果 {opportunity.noResultCount} · 套餐意向{" "}
                            {opportunity.planEngagementCount} · 商业点击{" "}
                            {opportunity.commercialConversionCount}
                          </span>
                        </div>
                      </AdminTd>
                      <AdminTd>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums text-slate-500">
                          <span>需求 {opportunity.scoreBreakdown.demand}/25</span>
                          <span>缺口 {opportunity.scoreBreakdown.gap}/35</span>
                          <span>意向 {opportunity.scoreBreakdown.intent}/20</span>
                          <span>
                            转化 {opportunity.scoreBreakdown.commercial}/20
                          </span>
                        </div>
                      </AdminTd>
                      <AdminTd>
                        <span className="font-semibold text-slate-800">
                          {opportunity.recommendedAction}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="block max-w-sm text-xs leading-5 text-slate-500">
                          {opportunity.reason}
                        </span>
                      </AdminTd>
                      <AdminTd align="right">
                        {gap ? (
                          <SearchOpportunityActions
                            days={days}
                            gap={gap}
                            workflow={workflow}
                          />
                        ) : opportunity.actionHref ? (
                          <AdminLinkButton
                            href={opportunity.actionHref}
                            size="sm"
                            variant="secondary"
                          >
                            查看行为
                            <ArrowUpRight size={14} />
                          </AdminLinkButton>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            继续观察
                          </span>
                        )}
                      </AdminTd>
                    </AdminTr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    当前筛选下没有机会项。扩大时间范围后再查看。
                  </td>
                </tr>
              )}
            </AdminTableBody>
          </AdminTable>
        </AdminTableShell>
      </div>

      <div className="mb-6">
        <AdminTableShell
          title="搜索转化路径"
          description={`最近 ${days} 天共有 ${summary.conversionTotals.resultClicks} 次搜索结果点击，其中 ${summary.conversionTotals.planEngagements} 次继续查看具体套餐，${summary.conversionTotals.commercialConversions} 次到达官方、Affiliate 或广告入口。商业转化率 ${summary.conversionTotals.commercialConversionRate}%。每次行为只归给此前 30 分钟内最近一次搜索。`}
        >
          <AdminTable className="min-w-[900px]">
            <AdminTableHead>
              <tr>
                <AdminTh>搜索词</AdminTh>
                <AdminTh>语言</AdminTh>
                <AdminTh align="right">结果点击</AdminTh>
                <AdminTh align="right">套餐意向</AdminTh>
                <AdminTh align="right">商业点击</AdminTh>
                <AdminTh align="right">商业转化率</AdminTh>
                <AdminTh>结论</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {summary.conversionTerms.length > 0 ? (
                summary.conversionTerms.slice(0, 20).map((term) => {
                  const presentation = conversionPresentation(
                    term.planEngagementCount,
                    term.commercialConversionCount,
                  );

                  return (
                    <AdminTr key={`conversion:${term.locale}:${term.query}`}>
                      <AdminTd>
                        <span className="font-bold text-slate-950">
                          {term.query}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {term.visitorCount} 位访客 · 最近{" "}
                          {formatDate(term.lastClickedAt)} UTC
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          {term.locale}
                        </span>
                      </AdminTd>
                      <AdminTd align="right">{term.resultClickCount}</AdminTd>
                      <AdminTd align="right">{term.planEngagementCount}</AdminTd>
                      <AdminTd align="right">
                        {term.commercialConversionCount}
                      </AdminTd>
                      <AdminTd align="right">
                        {term.commercialConversionRate}%
                      </AdminTd>
                      <AdminTd>
                        <AdminBadge variant={presentation.variant}>
                          {presentation.label}
                        </AdminBadge>
                      </AdminTd>
                    </AdminTr>
                  );
                })
              ) : (
                <AdminTr>
                  <AdminTd>
                    <span className="text-sm text-slate-400">
                      所选时段还没有搜索结果点击，暂时无法判断后续转化。
                    </span>
                  </AdminTd>
                  <AdminTd>—</AdminTd>
                  <AdminTd align="right">0</AdminTd>
                  <AdminTd align="right">0</AdminTd>
                  <AdminTd align="right">0</AdminTd>
                  <AdminTd align="right">0%</AdminTd>
                  <AdminTd>
                    <AdminBadge variant="neutral">等待数据</AdminBadge>
                  </AdminTd>
                </AdminTr>
              )}
            </AdminTableBody>
          </AdminTable>
        </AdminTableShell>
      </div>

      {effectWorkflow.length > 0 ? (
        <div className="mb-6">
          <AdminTableShell
            title="搜索机会效果验证"
            description={`可解决 ${resolvableCount} 项，正在改善 ${improvingEffectCount} 项，建议重新处理 ${reopenCount} 项，等待新搜索 ${pendingEffectCount} 项。结论只使用开始处理后的真实搜索行为。`}
          >
            <AdminTable className="min-w-[980px]">
              <AdminTableHead>
                <tr>
                  <AdminTh>搜索词</AdminTh>
                  <AdminTh>工作状态</AdminTh>
                  <AdminTh>效果结论</AdminTh>
                  <AdminTh>处理后证据</AdminTh>
                  <AdminTh>观察起点</AdminTh>
                  <AdminTh align="right">建议操作</AdminTh>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {effectWorkflow.slice(0, 30).map((record) => {
                  const effect = effectPresentation(record);
                  const canResolve =
                    record.status === "in_progress"
                    && record.effectState === "converted";
                  const shouldReopen =
                    record.status === "resolved"
                    && record.effectState === "regressed";

                  return (
                    <AdminTr key={`effect:${record.id}`}>
                      <AdminTd>
                        <span className="font-bold text-slate-950">
                          {record.query}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {gapKindLabel(record.kind)}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <AdminBadge
                          variant={
                            record.status === "resolved"
                              ? "published"
                              : "review"
                          }
                        >
                          {record.status === "resolved" ? "已解决" : "处理中"}
                        </AdminBadge>
                      </AdminTd>
                      <AdminTd>
                        <div className="flex flex-col items-start gap-1.5">
                          <AdminBadge variant={effect.variant}>
                            {effect.label}
                          </AdminBadge>
                          <span className="max-w-xs text-xs leading-5 text-slate-500">
                            {effect.helper}
                          </span>
                        </div>
                      </AdminTd>
                      <AdminTd>
                        <span className="block text-xs text-slate-600">
                          搜索 {record.effectSearchCount} 次 · 无结果{" "}
                          {record.effectNoResultCount} 次
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          点击 {record.effectClickCount} 次 ·{" "}
                          {record.effectVisitorCount} 位访客
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-xs text-slate-500">
                          {formatDate(record.evaluationStartedAt!)} UTC
                        </span>
                      </AdminTd>
                      <AdminTd align="right">
                        {canResolve || shouldReopen ? (
                          <form action={updateSearchOpportunityAction}>
                            <input
                              type="hidden"
                              name="query"
                              value={record.query}
                            />
                            <input
                              type="hidden"
                              name="kind"
                              value={record.kind}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value={canResolve ? "resolved" : "open"}
                            />
                            <input type="hidden" name="days" value={days} />
                            <AdminButton
                              type="submit"
                              size="sm"
                              variant={canResolve ? "success" : "secondary"}
                            >
                              {canResolve ? "标记已解决" : "重新处理"}
                            </AdminButton>
                          </form>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            继续观察
                          </span>
                        )}
                      </AdminTd>
                    </AdminTr>
                  );
                })}
              </AdminTableBody>
            </AdminTable>
          </AdminTableShell>
        </div>
      ) : null}

      <div className="mb-6">
        <AdminTableShell
          title="搜索机会"
          description={`可以处理 ${actionableCount} 项，待验证 ${validationCount} 项，继续观察 ${observationCount} 项。系统不会根据单次偶然搜索自动创建、发布或上架内容。`}
        >
          <AdminTable className="min-w-[920px]">
            <AdminTableHead>
              <tr>
                <AdminTh>优先级</AdminTh>
                <AdminTh>搜索词</AdminTh>
                <AdminTh>建议</AdminTh>
                <AdminTh>判断依据</AdminTh>
                <AdminTh align="right">需求</AdminTh>
                <AdminTh align="right">处理</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {activeGapQueue.length > 0 ? (
                activeGapQueue.map((gap) => (
                  <AdminTr key={gap.query}>
                    <AdminTd>
                      <span className="inline-flex min-w-11 justify-center rounded-md bg-red-50 px-2 py-1 text-xs font-bold tabular-nums text-red-700">
                        {gap.priorityScore}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="font-bold text-slate-950">
                        {gap.query}
                      </span>
                      <span className="mt-1 block text-xs uppercase text-slate-400">
                        {gap.locales.join(", ") || "unknown"}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <div className="flex flex-col items-start gap-1.5">
                        <AdminBadge variant={opportunityStatus(gap.status).variant}>
                          {opportunityStatus(gap.status).label}
                        </AdminBadge>
                        <span className="text-xs font-semibold text-slate-600">
                          {gapKindLabel(gap.kind)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {opportunityStatus(gap.status).helper}
                        </span>
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <span className="block max-w-md text-xs leading-5 text-slate-500">
                        {gap.reason}
                      </span>
                    </AdminTd>
                    <AdminTd align="right">
                      <span className="font-bold tabular-nums text-slate-950">
                        {gap.noResultCount}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        共搜 {gap.searchCount} 次 · {gap.visitorCount} 位访客
                      </span>
                    </AdminTd>
                    <AdminTd align="right">
                      <SearchOpportunityActions
                        days={days}
                        gap={gap}
                        workflow={workflowByQuery.get(
                          normalizeSearchOpportunityQuery(gap.query),
                        )}
                      />
                    </AdminTd>
                  </AdminTr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    当前范围内没有无结果搜索，暂时不需要补产品或内容。
                  </td>
                </tr>
              )}
            </AdminTableBody>
          </AdminTable>
        </AdminTableShell>
      </div>

      {completedWorkflow.length > 0 ? (
        <div className="mb-6">
          <AdminTableShell
            title="已处理的搜索机会"
            description="已解决和已忽略的机会不会重复占据待办。需要重新处理时可以恢复。"
          >
            <AdminTable className="min-w-[760px]">
              <AdminTableHead>
                <tr>
                  <AdminTh>搜索词</AdminTh>
                  <AdminTh>类型</AdminTh>
                  <AdminTh>状态</AdminTh>
                  <AdminTh>关联</AdminTh>
                  <AdminTh>更新时间</AdminTh>
                  <AdminTh align="right">操作</AdminTh>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {completedWorkflow.slice(0, 20).map((record) => (
                  <AdminTr key={record.id}>
                    <AdminTd>
                      <span className="font-bold text-slate-950">
                        {record.query}
                      </span>
                    </AdminTd>
                    <AdminTd>{gapKindLabel(record.kind)}</AdminTd>
                    <AdminTd>
                      <AdminBadge
                        variant={record.status === "resolved" ? "published" : "neutral"}
                      >
                        {record.status === "resolved" ? "已解决" : "已忽略"}
                      </AdminBadge>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-xs text-slate-500">
                        {record.linkedCandidateId
                          ? "已关联产品线索"
                          : record.linkedArticleId
                            ? "已关联文章草稿"
                            : "未关联"}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="text-xs text-slate-500">
                        {formatDate(record.updatedAt)} UTC
                      </span>
                    </AdminTd>
                    <AdminTd align="right">
                      <form action={updateSearchOpportunityAction}>
                        <input type="hidden" name="query" value={record.query} />
                        <input type="hidden" name="kind" value={record.kind} />
                        <input type="hidden" name="status" value="open" />
                        <input type="hidden" name="days" value={days} />
                        <AdminButton type="submit" size="sm" variant="secondary">
                          恢复
                        </AdminButton>
                      </form>
                    </AdminTd>
                  </AdminTr>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminTableShell>
        </div>
      ) : null}

      {summary.totalSearches === 0 ? (
        <AdminCard className="mb-6">
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <SearchCheck size={22} />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-950">
              暂时没有搜索数据
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              前台搜索上线后，真实关键词会自动出现在这里。系统不会把搜索词公开，也不会创建可索引的搜索结果页。
            </p>
          </div>
        </AdminCard>
      ) : (
        <div className="mb-6">
          <AdminTableShell
            title="关键词需求"
            description="无结果次数高的关键词排在前面，代表最值得补充的产品或内容。"
          >
            <AdminTable className="min-w-[860px]">
              <AdminTableHead>
                <tr>
                  <AdminTh>关键词</AdminTh>
                  <AdminTh>状态</AdminTh>
                  <AdminTh align="right">搜索</AdminTh>
                  <AdminTh align="right">无结果</AdminTh>
                  <AdminTh align="right">点击</AdminTh>
                  <AdminTh align="right">点击率</AdminTh>
                  <AdminTh>语言</AdminTh>
                  <AdminTh>最近出现</AdminTh>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {summary.terms.map((term) => {
                  const status = termStatus(term);
                  return (
                    <AdminTr key={term.query}>
                      <AdminTd>
                        <span className="font-bold text-slate-950">
                          {term.query}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <AdminBadge variant={status.variant}>
                          <span className="whitespace-nowrap">{status.label}</span>
                        </AdminBadge>
                      </AdminTd>
                      <AdminTd align="right">
                        <span className="font-bold tabular-nums">
                          {term.searchCount}
                        </span>
                      </AdminTd>
                      <AdminTd align="right">
                        <span
                          className={
                            term.noResultCount > 0
                              ? "font-bold text-red-700 tabular-nums"
                              : "text-slate-400"
                          }
                        >
                          {term.noResultCount}
                        </span>
                      </AdminTd>
                      <AdminTd align="right">
                        <span className="font-bold tabular-nums">
                          {term.clickCount}
                        </span>
                      </AdminTd>
                      <AdminTd align="right">
                        <span className="tabular-nums text-slate-600">
                          {term.clickRate}%
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-xs uppercase text-slate-500">
                          {term.locales.join(", ") || "-"}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-xs text-slate-500">
                          {formatDate(term.lastSeenAt)} UTC
                        </span>
                      </AdminTd>
                    </AdminTr>
                  );
                })}
              </AdminTableBody>
            </AdminTable>
          </AdminTableShell>
        </div>
      )}

      <AdminTableShell
        title="用户叫法建议"
        description="只根据真实的“搜索后点击”整理。至少 2 次点击且来自 2 位访客时才建议启用；已确认的别名可以随时停用，不会删除历史证据。"
      >
        <AdminTable className="min-w-[980px]">
          <AdminTableHead>
            <tr>
              <AdminTh>用户搜索</AdminTh>
              <AdminTh>最终进入</AdminTh>
              <AdminTh>类型</AdminTh>
              <AdminTh align="right">点击</AdminTh>
              <AdminTh align="right">访客</AdminTh>
              <AdminTh>别名状态</AdminTh>
              <AdminTh>最近点击</AdminTh>
              <AdminTh align="right">操作</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {summary.aliasSuggestions.length > 0 ? (
              summary.aliasSuggestions.map((suggestion) => {
                const existing = aliasByQueryAndLocale.get(
                  `${normalizeSearchOpportunityQuery(suggestion.query)}:${suggestion.locale}`,
                );
                const sameTarget = existing
                  ? existing.targetKind === suggestion.resultKind
                    && (
                      suggestion.resultKind === "product"
                        ? existing.productId === suggestion.productId
                        : existing.planId === suggestion.planId
                    )
                  : false;
                const ready =
                  suggestion.clickCount >= 2 && suggestion.visitorCount >= 2;

                return (
                <AdminTr
                  key={`${suggestion.locale}:${suggestion.query}:${suggestion.resultHref}`}
                >
                  <AdminTd>
                    <span className="font-bold text-slate-950">
                      {suggestion.query}
                    </span>
                    <span className="mt-1 block text-xs uppercase text-slate-400">
                      {suggestion.locale}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <span className="font-bold text-slate-700">
                      {suggestion.resultTitle}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge>
                      {resultKindLabel(suggestion.resultKind)}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd align="right">
                    <span className="font-bold tabular-nums">
                      {suggestion.clickCount}
                    </span>
                  </AdminTd>
                  <AdminTd align="right">
                    <span className="font-bold tabular-nums">
                      {suggestion.visitorCount}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge
                      variant={
                        existing && !sameTarget
                          ? "danger"
                          : existing?.status === "active"
                            ? "published"
                            : existing?.status === "disabled"
                              ? "neutral"
                              : ready
                                ? "review"
                                : "neutral"
                      }
                    >
                      {existing && !sameTarget
                        ? "指向冲突"
                        : existing?.status === "active"
                          ? "已启用"
                          : existing?.status === "disabled"
                            ? "已停用"
                            : ready
                              ? "建议启用"
                              : "继续观察"}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-xs text-slate-500">
                      {formatDate(suggestion.lastClickedAt)} UTC
                    </span>
                  </AdminTd>
                  <AdminTd align="right">
                    <div className="flex justify-end gap-2">
                      {existing && sameTarget ? (
                        <form action={updateSearchAliasAction}>
                          <input type="hidden" name="id" value={existing.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={
                              existing.status === "active" ? "disabled" : "active"
                            }
                          />
                          <input type="hidden" name="days" value={days} />
                          <AdminButton type="submit" size="sm" variant="secondary">
                            {existing.status === "active" ? "停用" : "重新启用"}
                          </AdminButton>
                        </form>
                      ) : !existing && ready ? (
                        <form action={approveSearchAliasAction}>
                          <input
                            type="hidden"
                            name="alias"
                            value={suggestion.query}
                          />
                          <input
                            type="hidden"
                            name="locale"
                            value={suggestion.locale}
                          />
                          <input
                            type="hidden"
                            name="targetKind"
                            value={suggestion.resultKind}
                          />
                          <input
                            type="hidden"
                            name="productId"
                            value={suggestion.productId || ""}
                          />
                          <input
                            type="hidden"
                            name="planId"
                            value={suggestion.planId || ""}
                          />
                          <input
                            type="hidden"
                            name="targetTitle"
                            value={suggestion.resultTitle}
                          />
                          <input
                            type="hidden"
                            name="targetHref"
                            value={suggestion.resultHref}
                          />
                          <input type="hidden" name="days" value={days} />
                          <AdminButton type="submit" size="sm" variant="primary">
                            启用别名
                          </AdminButton>
                        </form>
                      ) : null}
                      <AdminLink
                        href={suggestion.resultHref}
                        target="_blank"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`查看 ${suggestion.resultTitle}`}
                        title={`查看 ${suggestion.resultTitle}`}
                      >
                        <ArrowUpRight size={16} />
                      </AdminLink>
                    </div>
                  </AdminTd>
                </AdminTr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-sm text-slate-400"
                >
                  暂时没有足够的搜索点击，系统不会凭空猜测别名。
                </td>
              </tr>
            )}
          </AdminTableBody>
        </AdminTable>
      </AdminTableShell>

      <div className="mt-6">
      <AdminTableShell
        title="点击最多的搜索结果"
        description="用于判断搜索是否把访客带到了真正需要的产品、套餐、指南或工具。"
      >
        <AdminTable className="min-w-[760px]">
          <AdminTableHead>
            <tr>
              <AdminTh>结果</AdminTh>
              <AdminTh>类型</AdminTh>
              <AdminTh align="right">点击</AdminTh>
              <AdminTh>最近点击</AdminTh>
              <AdminTh align="right">打开</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {summary.results.length > 0 ? (
              summary.results.map((result) => (
                <AdminTr key={`${result.kind}:${result.href}`}>
                  <AdminTd>
                    <span className="font-bold text-slate-950">
                      {result.title}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <AdminBadge>{resultKindLabel(result.kind)}</AdminBadge>
                  </AdminTd>
                  <AdminTd align="right">
                    <span className="font-bold tabular-nums">
                      {result.clickCount}
                    </span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-xs text-slate-500">
                      {formatDate(result.lastClickedAt)} UTC
                    </span>
                  </AdminTd>
                  <AdminTd align="right">
                    <AdminLink
                      href={result.href}
                      target="_blank"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      aria-label={`打开 ${result.title}`}
                      title={`打开 ${result.title}`}
                    >
                      <ArrowUpRight size={16} />
                    </AdminLink>
                  </AdminTd>
                </AdminTr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-sm text-slate-400"
                >
                  暂时还没有搜索结果点击。
                </td>
              </tr>
            )}
          </AdminTableBody>
        </AdminTable>
      </AdminTableShell>
      </div>
    </div>
  );
}
