import LazyReviewDetails from "./LazyReviewDetails";
import AdminProductLogo from "@/components/admin/AdminProductLogo";
import { productWorkflowHref } from "@/lib/admin-product-next-action";
import { withAdminReturnTo } from "@/lib/admin-workflow-context";
import { AdminLinkButton } from "@/components/admin/AdminButton";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminLink from "@/components/admin/AdminLink";
import ManualCollectionProgressForm from "./ManualCollectionProgressForm";
import ObservationReviewActions from "./ObservationReviewActions";
import { diagnosePendingProductGroup } from "./pending-product-diagnosis";
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
  detailProduct?: string;
  detailPage?: number;
  returnTo?: string;
};

export function PendingProductReviewSection({
  collectorStatus,
  productQuery,
  pendingPage,
  pendingTotalPages,
  detailRowsPerProduct,
  pendingProductTotal,
  pendingTotal,
  historyPage,
  pendingProductGroups,
  detailProduct = "",
  detailPage = 1,
  returnTo,
}: PendingProductReviewSectionProps) {
  function pendingHref(nextPage: number) {
    const query = new URLSearchParams();
    if (nextPage > 1) query.set("page", String(nextPage));
    if (historyPage > 1) query.set("historyPage", String(historyPage));
    if (productQuery) query.set("product", productQuery);
    if (returnTo) query.set("returnTo", returnTo);
    return `/admin/review${query.size ? `?${query}` : ""}`;
  }
  function detailHref(slug: string, nextPage = 1) {
    const url = new URL(pendingHref(pendingPage), "http://local.invalid");
    url.searchParams.set("detailProduct", slug);
    if (nextPage > 1) url.searchParams.set("detailPage", String(nextPage));
    return (
      url.pathname + url.search + `#review-product-${encodeURIComponent(slug)}`
    );
  }
  return (
    <section
      id="review-pending"
      className="scroll-mt-24 rounded-admin-card border border-admin-border bg-admin-surface shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-admin-text">待审异常</h2>
          <p className="mt-1 text-xs text-admin-text-muted">
            按产品查看拦截原因和证据，不需要逐个国家人工核验。展开后每页加载{" "}
            {detailRowsPerProduct} 条明细。
          </p>
        </div>
        <p className="text-xs text-admin-text-muted">
          {pendingProductTotal} 个产品 · {pendingTotal} 条待处理
          {collectorStatus
            ? ` · 采集服务${collectorStatus.status === "active" ? "正常" : "状态：" + collectorStatus.status}`
            : ""}
        </p>
      </div>
      <AdminPagination
        page={pendingPage}
        totalPages={pendingTotalPages}
        total={pendingProductTotal}
        pageSize={25}
        pageHref={(next) => `${pendingHref(next)}#review-pending`}
        ariaLabel="审核顶部分页"
        className="px-4 py-3"
      />
      {pendingProductGroups.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-admin-text-muted">
          暂无待审核价格观测。
        </div>
      ) : (
        <div className="divide-y divide-admin-border">
          {pendingProductGroups.map((productGroup) => {
            const diagnosis = diagnosePendingProductGroup(productGroup);
            const loaded = detailProduct === productGroup.productSlug;
            const total = productGroup.pendingCount || 0;
            return (
              <LazyReviewDetails
                key={`${productGroup.productSlug}:${loaded}`}
                id={`review-product-${productGroup.productSlug}`}
                loaded={loaded}
                initiallyOpen={loaded}
                loadHref={detailHref(productGroup.productSlug)}
                summary={
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-admin-surface-subtle">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminProductLogo
                          slug={productGroup.productSlug}
                          name={productGroup.productName}
                          size="md"
                        />
                        <h3 className="text-sm font-semibold text-admin-text">
                          {productGroup.productName || productGroup.productSlug}
                        </h3>
                        <span className="shrink-0 whitespace-nowrap text-xs text-admin-text-muted">
                          待处理 {total}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-admin-text">
                        {diagnosis.title}
                      </p>
                      <p className="mt-1 text-xs text-admin-text-muted">
                        建议：{diagnosis.nextAction}
                      </p>
                      <p className="mt-1 text-xs text-admin-text-faint">
                        最近成功采集：
                        {formatDate(productGroup.latestSuccessAt || null)}
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-lg border border-admin-border px-3 py-2 text-xs text-admin-text-secondary">
                      展开证据
                    </span>
                  </summary>
                }
              >
                {loaded ? (
                  <div className="bg-admin-surface-subtle px-4 pb-4">
                    <div className="flex flex-wrap items-start gap-3 py-3">
                      <AdminLinkButton
                        variant="secondary"
                        size="sm"
                        href={withAdminReturnTo(
                          `/admin/data-quality/${encodeURIComponent(productGroup.productSlug)}`,
                          `/admin/review?product=${encodeURIComponent(productGroup.productSlug)}#review-pending`,
                        )}
                      >
                        查看原因与诊断
                      </AdminLinkButton>
                      <details className="text-xs text-admin-text-muted">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2">
                          需要补采？
                        </summary>
                        <p className="mb-2 max-w-lg leading-5">
                          {diagnosis.nextAction}{" "}
                          补采不会跳过稳定样本或硬异常门禁。
                        </p>
                        <ManualCollectionProgressForm
                          productSlug={productGroup.productSlug}
                          buttonLabel="修正后补采"
                          pendingLabel="正在提交补采请求"
                        />
                      </details>
                      <AdminLink
                        href={productWorkflowHref(
                          "/admin/prices",
                          productGroup.productSlug,
                        )}
                        className="inline-flex min-h-11 items-center px-2 text-sm text-admin-accent"
                      >
                        查看正式价格
                      </AdminLink>
                    </div>
                    <p className="mb-3 text-xs leading-5 text-admin-text-secondary">
                      系统判断：{diagnosis.label}。{diagnosis.detail}
                    </p>
                    <AdminPagination
                      page={detailPage}
                      totalPages={Math.max(
                        1,
                        Math.ceil(total / detailRowsPerProduct),
                      )}
                      total={total}
                      pageSize={detailRowsPerProduct}
                      pageHref={(next) =>
                        detailHref(productGroup.productSlug, next)
                      }
                      ariaLabel={`${productGroup.productName || productGroup.productSlug} 异常明细分页`}
                      className="mb-3"
                    />
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {productGroup.plans.map((planGroup) => (
                        <div
                          key={planGroup.planSlug}
                          className="overflow-hidden rounded-admin-card border border-admin-border bg-admin-surface"
                        >
                          <div className="border-b border-admin-border px-4 py-3">
                            <h4 className="text-sm font-semibold text-admin-text">
                              {planGroup.planName || planGroup.planSlug}
                            </h4>
                            <p className="mt-1 text-xs text-admin-text-muted">
                              当前页 {planGroup.rows.length} 条
                            </p>
                          </div>
                          <div className="max-h-[560px] space-y-2 overflow-y-auto p-3">
                            {planGroup.rows.map((row) => (
                              <div
                                key={row.id}
                                data-observation-id={row.id}
                                className="rounded-lg border border-admin-border bg-admin-surface p-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold text-admin-text">
                                      {row.country_name_zh ||
                                        row.country_name_en ||
                                        row.country_code}
                                    </p>
                                    <p className="mt-1 text-xs text-admin-text-muted">
                                      {row.country_code} ·{" "}
                                      {platformLabel(row.platform)} · 可信度{" "}
                                      {row.confidence_score ?? "-"}
                                    </p>
                                  </div>
                                  <div className="text-right text-xs text-admin-text">
                                    <p>
                                      {row.observed_price_text ||
                                        formatLocal(
                                          row.observed_local_price,
                                          row.observed_currency,
                                        )}
                                    </p>
                                    <p className="mt-1 text-admin-text-muted">
                                      {formatUsd(row.observed_price_usd)}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs leading-5 text-admin-text-secondary">
                                  <p className="font-semibold">
                                    拦截原因：
                                    {reviewReasonLabel(row.review_reason_code)}
                                  </p>
                                  <p>
                                    {reviewReasonAction(row.review_reason_code)}
                                  </p>
                                </div>
                                <PriceEvidencePanel row={row} />
                                {row.review_note ? (
                                  <p className="mt-2 break-words text-xs text-admin-text-muted">
                                    原始规则说明：{row.review_note}
                                  </p>
                                ) : null}
                                {row.source_url ? (
                                  <a
                                    href={row.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-11 items-center text-xs text-admin-accent"
                                  >
                                    查看采集证据
                                  </a>
                                ) : null}
                                <ObservationReviewActions
                                  observationId={row.id}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </LazyReviewDetails>
            );
          })}
        </div>
      )}
      {pendingTotalPages > 1 ? (
        <AdminPagination
          page={pendingPage}
          totalPages={pendingTotalPages}
          total={pendingProductTotal}
          pageSize={25}
          pageHref={(next) => `${pendingHref(next)}#review-pending`}
          ariaLabel="审核分页"
          className="border-t border-admin-border p-4"
        />
      ) : null}
    </section>
  );
}
