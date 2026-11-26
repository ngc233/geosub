import GameOfferReview from "./GameOfferReview";
import AdminProductContext from "../../../components/admin/AdminProductContext";
import AdminTabs, { type AdminTabItem } from "@/components/admin/AdminTabs";
import AdminAlert from "@/components/admin/AdminAlert";
import { AdminLinkButton } from "@/components/admin/AdminButton";
import { adminPrisma as prisma } from "../../../lib/prisma";
import { getReviewPageData } from "./queries";
import { ReviewOverviewSections } from "./ReviewOverviewSections";
import { PendingProductReviewSection } from "./PendingProductReviewSection";
import { ReviewHistorySection } from "./ReviewHistorySection";

export const dynamic = "force-dynamic";

type ReviewTab = "pending" | "games" | "history";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    tab?: string;
    source?: string;
    gameView?: string;
    gamePage?: string;
    runId?: string;
    returnTo?: string;
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
    product?: string;
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
  const productQuery = String(params.product ?? params.q ?? "").trim().slice(0, 100);
  let exactProduct = String(params.product || "").trim().toLowerCase();
  if (!exactProduct && productQuery) {
    const exact = await prisma.product.findUnique({
      where: { slug: productQuery.toLowerCase() },
      select: { slug: true },
    });
    const found =
      exact ||
      (await prisma.product.findFirst({
        where: {
          OR: [
            { slug: { contains: productQuery, mode: "insensitive" } },
            { name: { contains: productQuery, mode: "insensitive" } },
          ],
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { slug: true },
      }));
    exactProduct = found?.slug || productQuery.toLowerCase();
  }

  const activeTab: ReviewTab =
    params.tab === "games" || params.source === "games"
      ? "games"
      : params.tab === "history" || params.showHistory === "1"
        ? "history"
        : "pending";

  const tabHref = (nextTab: ReviewTab) => {
    const query = new URLSearchParams();
    if (nextTab === "games") query.set("tab", "games");
    if (nextTab === "history") query.set("tab", "history");
    if (exactProduct || productQuery) query.set("product", exactProduct || productQuery);
    if (params.returnTo) query.set("returnTo", params.returnTo);
    const suffix = query.toString();
    return suffix ? `/admin/review?${suffix}` : "/admin/review";
  };

  if (activeTab === "games") {
    const requestedPage = Number(params.gamePage);
    const gameTabs: AdminTabItem[] = [
      { id: "pending", label: "订阅异常", href: tabHref("pending") },
      { id: "games", label: "游戏报价", href: tabHref("games") },
      { id: "history", label: "审核历史", href: tabHref("history") },
    ];
    return (
      <div className="space-y-6">
        <AdminTabs items={gameTabs} activeId="games" ariaLabel="异常审核视图" />
        <GameOfferReview
          product={exactProduct}
          history={params.gameView === "history"}
          page={Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1}
        />
      </div>
    );
  }

  const discoveryPromoted = params.discoveryPromoted === "1";
  const discoveryProduct = String(params.discoveryProduct ?? productQuery).trim();
  const discoveryJobs = Math.max(0, Number(params.discoveryJobs ?? 0) || 0);
  const pendingPage = Math.max(1, Number(params.page ?? 1) || 1);
  const historyPage = Math.max(1, Number(params.historyPage ?? 1) || 1);
  const detailProduct =
    activeTab === "history"
      ? ""
      : String(params.detailProduct || exactProduct || "").trim().toLowerCase();
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
    exactProduct,
    productQuery,
    discoveryProduct,
    discoveryJobs,
    pendingPage,
    historyPage,
    detailProduct,
    detailPage,
  });

  const contextProduct = selectedProductSlug
    ? await prisma.product.findUnique({
        where: { slug: selectedProductSlug },
        select: { id: true, slug: true, name: true },
      })
    : null;

  const reviewTabs: AdminTabItem[] = [
    {
      id: "pending",
      label: "订阅异常",
      href: tabHref("pending"),
      badge: pendingTotal > 0 ? pendingTotal : undefined,
    },
    { id: "games", label: "游戏报价", href: tabHref("games") },
    {
      id: "history",
      label: "审核历史",
      href: tabHref("history"),
      badge: historyTotal > 0 ? historyTotal : undefined,
    },
  ];

  const runsHref = exactProduct
    ? `/admin/pipeline?tab=runs&product=${encodeURIComponent(exactProduct)}`
    : "/admin/pipeline?tab=runs";

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
        productContext={
          contextProduct ? <AdminProductContext {...contextProduct} returnTo={params.returnTo} /> : null
        }
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

      <AdminTabs items={reviewTabs} activeId={activeTab} ariaLabel="异常审核视图" />

      {params.showRuns === "1" ? (
        <AdminAlert variant="info" title="采集运行记录已统一迁移至采集中心">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>实时进度、历史运行日志与失败排查现已全部收口在「采集中心 · 运行与任务」。</span>
            <AdminLinkButton href={runsHref} variant="secondary" size="sm">
              前往采集运行记录
            </AdminLinkButton>
          </div>
        </AdminAlert>
      ) : null}

      {activeTab === "history" ? (
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
      ) : (
        <PendingProductReviewSection
          collectorStatus={collectorStatus}
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
      )}
    </div>
  );
}
