import type { ReactNode } from "react";
import AdminPipelineSteps from "@/components/admin/AdminPipelineSteps";
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
  returnTo,
}: ReviewOverviewSectionsProps) {
  const hasSelectedProduct = Boolean(
    discoveryPromoted || selectedProductCollector,
  );
  const tone = getCollectionStatusTone(collectionRun);
  return (
    <>
      <AdminPageHeader
        eyebrow="价格工作流"
        title="异常审核"
        description="稳定价格通过验证后自动写入正式库；这里处理未通过的记录。"
      />
      <AdminPipelineSteps
        currentStep="review"
        productSlug={productQuery || undefined}
        returnTo={returnTo}
      />
      {productContext}
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
              placeholder="产品名称或 slug"
              className={`${adminControlClassName} h-11 w-full px-3`}
            />
          </label>
          <AdminButton type="submit">筛选</AdminButton>
          {productQuery ? (
            <AdminLinkButton href="/admin/review" variant="secondary">
              清除
            </AdminLinkButton>
          ) : null}
        </form>
        {hasSelectedProduct ? (
          <div className="mt-4 border-t border-admin-border pt-3 text-sm text-admin-text-secondary">
            <p className="font-semibold text-admin-text">
              {selectedProductName || selectedProductSlug} · {pendingTotal}{" "}
              条待审
            </p>
            <p className="mt-1 text-xs leading-5 text-admin-text-muted">
              {selectedProductCollector?.latest_run_status === "running"
                ? "采集仍在运行，请查看本次进度；不要重复提交。"
                : pendingTotal > 0
                  ? "展开产品查看当前页异常与证据，修正规则或按需补采。"
                  : "本页没有待审异常，可直接查看正式价格。"}
            </p>
            {selectedAppStoreJobCount === 0 ? (
              <AdminLink
                href={productWorkflowHref(
                  "/admin/collector-jobs",
                  selectedProductSlug,
                )}
                className="mt-2 inline-flex min-h-11 items-center text-admin-accent"
              >
                查看来源验证
              </AdminLink>
            ) : null}
          </div>
        ) : productQuery ? (
          <p className="mt-3 text-sm text-admin-text-muted">
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
      <details className="rounded-admin-card border border-admin-border bg-admin-surface">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-admin-text">
          说明
        </summary>
        <div className="space-y-3 border-t border-admin-border p-4 text-sm leading-6 text-admin-text-muted">
          <p>
            此列表按 App Store
            异常口径展示。补采不会跳过稳定样本、硬异常和独立证据门禁；无需逐国人工核验。官网记录在来源页核对。
          </p>
          <p>
            产品资料与文章的发布状态单独管理。人工覆盖只在已有独立结算证据时使用。
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt>待审</dt>
              <dd>{pendingTotal}</dd>
            </div>
            <div>
              <dt>已通过</dt>
              <dd>{approvedCount}</dd>
            </div>
            <div>
              <dt>已忽略</dt>
              <dd>{ignoredCount}</dd>
            </div>
            <div>
              <dt>已拒绝</dt>
              <dd>{rejectedCount}</dd>
            </div>
          </dl>
          {latestAutoReview ? (
            <p>
              最近自动审核：{latestAutoReview.status}；
              {latestAutoReview.dry_run ? "仅预检" : "正式执行"}，通过{" "}
              {latestAutoReview.auto_approved_count} 条。
            </p>
          ) : null}
        </div>
      </details>
    </>
  );
}
