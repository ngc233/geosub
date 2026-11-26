import AdminProductLogo from "@/components/admin/AdminProductLogo";
import { adminControlClassName, adminListActionClassName } from "@/components/admin/admin-control";
import { AdminLinkButton, adminButtonClassName } from "@/components/admin/AdminButton";
import AdminDataTable, { type AdminDataColumn } from "@/components/admin/AdminDataTable";
import AdminLink from "@/components/admin/AdminLink";
import AdminSegmentedControl from "@/components/admin/AdminSegmentedControl";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { nextSortDirection } from "@/lib/admin-list-params";
import {
  adminOperationalStatusMeta,
  type AdminOperationalStatus,
} from "@/lib/admin-operational-status";
import { adminListLocation, withAdminReturnTo } from "@/lib/admin-workflow-context";
import { Plus, Search, X } from "lucide-react";
import { buildProductsHref, loadProductsCatalogView } from "./products-adapter";

function formatDate(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatUsd(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

const tableColumns: AdminDataColumn[] = [
  { key: "name", label: "产品", sortable: true },
  { key: "category", label: "分类" },
  { key: "plans", label: "套餐", sortable: true, align: "right" },
  { key: "countries", label: "国家", sortable: true, align: "right" },
  { key: "prices", label: "价格", sortable: true, align: "right" },
  { key: "status", label: "运营状态" },
  { key: "checked", label: "最后核验", sortable: true, align: "right" },
  { key: "action", label: "", align: "right" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    category?: string;
    page?: string;
    q?: string;
    product?: string;
    state?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const view = await loadProductsCatalogView(params);
  const currentListLocation = adminListLocation("/admin/products", view.currentParams);
  const hasFilters = Boolean(
    view.q || view.productSlug || view.selectedCategory.value !== "all" || view.selectedState !== "all",
  );

  const rows = view.items.map((product) => {
    const returnTo = adminListLocation(
      "/admin/products",
      view.currentParams,
      `products-row-${product.id}`,
    );
    const workspaceHref = withAdminReturnTo(`/admin/products/${product.id}/edit`, returnTo);

    return {
      key: product.id,
      id: `products-row-${product.id}`,
      cells: {
        name: (
          <div className="flex min-w-[200px] items-center gap-3">
            <AdminProductLogo slug={product.slug} name={product.name} />
            <div className="min-w-0">
              <AdminLink
                href={workspaceHref}
                className="block truncate font-medium text-admin-text hover:underline"
              >
                {product.name}
              </AdminLink>
              <div className="flex items-center gap-1.5 text-[11px] text-admin-text-faint">
                <span className="truncate font-mono">{product.slug}</span>
                {product.minPriceUsd !== null && product.maxPriceUsd !== null ? (
                  <span className="shrink-0 tabular-nums">
                    · {formatUsd(product.minPriceUsd)}–{formatUsd(product.maxPriceUsd)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ),
        category: (
          <div className="whitespace-nowrap">
            <span className="text-admin-text-body">{product.categoryLabel}</span>
            {product.provider ? (
              <span className="block text-[11px] text-admin-text-faint">{product.provider}</span>
            ) : null}
          </div>
        ),
        plans: <span className="tabular-nums">{product.planCount}</span>,
        countries: <span className="tabular-nums">{product.countryCount}</span>,
        prices: <span className="font-medium tabular-nums">{product.priceCount}</span>,
        status: (
          <div className="flex items-center gap-2">
            <AdminStatusBadge
              status={product.operationalStatus}
              title={product.operationalReason}
            />
            {product.operationalReason ? (
              <span
                className="hidden max-w-[180px] truncate text-xs text-admin-text-faint 2xl:inline"
                title={product.operationalReason}
              >
                {product.operationalReason}
              </span>
            ) : null}
          </div>
        ),
        checked: (
          <span className="whitespace-nowrap text-xs tabular-nums text-admin-text-muted">
            {formatDate(product.lastCheckedAt)}
          </span>
        ),
        action: (
          <AdminLink href={workspaceHref} className={adminListActionClassName}>
            工作区
          </AdminLink>
        ),
      },
    };
  });

  return (
    <div className="-mx-4 -my-5 flex flex-col sm:-mx-6 lg:-mx-8 lg:-my-6">
      {/* Compact Metric Strip + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-admin-border bg-admin-surface px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-admin-text-muted">活跃产品</span>
            <strong className="text-base font-semibold tabular-nums text-admin-text">
              {view.activeTotal}
            </strong>
          </div>
          <span aria-hidden="true" className="hidden h-4 w-px bg-admin-border sm:inline-block" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-admin-text-muted">套餐</span>
            <strong className="text-base font-semibold tabular-nums text-admin-text">
              {view.totalPlans}
            </strong>
          </div>
          <span aria-hidden="true" className="hidden h-4 w-px bg-admin-border sm:inline-block" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-admin-text-muted">区域价格</span>
            <strong className="text-base font-semibold tabular-nums text-admin-text">
              {view.totalPrices.toLocaleString("zh-CN")}
            </strong>
          </div>
          <span aria-hidden="true" className="hidden h-4 w-px bg-admin-border sm:inline-block" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-admin-text-muted">覆盖国家</span>
            <strong className="text-base font-semibold tabular-nums text-admin-text">
              {view.countryCoverage}
            </strong>
          </div>
          <span aria-hidden="true" className="hidden h-4 w-px bg-admin-border sm:inline-block" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-admin-text-muted">待处理</span>
            <strong className="text-base font-semibold tabular-nums text-admin-text">
              {view.issueCount}
            </strong>
            <span className="text-xs text-admin-text-faint">（归档 {view.archivedCount}）</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AdminLinkButton href="/admin/discovery" variant="secondary" size="sm">
            线索导入
          </AdminLinkButton>
          <AdminLinkButton
            href={withAdminReturnTo("/admin/products/new", currentListLocation)}
            variant="primary"
            size="sm"
          >
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            新增产品
          </AdminLinkButton>
        </div>
      </div>

      {/* Single-Row Unified Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border bg-admin-surface-subtle/60 px-4 py-3 sm:px-6">
        <form
          action="/admin/products"
          method="get"
          role="search"
          className="flex flex-wrap items-center gap-2"
        >
          {view.selectedState !== "all" ? (
            <input type="hidden" name="state" value={view.selectedState} />
          ) : null}
          {params.sort ? <input type="hidden" name="sort" value={params.sort} /> : null}
          {params.dir ? <input type="hidden" name="dir" value={params.dir} /> : null}

          <div className="relative">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-faint"
            />
            <input
              type="search"
              name="q"
              defaultValue={view.q}
              maxLength={100}
              aria-label="搜索产品"
              placeholder="搜索产品或 slug…"
              className={`${adminControlClassName} h-9 w-56 pl-9 text-sm sm:w-64`}
            />
          </div>

          <select
            aria-label="按分类筛选"
            name="category"
            defaultValue={view.selectedCategory.value === "all" ? "" : view.selectedCategory.value}
            className={`${adminControlClassName} h-9 text-sm`}
          >
            {view.categoryCounts.map((cat) => (
              <option key={cat.value} value={cat.value === "all" ? "" : cat.value}>
                {cat.shortLabel} ({cat.count})
              </option>
            ))}
          </select>

          <button type="submit" className={adminButtonClassName({ variant: "secondary", size: "sm" })}>
            筛选
          </button>

          {hasFilters ? (
            <AdminLink
              href="/admin/products"
              className="inline-flex h-9 items-center gap-1 rounded-admin-control px-2.5 text-[13px] text-admin-text-muted hover:bg-admin-chip hover:text-admin-text"
            >
              <X size={14} aria-hidden="true" />
              重置
            </AdminLink>
          ) : null}
        </form>

        <AdminSegmentedControl
          ariaLabel="产品运营状态"
          size="sm"
          value={view.selectedState}
          items={[
            {
              label: `全部 ${view.activeTotal}`,
              value: "all",
              href: buildProductsHref(view.currentParams, { state: undefined }),
            },
            ...(
              ["exception", "pending", "not_started", "published"] as AdminOperationalStatus[]
            ).map((status) => ({
              label: `${adminOperationalStatusMeta[status].label} ${view.operationalCounts[status]}`,
              value: status,
              href: buildProductsHref(view.currentParams, { state: status }),
            })),
          ]}
        />
      </div>

      {/* Edge-to-Edge Flush Table */}
      <div id="products-list">
        <AdminDataTable
          flush
          caption="产品目录"
          columns={tableColumns}
          rows={rows}
          sort={params.sort ? view.sort : undefined}
          direction={params.sort ? view.direction : undefined}
          sortHref={(column) =>
            buildProductsHref(view.currentParams, {
              sort: column,
              dir: nextSortDirection(view.sort, view.direction, column),
            })
          }
          page={view.pagination.page}
          totalPages={view.pagination.totalPages}
          total={view.pagination.total}
          pageSize={view.pagination.pageSize}
          pageHref={(nextPage) =>
            buildProductsHref(view.currentParams, { page: nextPage })
          }
          emptyMessage="当前筛选下暂无产品，可点击右上角“新增产品”或从线索导入。"
        />
      </div>
    </div>
  );
}
