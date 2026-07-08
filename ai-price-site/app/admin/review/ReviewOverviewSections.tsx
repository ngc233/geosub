import Link from "next/link";
import { Archive, CheckCircle2, Clock3, XCircle } from "lucide-react";
import AdminMetricCard from "../../../components/admin/AdminMetricCard";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import AdminStatusNotice, {
  type AdminStatusNoticeVariant,
} from "../../../components/admin/AdminStatusNotice";
import ManualCollectionProgressForm from "./ManualCollectionProgressForm";
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
import {
  evidenceBadgeClass,
  evidenceStatusLabel,
  evidenceTierLabel,
  formatDate,
  formatUsd,
  toNumber,
} from "./review-display";
import { reviewReasonAction, reviewReasonLabel } from "./review-reason-copy";

function collectionStatusVariant(status: string | null | undefined): AdminStatusNoticeVariant {
  const tone = getCollectionStatusTone(status);
  return tone === "error" ? "danger" : tone;
}

type ReviewOverviewSectionsProps = {
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
};

export function ReviewOverviewSections({
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
  autoReviewReasonRows,
  diagnosisProductCount,
  diagnosisPlanCount,
  topPendingReason,
  pendingDiagnosisRows,
  evidenceHealth,
  evidenceSummaryRows,
}: ReviewOverviewSectionsProps) {
  const hasSelectedProduct = discoveryPromoted || selectedProductCollector;

  return (
    <>
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          价格采集 · 第 2 步
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          价格采集审核
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          这里是主工作台：按产品启动 App Store 采集，系统随后自动审核稳定价格；异常、缺样本或冲突数据只在这里集中解释。
        </p>
      </header>

      <AdminPipelineSteps currentStep="review" />

      {hasSelectedProduct ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                {discoveryPromoted ? "刚从线索入口加入" : "产品采集入口"}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-950">
                {selectedProductName || "这个产品"} 已进入服务库
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedAppStoreJobCount > 0
                  ? `已准备 ${selectedAppStoreJobCount} 个 App Store 采集任务。现在可以直接跑一次采集，完成后系统会自动审核并把稳定价格写入正式库。`
                  : "还没有识别到 App Store 采集任务。请先回产品库补充 App Store 链接或应用 ID，再回来采集。"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ManualCollectionProgressForm
                productSlug={selectedProductSlug}
                buttonLabel={`立即采集 ${selectedProductName || "该产品"}`}
                pendingLabel="正在采集并审核"
                disabled={!selectedProductSlug || selectedAppStoreJobCount <= 0}
              />
              <Link
                href="/admin/products"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                查看服务库
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <AdminMetricCard
          label="待处理观测"
          value={pendingTotal}
          helper="等待自动补采或规则复核"
          icon={Clock3}
          variant="warning"
        />
        <AdminMetricCard
          label="已通过"
          value={approvedCount}
          helper="已进入正式价格库"
          icon={CheckCircle2}
          variant="success"
        />
        <AdminMetricCard
          label="已忽略"
          value={ignoredCount}
          helper="旧样本或被新共识覆盖"
          icon={Archive}
        />
        <AdminMetricCard
          label="已拒绝"
          value={rejectedCount}
          helper="明确不可用的记录"
          icon={XCircle}
          variant="danger"
        />
      </section>

      <AdminStatusNotice title="采集和审核已合并到这个工作台" variant="info">
        补采不再默认扫描全部产品。请在下方按产品点击“只补采这个产品”；系统会跳过 12 小时内已经成功采集过的 App Store
        任务，避免重复请求。
      </AdminStatusNotice>

      {queuedCount !== null ? (
        <AdminStatusNotice title="采集状态" variant={collectionStatusVariant(collectionRun)}>
          {getCollectionStatusMessage({
            queuedCount,
            collectionRun,
            collectionScope,
          })}
        </AdminStatusNotice>
      ) : null}

      {latestAutoReview ? (
        <section
          className={[
            "overflow-hidden rounded-xl border bg-white shadow-sm",
            latestAutoReview.status === "failed"
              ? "border-red-200"
              : latestAutoReview.dry_run
                ? "border-amber-200"
                : "border-emerald-200",
          ].join(" ")}
        >
          <div
            className={[
              "flex flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:justify-between",
              latestAutoReview.status === "failed"
                ? "bg-red-50"
                : latestAutoReview.dry_run
                  ? "bg-amber-50"
                  : "bg-emerald-50",
            ].join(" ")}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-950">最新审核结果</h2>
                <span
                  className={[
                    "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                    latestAutoReview.status === "failed"
                      ? "bg-red-100 text-red-700 ring-red-200"
                      : latestAutoReview.dry_run
                        ? "bg-amber-100 text-amber-800 ring-amber-200"
                        : "bg-emerald-100 text-emerald-700 ring-emerald-200",
                  ].join(" ")}
                >
                  {latestAutoReview.status === "failed"
                    ? "执行失败"
                    : latestAutoReview.dry_run
                      ? "仅预检，未入库"
                      : "已真实入库"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {latestAutoReview.dry_run
                  ? "这次只计算了可通过数量，没有写入正式价格。现在按钮已改为真实审核。"
                  : "自动通过的观测已写入正式价格库；未通过的会进入自动补采、隔离或等待稳定，不再要求逐条人工核验。"}
              </p>
              {latestAutoReview.error_message ? (
                <p className="mt-2 text-xs font-medium text-red-700">{latestAutoReview.error_message}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center md:min-w-[360px]">
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">检查组</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
                  {latestAutoReview.checked_groups}
                </div>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">正式入库</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">
                  {latestAutoReview.dry_run ? 0 : latestAutoReview.auto_approved_count}
                </div>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">需继续观察</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-amber-700">
                  {latestAutoReview.manual_review_count}
                </div>
              </div>
            </div>
          </div>

          {autoReviewReasonRows.length > 0 ? (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {autoReviewReasonRows.map((row) => (
                <div key={`${row.decision}-${row.reason_code}`} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        {reviewReasonLabel(row.reason_code)}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {reviewReasonAction(row.reason_code)}
                      </div>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        row.decision === "auto_approve"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200",
                      ].join(" ")}
                    >
                      {row.decision === "auto_approve" ? "可自动过" : "被拦住"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span>{row.group_count} 组</span>
                    <span>{row.observation_count} 条观测</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">为什么还有这么多没有正式上线？</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                这里不是普通队列，而是“自动审核不敢直接上线”的异常池。当前主要集中在{" "}
                <span className="font-semibold text-slate-950">
                  {diagnosisProductCount} 个产品、{diagnosisPlanCount} 个套餐
                </span>
                ；系统已经把稳定样本写入正式库，剩下的是被保护规则拦住、等待补采或交叉验证的项目。
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                换句话说，数量多不是因为审核没跑，而是因为这些价格碰到了保护规则。正常处理方式是继续自动补采和规则校验；人工通过只作为极少数强制覆盖。
              </p>
            </div>
            {topPendingReason ? (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 md:min-w-[280px]">
                <div className="text-xs font-medium text-amber-700">最大阻塞原因</div>
                <div className="mt-1 font-semibold">{reviewReasonLabel(topPendingReason.reason_code)}</div>
                <div className="mt-1 text-xs leading-5 text-amber-700">
                  {topPendingReason.row_count} 条，涉及 {topPendingReason.country_count} 个地区
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {pendingDiagnosisRows.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingDiagnosisRows.map((row) => (
              <div
                key={`${row.product_slug}-${row.plan_slug}-${row.reason_code}`}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {row.product_name ?? row.product_slug}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.plan_name ?? row.plan_slug} · {row.country_count} 个地区
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                    {row.row_count} 条
                  </span>
                </div>
                <div className="mt-3 rounded-md bg-slate-50 px-2.5 py-2">
                  <div className="text-xs font-semibold text-slate-700">
                    {reviewReasonLabel(row.reason_code)}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {reviewReasonAction(row.reason_code)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>异常折算范围（未入正式库）</span>
                  <span className="font-medium text-slate-700">
                    {formatUsd(row.min_usd)} - {formatUsd(row.max_usd)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            当前没有需要解释的异常待审记录。
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-950">价格证据质量概览</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            最近 14 天的采集证据按状态归类。这里看的不是竞站是否一致，而是我们自己的证据链强弱。
          </p>
        </div>

        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-4">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 ring-1 ring-inset ring-emerald-100">
            <div className="text-xs font-medium text-emerald-700">页面多数票</div>
            <div className="mt-1 text-xl font-semibold text-emerald-950">
              {evidenceHealth.modal_consensus_count}
            </div>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-3 ring-1 ring-inset ring-red-100">
            <div className="text-xs font-medium text-red-700">系统隔离</div>
            <div className="mt-1 text-xl font-semibold text-red-950">
              {evidenceHealth.blocked_anomaly_count}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-inset ring-slate-200">
            <div className="text-xs font-medium text-slate-600">旧样本</div>
            <div className="mt-1 text-xl font-semibold text-slate-950">
              {evidenceHealth.old_sample_count}
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-3 ring-1 ring-inset ring-amber-100">
            <div className="text-xs font-medium text-amber-700">汇率过期</div>
            <div className="mt-1 text-xl font-semibold text-amber-950">
              {evidenceHealth.stale_fx_count}
            </div>
          </div>
        </div>

        {evidenceSummaryRows.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {evidenceSummaryRows.map((row) => (
              <div
                key={`${row.evidence_status}-${row.evidence_tier}`}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      {evidenceStatusLabel(row.evidence_status)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {evidenceTierLabel(row.evidence_tier)}
                    </div>
                  </div>
                  <span
                    className={[
                      "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                      evidenceBadgeClass(row.evidence_status),
                    ].join(" ")}
                  >
                    {row.observation_count} 条
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{row.country_count} 个地区</span>
                  <span>均分 {toNumber(row.average_score)?.toFixed(1) ?? "-"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  最近：{formatDate(row.latest_observed_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            最近 14 天暂无采集证据。
          </div>
        )}
      </section>
    </>
  );
}
