import { ArrowUpRight } from "lucide-react";
import { AdminBadge } from "../../../components/admin/AdminBadge";
import { AdminButton, AdminLinkButton } from "../../../components/admin/AdminButton";
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
} from "../../../components/admin/AdminTable";
import type { SearchConversionTerm } from "../../../lib/admin-search-demand";
import { normalizeSearchOpportunityQuery } from "../../../lib/admin-search-opportunities";
import { searchConversionRepairKey } from "../../../lib/admin-search-conversion-repairs";
import {
  blockerSeverityPresentation,
  formatDate,
  repairBlockerLabel,
  repairEffectPresentation,
  repairStatusPresentation,
} from "./presenters";
import type { SearchDemandPageData } from "./queries";
import {
  startSearchConversionRepairAction,
  updateSearchConversionRepairAction,
} from "./actions";

export function ConversionRepairSections({
  days,
  conversionDiagnostics,
  repairRecords,
  conversionTermByTarget,
  repairByKey,
}: {
  days: number;
  conversionDiagnostics: SearchDemandPageData["conversionDiagnostics"];
  repairRecords: SearchDemandPageData["repairRecords"];
  conversionTermByTarget: Map<string, SearchConversionTerm>;
  repairByKey: Map<string, SearchDemandPageData["repairRecords"][number]>;
}) {
  return (
    <>
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

    </>
  );
}