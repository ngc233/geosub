import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/AdminCard";
import { productWorkflowHref } from "@/lib/admin-product-next-action";
import { adminControlClassName } from "@/components/admin/admin-control";
import AdminLink from "@/components/admin/AdminLink";
import { AdminButton, AdminLinkButton } from "../../../components/admin/AdminButton";
import AdminStatusNotice from "../../../components/admin/AdminStatusNotice";
import {
  getCollectionStatusMessage,
  getCollectionStatusTone,
} from "./collection-status";
import type {
  AutoReviewReasonRow,
  AutoReviewRunRow,
  EvidenceHealthRow,
  EvidenceSummaryRow,
  PendingDiagnosisRow,
  SelectedProductCollectorRow,
} from "./types";

type ReviewOverviewSectionsProps = {
  productQuery: string;
  discoveryPromoted: boolean;
  selectedProductCollector: SelectedProductCollectorRow | null;
  selectedProductName: string;
  selectedProductSlug: string;
  selectedAppStoreJobCount: number;
  pendingTotal: number;
  approvedCount: number;
  ignoredCount: number;
  rejectedCount: number;
  queuedCount: number | null;
  collectionRun: string | null;
  collectionScope: string | null;
  latestAutoReview: AutoReviewRunRow | null;
  autoReviewReasonRows: AutoReviewReasonRow[];
  diagnosisProductCount: number;
  diagnosisPlanCount: number;
  topPendingReason: PendingDiagnosisRow | null;
  pendingDiagnosisRows: PendingDiagnosisRow[];
  evidenceHealth: EvidenceHealthRow;
  evidenceSummaryRows: EvidenceSummaryRow[];
  productContext?: ReactNode;
  returnTo?: string;
};

export function ReviewOverviewSections({
  productQuery,
  discoveryPromoted,
  selectedProductCollector,
  selectedProductName,
  selectedProductSlug,
  selectedAppStoreJobCount,
  pendingTotal,
  approvedCount,
  ignoredCount,
  rejectedCount,
  queuedCount,
  collectionRun,
  collectionScope,
  latestAutoReview,
  productContext,
}: ReviewOverviewSectionsProps) {
  const hasSelectedProduct = Boolean(discoveryPromoted || selectedProductCollector);
  const tone = getCollectionStatusTone(collectionRun);
  const runsHref = productQuery
    ? `/admin/pipeline?tab=runs&product=${encodeURIComponent(productQuery)}`
    : "/admin/pipeline?tab=runs";

  return (
    <>
      <AdminPageHeader
        eyebrow="价格运维 · 异常审核"
        title="异常审核台"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminLinkButton href={runsHref} variant="secondary" size="sm">
              采集运行记录
            </AdminLinkButton>
            <AdminLinkButton
              href={
                productQuery
                  ? `/admin/prices?product=${encodeURIComponent(productQuery)}`
                  : "/admin/prices"
              }
              variant="secondary"
              size="sm"
            >
              正式价格库
            </AdminLinkButton>
          </div>
        }
        description="专注价格变动与异常观测审批。稳定价格自动入库，这里仅处理未通过自动门禁的记录。"
      />

      {productContext}

      <div className="grid grid-cols-2 divide-y divide-admin-border rounded-admin-card border border-admin-border bg-admin-surface sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-admin-text-muted">待审异常</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-admin-warning">
            {pendingTotal}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-admin-text-muted">已通过</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-admin-success">
            {approvedCount}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-admin-text-muted">已忽略</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-admin-text">
            {ignoredCount}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-admin-text-muted">已拒绝</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-admin-danger">
            {rejectedCount}
          </div>
        </div>
      </div>

      <section className="rounded-admin-card border border-admin-border bg-admin-surface p-4">
        <form
          action="/admin/review#review-pending"
          className="flex flex-wrap items-end gap-2"
        >
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-medium text-admin-text-muted">
              按产品筛选异常
            </span>
            <input
              aria-label="按产品筛选异常"
              type="search"
              name="q"
              defaultValue={productQuery}
              maxLength={100}
              placeholder="输入产品名称或 slug"
              className={`${adminControlClassName} h-10 w-full px-3`}
            />
          </label>
          <AdminButton type="submit" size="sm">
            筛选
          </AdminButton>
          {productQuery ? (
            <AdminLinkButton href="/admin/review" variant="secondary" size="sm">
              清除
            </AdminLinkButton>
          ) : null}
        </form>

        {hasSelectedProduct ? (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-admin-border pt-3 text-sm">
            <div>
              <p className="font-semibold text-admin-text">
                {selectedProductName || selectedProductSlug} · {pendingTotal} 条待审
              </p>
              <p className="mt-0.5 text-xs leading-5 text-admin-text-muted">
                {selectedProductCollector?.latest_run_status === "running"
                  ? "采集仍在运行，可在采集中心查看实时进度；不要重复提交。"
                  : pendingTotal > 0
                    ? "展开下方产品查看当前页异常与证据，修正规则或按需补采。"
                    : "当前没有待审异常，可直接查看正式价格。"}
              </p>
            </div>
            {selectedAppStoreJobCount === 0 ? (
              <AdminLink
                href={productWorkflowHref("/admin/pipeline", selectedProductSlug, "", {
                  tab: "runs",
                })}
                className="text-xs font-medium text-admin-accent hover:underline"
              >
                查看官网来源验证
              </AdminLink>
            ) : null}
          </div>
        ) : productQuery ? (
          <p className="mt-3 text-xs text-admin-text-muted">
            未找到指定产品，不会显示其他产品的异常。
          </p>
        ) : null}
      </section>

      {queuedCount !== null ? (
        <AdminStatusNotice
          title="本轮采集状态"
          variant={tone === "error" ? "danger" : tone}
        >
          {getCollectionStatusMessage({
            queuedCount,
            collectionRun,
            collectionScope,
          })}
        </AdminStatusNotice>
      ) : null}

      {latestAutoReview ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-admin-card border border-admin-border bg-admin-surface-subtle px-4 py-2.5 text-xs text-admin-text-muted">
          <span>
            最近自动审核：<strong className="font-medium text-admin-text">{latestAutoReview.status}</strong>
            {" · "}
            {latestAutoReview.dry_run ? "仅预检" : "正式执行"}，自动通过{" "}
            <strong className="font-semibold tabular-nums text-admin-text">
              {latestAutoReview.auto_approved_count}
            </strong>{" "}
            条
          </span>
          <span>人工覆盖仅在已有独立结算证据时使用；官网记录在采集中心运行记录核对。</span>
        </div>
      ) : null}
    </>
  );
}
