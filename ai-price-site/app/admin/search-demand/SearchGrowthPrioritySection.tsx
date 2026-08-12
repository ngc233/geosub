import AdminLink from "@/components/admin/AdminLink";
import { ArrowUpRight } from "lucide-react";
import { AdminBadge } from "../../../components/admin/AdminBadge";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
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
  buildSearchGrowthQueue,
  type SearchGapSuggestion,
} from "../../../lib/admin-search-demand";
import {
  normalizeSearchOpportunityQuery,
  type SearchOpportunityRecord,
} from "../../../lib/admin-search-opportunities";
import {
  growthFocusHref,
  growthPriorityPresentation,
  growthStagePresentation,
  type SearchGrowthFocus,
} from "./presenters";
import { SearchOpportunityActions } from "./SearchOpportunityWorkflowSections";

export function SearchGrowthPrioritySection({
  days,
  growthFocus,
  activeGrowthQueue,
  gapByQuery,
  workflowByQuery,
}: {
  days: number;
  growthFocus: SearchGrowthFocus;
  activeGrowthQueue: ReturnType<typeof buildSearchGrowthQueue>;
  gapByQuery: Map<string, SearchGapSuggestion>;
  workflowByQuery: Map<string, SearchOpportunityRecord>;
}) {
  return (
    <>
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

    </>
  );
}
