import { ArrowUpRight } from "lucide-react";
import { AdminBadge } from "../../../components/admin/AdminBadge";
import { AdminButton } from "../../../components/admin/AdminButton";
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
} from "../../../components/admin/AdminTable";
import type { SearchGapSuggestion } from "../../../lib/admin-search-demand";
import {
  normalizeSearchOpportunityQuery,
  type SearchOpportunityRecord,
} from "../../../lib/admin-search-opportunities";
import {
  formatDate,
  gapActionLabel,
  gapKindLabel,
  opportunityStatus,
} from "./presenters";
import {
  startSearchOpportunityAction,
  updateSearchOpportunityAction,
} from "./actions";
export function SearchOpportunityActions({
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


export function SearchOpportunityWorkflowSections({
  days,
  activeGapQueue,
  completedWorkflow,
  workflowByQuery,
  actionableCount,
  validationCount,
  observationCount,
}: {
  days: number;
  activeGapQueue: SearchGapSuggestion[];
  completedWorkflow: SearchOpportunityRecord[];
  workflowByQuery: Map<string, SearchOpportunityRecord>;
  actionableCount: number;
  validationCount: number;
  observationCount: number;
}) {
  return (
    <>
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

    </>
  );
}
