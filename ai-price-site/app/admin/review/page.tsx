import LazyReviewDetails from "./LazyReviewDetails";
import { getCollectorRunHistoryRows } from "./collector-run-history-query";
import AdminProductContext from "../../../components/admin/AdminProductContext";
import { prisma } from "../../../lib/prisma";
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
    runId?:string;
    returnTo?:string;
    detailProduct?: string;
    detailPage?: string;
    collectionQueued?: string;
    collectionRun?: string;
    collectionScope?: string;
    discoveryPromoted?: string;
    discoveryProduct?: string;
    discoveryJobs?: string;
    page?: string;
    historyPage?: string;
    product?:string;
    q?: string;
    showHistory?: string;
    showRuns?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const queuedCount =
    params.collectionQueued === undefined ? null : Number(params.collectionQueued);
  const collectionRun = params.collectionRun ?? null;
  const collectionScope = params.collectionScope ?? null;
  const productQuery = String(params.product ?? params.q ?? "").trim().slice(0,100);
  let exactProduct=String(params.product || "").trim().toLowerCase();
  if(!exactProduct && productQuery){
    const exact=await prisma.product.findUnique({where:{slug:productQuery.toLowerCase()},select:{slug:true}});
    const found=exact || await prisma.product.findFirst({where:{OR:[
      {slug:{contains:productQuery,mode:"insensitive"}},
      {name:{contains:productQuery,mode:"insensitive"}}
    ]},orderBy:[{sortOrder:"asc"},{name:"asc"}],select:{slug:true}});
    exactProduct=found?.slug || productQuery.toLowerCase();
  }
  const discoveryPromoted = params.discoveryPromoted === "1";
  const discoveryProduct = String(params.discoveryProduct ?? productQuery).trim();
  const discoveryJobs = Math.max(0, Number(params.discoveryJobs ?? 0) || 0);
  const pendingPage = Math.max(1, Number(params.page ?? 1) || 1);
  const historyPage = Math.max(1, Number(params.historyPage ?? 1) || 1);
  const showHistory = params.showHistory === "1";
  const showRuns = params.showRuns === "1";
  const detailProduct = showHistory || showRuns ? "" : String(params.detailProduct || exactProduct || "").trim().toLowerCase();
  function sectionHref(section: "showHistory" | "showRuns") {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    );
    for (const key of ["showHistory", "showRuns", "detailProduct", "detailPage"]) query.delete(key);
    query.set(section, "1");
    return `/admin/review?${query}#review-${section}`;
  }
  const detailPage = Math.max(1, Number.parseInt(params.detailPage || "1", 10) || 1);
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
    exactProduct,
    productQuery,
    discoveryProduct,
    discoveryJobs,
    pendingPage,
    historyPage,
    detailProduct,
    detailPage,
  });

  const runId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.runId || "") ? params.runId! : null;
  const scopedRuns=runId ? await getCollectorRunHistoryRows(productQuery,12,{product:exactProduct || collectionScope || productQuery,runId}) : collectorRunHistoryRows;
  const contextProduct = selectedProductSlug ? await prisma.product.findUnique({where:{slug:selectedProductSlug},select:{id:true,slug:true,name:true}}) : null;
  const showLiveRun=Boolean(runId || collectionRun || scopedRuns.some(row=>row.status==="running"));
  const runSection=(
      <CollectionRunHistorySection
        key={`${productQuery || "all-products"}:${runId || "latest"}`}
        pendingCount={pendingTotal}
        productSlug={contextProduct?.slug}
        runId={runId}
        returnTo={params.returnTo}
        rows={scopedRuns}
        collectionRun={collectionRun}
        collectionScope={collectionScope}
        productQuery={exactProduct || productQuery}
      />

  );
  return (
    <div className="space-y-6">
      <ReviewOverviewSections
        productQuery={exactProduct || productQuery}
        returnTo={params.returnTo}
        discoveryPromoted={discoveryPromoted}
        selectedProductCollector={selectedProductCollector}
        selectedProductName={selectedProductName}
        selectedProductSlug={selectedProductSlug}
        selectedAppStoreJobCount={selectedAppStoreJobCount}
        pendingTotal={pendingTotal}
        approvedCount={approvedCount}
        productContext={contextProduct ? <AdminProductContext {...contextProduct} returnTo={params.returnTo} /> : null}
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

      {showLiveRun ? runSection : null}

      <PendingProductReviewSection
        productQuery={exactProduct || productQuery}
        pendingPage={pendingPage}
        detailProduct={detailProduct}
        detailPage={detailPage}
        returnTo={params.returnTo}
        pendingTotalPages={pendingTotalPages}
        detailRowsPerProduct={detailRowsPerProduct}
        detailRowsLimited={detailRowsLimited}
        pendingProductTotal={pendingProductTotal}
        pendingTotal={pendingTotal}
        historyPage={historyPage}
        pendingProductGroups={pendingProductGroups}
      />

      {!showLiveRun ? (
        <LazyReviewDetails key={`runs:${showRuns}`} id="review-showRuns" loadHref={sectionHref("showRuns")}
          loaded={showRuns} initiallyOpen={showRuns} summary={
            <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-admin-text">
              采集运行记录 · {scopedRuns.length} 条最近记录
            </summary>
          }>
          {showRuns ? runSection : null}
        </LazyReviewDetails>
      ) : null}

      <LazyReviewDetails key={`history:${showHistory}`} id="review-showHistory" loadHref={sectionHref("showHistory")}
        loaded={showHistory} initiallyOpen={showHistory} summary={
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-admin-card
            border border-admin-border bg-admin-surface px-4 py-3 text-sm font-semibold text-admin-text">
            <span>查看以前的审核记录</span>
            <span className="shrink-0 whitespace-nowrap text-xs font-medium text-admin-text-faint">共 {historyTotal} 条</span>
          </summary>
        }>
        {showHistory ? <div className="mt-3">
          <ReviewHistorySection
            historyRows={historyRows}
            historyPage={historyPage}
            historyTotalPages={historyTotalPages}
            historyPageSize={historyPageSize}
            historyTotal={historyTotal}
            pendingPage={pendingPage}
            productQuery={exactProduct || productQuery}
            returnTo={params.returnTo}
          />
        </div> : null}
      </LazyReviewDetails>
    </div>
  );
}
