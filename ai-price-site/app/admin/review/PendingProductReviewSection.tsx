import AdminLink from "@/components/admin/AdminLink";
import ManualCollectionProgressForm from "./ManualCollectionProgressForm";
import ObservationReviewActions from "./ObservationReviewActions";
import {
  diagnosePendingProductGroup,
  type PendingProductDiagnosisLevel,
} from "./pending-product-diagnosis";
import type { CollectorStatusRow, PendingProductGroup } from "./types";
import {
  PriceEvidencePanel,
  formatDate,
  formatLocal,
  formatUsd,
  platformLabel,
} from "./review-display";
import { reviewReasonAction, reviewReasonLabel } from "./review-reason-copy";

type PendingProductReviewSectionProps = {
  collectorStatus: CollectorStatusRow | null;
  productQuery: string;
  pendingPage: number;
  pendingTotalPages: number;
  detailRowsPerProduct: number;
  detailRowsLimited: boolean;
  pendingProductTotal: number;
  pendingTotal: number;
  historyPage: number;
  pendingProductGroups: PendingProductGroup[];
};

function diagnosisClassName(level: PendingProductDiagnosisLevel) {
  if (level === "danger") {
    return "border-red-100 bg-red-50 text-red-950";
  }

  if (level === "warning") {
    return "border-amber-100 bg-amber-50 text-amber-950";
  }

  if (level === "good") {
    return "border-emerald-100 bg-emerald-50 text-emerald-950";
  }

  return "border-blue-100 bg-blue-50 text-blue-950";
}

function collectorStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "采集服务正常",
    paused: "采集服务已暂停",
    disabled: "采集服务已停用",
    archived: "采集服务已停用",
  };

  return labels[status] ?? "采集服务状态待确认";
}

