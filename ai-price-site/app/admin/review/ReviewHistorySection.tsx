import AdminProductLogo from "@/components/admin/AdminProductLogo";
import AdminPagination from "@/components/admin/AdminPagination";
import type { HistoryRow } from "./types";
import {
  formatDate,
  formatLocal,
  formatUsd,
  platformLabel,
  statusBadge,
  statusLabel,
} from "./review-display";

type ReviewHistorySectionProps = {
  historyRows: HistoryRow[];
  historyPage: number;
  historyTotalPages: number;
  historyPageSize: number;
  historyTotal: number;
  pendingPage: number;
  productQuery: string;
  returnTo?: string;
};

export function ReviewHistorySection({
  historyRows,
  historyPage,
  historyTotalPages,
  historyPageSize,
  historyTotal,
  pendingPage,
  productQuery,
  returnTo,
}: ReviewHistorySectionProps) {
  const buildHistoryPageHref = (nextHistoryPage: number) => {
    const query = new URLSearchParams();
    query.set("showHistory", "1");
    if (returnTo) query.set("returnTo", returnTo);

    if (pendingPage > 1) query.set("page", String(pendingPage));
    if (nextHistoryPage > 1) query.set("historyPage", String(nextHistoryPage));
    if (productQuery) query.set("product", productQuery);

    const value = query.toString();
    return value ? `/admin/review?${value}` : "/admin/review";
  };

  return (
      <section id="review-history" className="scroll-mt-24 rounded-admin-card border border-admin-border bg-admin-surface shadow-sm dark:border-admin-border-strong dark:bg-admin-surface">
        <div className="flex items-center justify-between border-b border-admin-border px-4 py-3 dark:border-admin-border-strong">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">最近审核历史</h2>
            <p className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
              按时间倒序分页显示已通过、已忽略或已拒绝记录。当前第 {historyPage} / {historyTotalPages} 页，每页 {historyPageSize} 条。
            </p>
          </div>
        </div>

<AdminPagination page={historyPage} totalPages={historyTotalPages} total={historyTotal} pageSize={historyPageSize}
  pageHref={(next)=>`${buildHistoryPageHref(next)}#review-history`} ariaLabel="审核顶部分页" className="px-4 py-3" />
        {historyRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-admin-text-muted dark:text-admin-text-muted">
            暂无审核历史。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-admin-border bg-admin-surface-subtle text-xs text-admin-text-muted dark:border-admin-border-strong dark:bg-admin-surface dark:text-admin-text-muted">
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

              <tbody className="divide-y divide-admin-border">
                {historyRows.map((row) => (
                  <tr key={row.id} className="hover:bg-admin-surface-subtle dark:hover:bg-admin-surface">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AdminProductLogo slug={row.product_slug} name={row.product_name}/>
                        <div className="font-medium text-admin-text">{row.product_name ?? row.product_slug}</div>
                      </div>
                      <div className="text-xs text-admin-text-muted dark:text-admin-text-muted">{row.product_slug}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-admin-text dark:text-admin-text">{row.plan_name ?? row.plan_slug}</div>
                      <div className="text-xs text-admin-text-muted dark:text-admin-text-muted">{row.plan_slug}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-admin-text dark:text-admin-text">{row.country_name_zh ?? row.country_name_en ?? row.country_code}</div>
                      <div className="text-xs text-admin-text-muted dark:text-admin-text-muted">{row.country_code}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-admin-chip px-2 py-1 text-xs font-medium text-admin-text-body dark:bg-admin-chip dark:text-admin-text-body">
                        {platformLabel(row.platform)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-admin-text dark:text-admin-text">
                        {row.observed_price_text ?? formatLocal(row.observed_local_price, row.observed_currency)}
                      </div>
                      <div className="text-xs text-admin-text-muted dark:text-admin-text-muted">
                        {formatUsd(row.observed_price_usd)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadge(row.review_status)}`}>
                        {statusLabel(row.review_status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-admin-text-secondary dark:text-admin-text-secondary">
                      {row.region_price_status ? (
                        <div>
                          <div className="font-medium text-admin-text dark:text-admin-text">{row.region_price_status}</div>
                          <div>{row.promoted_platform ?? "—"} · {row.promoted_data_quality ?? "—"}</div>
                        </div>
                      ) : (
                        <span className="text-admin-text-faint">未写入</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      {formatDate(row.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AdminPagination page={historyPage} totalPages={historyTotalPages} total={historyTotal} pageSize={historyPageSize}
          pageHref={(next)=>`${buildHistoryPageHref(next)}#review-history`}
          ariaLabel="审核分页" className="border-t border-admin-border p-4" />
      </section>
  );
}
