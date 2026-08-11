import { getReviewPageData } from "./queries";
import { ReviewOverviewSections } from "./ReviewOverviewSections";
import { PendingProductReviewSection } from "./PendingProductReviewSection";
import { ReviewHistorySection } from "./ReviewHistorySection";
import CollectionRunHistorySection from "./CollectionRunHistorySection";

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
    historyPageSize,
    detailRowsPerProduct,
    detailRowsLimited,
    pendingProductTotal,
    pendingTotal,
    pendingTotalPages,
    historyTotal,
    historyTotalPages,
    approvedCount,
    ignoredCount,
    rejectedCount,
    collectorStatus,
    collectorRunHistoryRows,
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

  return (
    <div className="space-y-6">
      <ReviewOverviewSections
        productQuery={productQuery}
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

      <CollectionRunHistorySection
        key={productQuery || "all-products"}
        rows={collectorRunHistoryRows}
        collectionRun={collectionRun}
        collectionScope={collectionScope}
        productQuery={productQuery}
      />

      <PendingProductReviewSection
        collectorStatus={collectorStatus}
        productQuery={productQuery}
        pendingPage={pendingPage}
        pendingTotalPages={pendingTotalPages}
        detailRowsPerProduct={detailRowsPerProduct}
        detailRowsLimited={detailRowsLimited}
        pendingProductTotal={pendingProductTotal}
        pendingTotal={pendingTotal}
        historyPage={historyPage}
        pendingProductGroups={pendingProductGroups}
      />

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <span>查看以前的审核记录</span>
          <span className="text-xs font-medium text-slate-400">共 {historyTotal} 条</span>
        </summary>
        <div className="mt-3">
          <ReviewHistorySection
            historyRows={historyRows}
            historyPage={historyPage}
            historyTotalPages={historyTotalPages}
            historyPageSize={historyPageSize}
            historyTotal={historyTotal}
            pendingPage={pendingPage}
            productQuery={productQuery}
          />
        </div>
      </details>
    </div>
  );
}