export function PendingProductReviewSection({
  collectorStatus,
  productQuery,
  pendingPage,
  pendingTotalPages,
  detailRowsPerProduct,
  detailRowsLimited,
  pendingProductTotal,
  pendingTotal,
  historyPage,
  pendingProductGroups,
}: PendingProductReviewSectionProps) {
  const buildPendingPageHref = (nextPage: number) => {
    const query = new URLSearchParams();

    if (nextPage > 1) query.set("page", String(nextPage));
    if (historyPage > 1) query.set("historyPage", String(historyPage));
    if (productQuery) query.set("q", productQuery);

    const value = query.toString();
    return value ? `/admin/review?${value}` : "/admin/review";
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold text-blue-700">第 3 步</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">需要系统继续处理的产品</h2>
          <p className="mt-1 text-xs text-slate-500">
            这里只列出尚未自动确认的产品。通常点击“重新采集”即可，不需要逐个国家人工核验。
          </p>
          {detailRowsLimited ? (
            <p className="mt-1 text-xs text-slate-400">展开产品后显示最近 {detailRowsPerProduct} 条异常明细。</p>
          ) : null}
        </div>
        <div className="text-xs text-slate-400">
          {pendingProductTotal} 个产品 · {pendingTotal} 条待处理
          {collectorStatus ? ` · ${collectorStatusLabel(collectorStatus.status)}` : ""}
        </div>
      </div>

      {pendingProductGroups.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-500">
          暂无待审核价格观测。
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pendingProductGroups.map((productGroup) => {
            const diagnosis = diagnosePendingProductGroup(productGroup);
            const diagnosisClasses = diagnosisClassName(diagnosis.level);
            const buttonLabel = productGroup.hasFreshSuccess ? "仍要重新采集" : "重新采集";

            return (
              <details key={productGroup.productSlug} className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-4 px-4 py-4 hover:bg-slate-50 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">
                        {productGroup.productName ?? productGroup.productSlug}
                      </h3>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {productGroup.productSlug}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700 ring-1 ring-amber-100">
                        待处理 {productGroup.pendingCount ?? productGroup.rows.length}
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700 ring-1 ring-emerald-100">
                        已通过 {productGroup.approvedCount ?? 0}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      最近成功采集：{formatDate(productGroup.latestSuccessAt ?? null)}
                      {productGroup.hasFreshSuccess ? " · 12 小时内已更新" : ""}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{diagnosis.title}</p>
                    <p className="mt-1 text-xs text-slate-500">建议：{diagnosis.nextAction}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ManualCollectionProgressForm
                      productSlug={productGroup.productSlug}
                      buttonLabel={buttonLabel}
                      pendingLabel="正在补采这个产品"
                    />
                    <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 group-open:bg-slate-50">
                      查看详情
                    </span>
                  </div>
                </summary>

                <div className="bg-slate-50/60 px-4 pb-4">
                  <div className={`mb-3 rounded-xl border px-3 py-2 ${diagnosisClasses}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold">系统判断：{diagnosis.label}</span>
                      <AdminLink
                        href={`/admin/data-quality/${encodeURIComponent(productGroup.productSlug)}`}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                      >
                        打开数据诊断
                      </AdminLink>
                    </div>
                    <p className="mt-1 text-xs leading-5 opacity-80">{diagnosis.detail}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {productGroup.plans.map((planGroup) => (
                    <div
                      key={`${productGroup.productSlug}-${planGroup.planSlug}`}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {planGroup.planName ?? planGroup.planSlug}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {planGroup.planSlug} · 显示 {planGroup.rows.length} 条最新明细
                          </div>
                        </div>
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                          待审核 {planGroup.rows.length}
                        </span>
                      </div>

                      <div className="max-h-[560px] space-y-2 overflow-y-auto border-t border-slate-100 p-3">
                        {planGroup.rows.map((row) => (
                          <div key={row.id} className="rounded-lg border border-slate-100 bg-white p-2.5 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold text-slate-950">
                                  {row.country_name_zh ?? row.country_name_en ?? row.country_code}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                  <span>{row.country_code}</span>
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                                    {platformLabel(row.platform)}
                                  </span>
                                  <span>可信度 {row.confidence_score ?? "-"}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-semibold text-slate-950">
                                  {row.observed_price_text ?? formatLocal(row.observed_local_price, row.observed_currency)}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {formatUsd(row.observed_price_usd)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] leading-4 text-amber-800 ring-1 ring-inset ring-amber-100">
                              <div className="font-semibold">
                                拦截原因：{reviewReasonLabel(row.review_reason_code)}
                              </div>
                              <div className="mt-0.5 text-amber-700">
                                {reviewReasonAction(row.review_reason_code)}
                              </div>
                            </div>
                            <PriceEvidencePanel row={row} />

                            {row.review_note ? (
                              <p className="mt-1.5 line-clamp-1 text-[11px] leading-4 text-slate-400">
                                原始规则说明：{row.review_note}
                              </p>
                            ) : null}

                            <div className="mt-2 flex items-center justify-between gap-2">
                              {row.source_url ? (
                                <a
                                  href={row.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                  查看采集证据
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">无来源链接</span>
                              )}
                              <ObservationReviewActions observationId={row.id} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {pendingTotalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <div className="text-slate-500">
            共 {pendingProductTotal} 个产品，{pendingTotal} 条待处理观测
          </div>
          <div className="flex items-center gap-2">
            <AdminLink
              href={buildPendingPageHref(Math.max(1, pendingPage - 1))}
              aria-disabled={pendingPage <= 1}
              className={`rounded-lg border px-3 py-1.5 font-medium ${
                pendingPage <= 1
                  ? "pointer-events-none border-slate-100 text-slate-300"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              上一页
            </AdminLink>
            <span className="text-slate-500">
              {pendingPage} / {pendingTotalPages}
            </span>
            <AdminLink
              href={buildPendingPageHref(Math.min(pendingTotalPages, pendingPage + 1))}
              aria-disabled={pendingPage >= pendingTotalPages}
              className={`rounded-lg border px-3 py-1.5 font-medium ${
                pendingPage >= pendingTotalPages
                  ? "pointer-events-none border-slate-100 text-slate-300"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              下一页
            </AdminLink>
          </div>
        </div>
      ) : null}
    </section>
  );
}
