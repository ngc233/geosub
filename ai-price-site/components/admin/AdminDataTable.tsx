import AdminLink from "@/components/admin/AdminLink";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { type AdminSortDirection } from "../../lib/admin-list-params";
import AdminSelectAll from "./AdminSelectAll";
import AdminPagination from "./AdminPagination";

export type AdminDataColumn = {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
};

export type AdminDataRow = {
  key: string;
  id?: string;
  cells: Record<string, ReactNode>;
  /** Value submitted with the bulk form when this row is selected. */
  selectValue?: string;
};

const alignClass = { left: "text-left", right: "text-right", center: "text-center" };

/**
 * High-density Linear/Vercel-style data table.
 * Supports flush edge-to-edge mode (`flush={true}`) or subtle hairline-framed mode.
 */
export default function AdminDataTable({
  caption,
  columns,
  rows,
  sort,
  direction,
  sortHref,
  page,
  totalPages,
  total,
  pageSize,
  pageHref,
  emptyMessage = "没有符合条件的记录。",
  selection,
  flush = false,
}: {
  caption: string;
  columns: AdminDataColumn[];
  rows: AdminDataRow[];
  sort?: string;
  direction?: AdminSortDirection;
  sortHref?: (column: string) => string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageHref: (page: number) => string;
  emptyMessage?: string;
  selection?: { formId: string; name: string };
  flush?: boolean;
}) {
  return (
    <div
      className={
        flush
          ? "bg-admin-surface"
          : "overflow-hidden rounded-admin-card border border-admin-border bg-admin-surface"
      }
    >
      <div className="admin-scrollbar max-h-[72vh] overflow-auto">
        <table className="min-w-full divide-y divide-admin-border text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-admin-surface-head text-[11px] font-medium uppercase tracking-wider text-admin-text-muted">
            <tr>
              {selection ? (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <AdminSelectAll formId={selection.formId} name={selection.name} />
                </th>
              ) : null}
              {columns.map((column) => {
                const active = sort === column.key;
                const SortIcon = !active
                  ? ArrowUpDown
                  : direction === "desc"
                    ? ArrowDown
                    : ArrowUp;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active ? (direction === "desc" ? "descending" : "ascending") : undefined
                    }
                    className={`whitespace-nowrap bg-admin-surface-head px-4 py-2.5 ${alignClass[column.align || "left"]}`}
                  >
                    {column.sortable && sortHref ? (
                      <AdminLink
                        href={sortHref(column.key)}
                        className="inline-flex items-center gap-1 hover:text-admin-text"
                      >
                        {column.label}
                        <SortIcon
                          aria-hidden="true"
                          size={12}
                          className={active ? "text-admin-text" : "opacity-45"}
                        />
                      </AdminLink>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-admin-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} id={row.id} className="transition-colors hover:bg-admin-row-hover">
                  {selection ? (
                    <td className="px-4 py-2.5">
                      {row.selectValue ? (
                        <input
                          type="checkbox"
                          form={selection.formId}
                          name={selection.name}
                          value={row.selectValue}
                          aria-label="选择此行"
                          className="h-3.5 w-3.5 accent-[var(--admin-primary)]"
                        />
                      ) : null}
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2.5 align-middle text-admin-text-body ${alignClass[column.align || "left"]}`}
                    >
                      {row.cells[column.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        ariaLabel={`${caption}分页`}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        pageHref={pageHref}
        className="border-t border-admin-border px-4 py-2.5"
      />
    </div>
  );
}
