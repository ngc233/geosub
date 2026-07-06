import Link from "next/link";
import {
  formatDate,
  formatLocal,
  formatUsd,
  platformLabel,
  statusBadge,
  statusLabel,
} from "./review-display";
import { getReviewPageData } from "./queries";
import { ReviewOverviewSections } from "./ReviewOverviewSections";
import { PendingProductReviewSection } from "./PendingProductReviewSection";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    collectionQueued?: string;
    collectionRun?: string;
    collectionScope?: string;
    discoveryPromoted?: string;
    discoveryProduct?: string;
    discoveryJobs?: string;
    page?: string;
    historyPage?: string;
    q?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const queuedCount =
    params.collectionQueued === undefined ? null : Number(params.collectionQueued);
  const collectionRun = params.collectionRun ?? null;
  const collectionScope = params.collectionScope ?? null;
  const productQuery = String(params.q ?? "").trim();
  const discoveryPromoted = params.discoveryPromoted === "1";
  const discoveryProduct = String(params.discoveryProduct ?? productQuery).trim();
  const discoveryJobs = Math.max(0, Number(params.discoveryJobs ?? 0) || 0);
  const pendingPage = Math.max(1, Number(params.page ?? 1) || 1);
  const historyPage = Math.max(1, Number(params.historyPage ?? 1) || 1);
  const {
    pendingPageSize,
    historyPageSize,
    pendingProductTotal,
    pendingTotal,
    pendingTotalPages,
    historyTotal,
    historyTotalPages,
    approvedCount,
    ignoredCount,
    rejectedCount,
    collectorStatus,
    latestAutoReview,
    selectedProductCollector,
    selectedProductName,
    selectedProductSlug,
    selectedAppStoreJobCount,
    evidenceHealth,
    topPendingReason,
    diagnosisProductCount,
    diagnosisPlanCount,
    pendingDiagnosisRows,
    evidenceSummaryRows,
    historyRows,
    autoReviewReasonRows,
    pendingProductGroups,
  } = await getReviewPageData({
    productQuery,
    discoveryProduct,
    discoveryJobs,
    pendingPage,
    historyPage,
  });

  const buildPageHref = ({
    page = pendingPage,
    nextHistoryPage = historyPage,
  }: {
    page?: number;
    nextHistoryPage?: number;
  }) => {
    const query = new URLSearchParams();

    if (page > 1) query.set("page", String(page));
    if (nextHistoryPage > 1) query.set("historyPage", String(nextHistoryPage));
    if (productQuery) query.set("q", productQuery);

    const value = query.toString();
    return value ? `/admin/review?${value}` : "/admin/review";
  };

  return (
    <div className="space-y-6">
      <ReviewOverviewSections
        discoveryPromoted={discoveryPromoted}
        selectedProductCollector={selectedProductCollector}
        selectedProductName={selectedProductName}
        selectedProductSlug={selectedProductSlug}
        selectedAppStoreJobCount={selectedAppStoreJobCount}
        pendingTotal={pendingTotal}
        approvedCount={approvedCount}
        ignoredCount={ignoredCount}
        rejectedCount={rejectedCount}
        queuedCount={queuedCount}
        collectionRun={collectionRun}
        collectionScope={collectionScope}
        latestAutoReview={latestAutoReview}
        autoReviewReasonRows={autoReviewReasonRows}
        diagnosisProductCount={diagnosisProductCount}
        diagnosisPlanCount={diagnosisPlanCount}
        topPendingReason={topPendingReason}
        pendingDiagnosisRows={pendingDiagnosisRows}
        evidenceHealth={evidenceHealth}
        evidenceSummaryRows={evidenceSummaryRows}
      />

      <PendingProductReviewSection
        collectorStatus={collectorStatus}
        productQuery={productQuery}
        pendingPage={pendingPage}
        pendingTotalPages={pendingTotalPages}
        pendingPageSize={pendingPageSize}
        pendingProductTotal={pendingProductTotal}
        pendingTotal={pendingTotal}
        historyPage={historyPage}
        pendingProductGroups={pendingProductGroups}
      />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">最近审核历史</h2>
            <p className="mt-1 text-xs text-slate-500">
              按时间倒序分页显示已通过、已忽略或已拒绝记录。当前第 {historyPage} / {historyTotalPages} 页，每页 {historyPageSize} 条。
            </p>
          </div>
        </div>

        {historyRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            暂无审核历史。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">产品</th>
                  <th className="px-4 py-3 font-medium">套餐</th>
                  <th className="px-4 py-3 font-medium">地区</th>
                  <th className="px-4 py-3 font-medium">平台</th>
                  <th className="px-4 py-3 font-medium">观测价</th>
                  <th className="px-4 py-3 font-medium">审核状态</th>
                  <th className="px-4 py-3 font-medium">正式表</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {historyRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.product_name ?? row.product_slug}</div>
                      <div className="text-xs text-slate-500">{row.product_slug}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.plan_name ?? row.plan_slug}</div>
                      <div className="text-xs text-slate-500">{row.plan_slug}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.country_name_zh ?? row.country_name_en ?? row.country_code}</div>
                      <div className="text-xs text-slate-500">{row.country_code}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {platformLabel(row.platform)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">
                        {row.observed_price_text ?? formatLocal(row.observed_local_price, row.observed_currency)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatUsd(row.observed_price_usd)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadge(row.review_status)}`}>
                        {statusLabel(row.review_status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.region_price_status ? (
                        <div>
                          <div className="font-medium text-slate-900">{row.region_price_status}</div>
                          <div>{row.promoted_platform ?? "—"} · {row.promoted_data_quality ?? "—"}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">未写入</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(row.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyTotalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">共 {historyTotal} 条审核历史</div>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref({ nextHistoryPage: Math.max(1, historyPage - 1) })}
                aria-disabled={historyPage <= 1}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  historyPage <= 1
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                上一页
              </Link>
              <span className="text-slate-500">
                {historyPage} / {historyTotalPages}
              </span>
              <Link
                href={buildPageHref({ nextHistoryPage: Math.min(historyTotalPages, historyPage + 1) })}
                aria-disabled={historyPage >= historyTotalPages}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  historyPage >= historyTotalPages
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                下一页
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
