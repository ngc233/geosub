import { ArrowUpRight } from "lucide-react";
import { AdminBadge } from "../../../components/admin/AdminBadge";
import {
  AdminButton,
  AdminLinkButton,
} from "../../../components/admin/AdminButton";
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
  buildAuthorityCoverageQueue,
} from "../../../lib/search-authority-coverage";
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";
import {
  startAuthorityCoverageTaskAction,
  updateAuthorityCoverageTaskAction,
} from "./actions";
import {
  authorityBusinessPresentation,
  authorityPriorityPresentation,
  authorityTaskPresentation,
} from "./presenters";
import type { SearchDemandPageData } from "./queries";

export function AuthorityCoverageSection({
  items,
  taskRecords,
  days,
}: {
  items: ReturnType<typeof buildAuthorityCoverageQueue>;
  taskRecords: SearchDemandPageData["authorityTaskRecords"];
  days: number;
}) {
  const taskByProductGap = new Map(
    taskRecords.map((record) => [
      `${record.productId}:${record.gapCode}`,
      record,
    ]),
  );
  const latestTaskByProduct = new Map<string, (typeof taskRecords)[number]>();
  for (const record of taskRecords) {
    if (!latestTaskByProduct.has(record.productId)) {
      latestTaskByProduct.set(record.productId, record);
    }
  }

  return (
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
    {items.slice(0, 20).map((item) => {
    const priority = authorityPriorityPresentation(item.priority);
    const task = item.gapCode
    ? taskByProductGap.get(`${item.productId}:${item.gapCode}`)
    : latestTaskByProduct.get(item.productId);
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
  );
}

