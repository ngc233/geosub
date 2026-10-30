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
  cells: Record<string, ReactNode>;
  /** Value submitted with the bulk form when this row is selected. */
  selectValue?: string;
};

const alignClass = { left: "text-left", right: "text-right", center: "text-center" };

/**
 * Dense list table: sortable headers, sticky head, empty state and page links.
 * Rows only link to details; writes go through AdminBulkActionBar (form attribute).
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
}) {

  return (
    <div className="overflow-hidden rounded-admin-card border border-admin-border bg-admin-surface shadow-sm shadow-admin-shadow">
      <div className="admin-scrollbar max-h-[70vh] overflow-auto">
        <table className="min-w-full divide-y divide-admin-border text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-admin-surface text-xs font-semibold text-admin-text-muted">
            <tr>
              {selection ? (
                <th scope="col" className="w-10 px-4 py-3">
                  <AdminSelectAll formId={selection.formId} name={selection.name} />
                </th>
              ) : null}
              {columns.map((column) => {
                const active = sort === column.key;
                const SortIcon = !active ? ArrowUpDown : direction === "desc" ? ArrowDown : ArrowUp;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (direction === "desc" ? "descending" : "ascending") : undefined}
                    className={`whitespace-nowrap bg-admin-surface-head px-4 py-3 ${alignClass[column.align || "left"]}`}
                  >
                    {column.sortable && sortHref ? (
                      <AdminLink href={sortHref(column.key)} className="inline-flex items-center gap-1 hover:text-admin-text">
                        {column.label}
                        <SortIcon aria-hidden="true" size={13} className={active ? "text-admin-accent" : "opacity-50"} />
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
                <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-12 text-center text-admin-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="transition hover:bg-admin-row-hover">
                  {selection ? (
                    <td className="px-4 py-3">
                      {row.selectValue ? (
                        <input
                          type="checkbox"
                          form={selection.formId}
                          name={selection.name}
                          value={row.selectValue}
                          aria-label="选择此行"
                          className="h-4 w-4 accent-blue-700"
                        />
                      ) : null}
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 align-middle text-admin-text-body ${alignClass[column.align || "left"]}`}>
                      {row.cells[column.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination ariaLabel={`${caption}分页`} page={page} totalPages={totalPages} total={total} pageSize={pageSize} pageHref={pageHref} className="border-t border-admin-border px-4 py-3" />
    </div>
  );
}
