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
import type { SearchOpportunityRecord } from "../../../lib/admin-search-opportunities";
import {
  conversionPresentation,
  effectPresentation,
  formatDate,
  gapKindLabel,
} from "./presenters";
import type { SearchDemandPageData } from "./queries";
import { updateSearchOpportunityAction } from "./actions";

export function SearchConversionSections({
  days,
  summary,
  effectWorkflow,
  resolvableCount,
  improvingEffectCount,
  reopenCount,
  pendingEffectCount,
}: {
  days: number;
  summary: SearchDemandPageData["summary"];
  effectWorkflow: SearchOpportunityRecord[];
  resolvableCount: number;
  improvingEffectCount: number;
  reopenCount: number;
  pendingEffectCount: number;
}) {
  return (
    <>
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
                        <span className="font-bold text-slate-950 dark:text-slate-50">
                          {term.query}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-400">
                          {term.visitorCount} 位访客 · 最近{" "}
                          {formatDate(term.lastClickedAt)} UTC
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
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
                    <span className="text-sm text-slate-400 dark:text-slate-400">
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
                        <span className="font-bold text-slate-950 dark:text-slate-50">
                          {record.query}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-400">
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
                          <span className="max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {effect.helper}
                          </span>
                        </div>
                      </AdminTd>
                      <AdminTd>
                        <span className="block text-xs text-slate-600 dark:text-slate-300">
                          搜索 {record.effectSearchCount} 次 · 无结果{" "}
                          {record.effectNoResultCount} 次
                        </span>
                        <span className="mt-1 block text-xs text-slate-400 dark:text-slate-400">
                          点击 {record.effectClickCount} 次 ·{" "}
                          {record.effectVisitorCount} 位访客
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
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
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-400">
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

    </>
  );
}
