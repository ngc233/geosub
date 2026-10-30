import AdminLink from "./AdminLink";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminPageWindow } from "../../lib/admin-list-params";
import type { ReactNode } from "react";

export default function AdminPagination({
  page, totalPages, total, pageSize, pageHref, ariaLabel = "列表分页", unit = "条", className = "", id, showCount = true
}: {
  page: number; totalPages: number; total: number; pageSize: number;
  pageHref: (page: number) => string; ariaLabel?: string; unit?: string; className?: string; id?: string; showCount?: boolean;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return <nav id={id} aria-label={ariaLabel} className={`scroll-mt-24 flex flex-wrap items-center justify-between gap-3 text-sm text-admin-text-muted ${className}`}>
    {showCount ? <span>{total === 0 ? `共 0 ${unit}` : `第 ${first}–${last} ${unit}，共 ${total.toLocaleString("zh-CN")} ${unit}`}</span> : null}
    {totalPages > 1 ? <div className="flex items-center gap-1">
      <PageLink href={page > 1 ? pageHref(page - 1) : null} label="上一页"><ChevronLeft size={16} aria-hidden="true" /></PageLink>
      {adminPageWindow(page, totalPages).map((item, i) => item === "gap" ? <span key={`gap-${i}`} aria-hidden="true" className="px-1">…</span> : <PageLink key={item} href={pageHref(item)} label={`第 ${item} 页`} current={item === page}>{item}</PageLink>)}
      <PageLink href={page < totalPages ? pageHref(page + 1) : null} label="下一页"><ChevronRight size={16} aria-hidden="true" /></PageLink>
    </div> : null}
  </nav>;
}

function PageLink({ href, label, current = false, children }: { href: string | null; label: string; current?: boolean; children: ReactNode }) {
  const cls = `inline-flex h-11 min-w-10 items-center justify-center rounded-lg px-2 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/40 ${current ? "bg-admin-primary font-medium text-white" : "text-admin-text-secondary hover:bg-admin-chip"}`;
  if (!href || current) return <span aria-label={label} aria-current={current ? "page" : undefined} aria-disabled={!href || undefined} className={`${cls} ${!href ? "opacity-40" : ""}`}>{children}</span>;
  return <AdminLink href={href} scroll={href.includes("#") ? true : undefined} aria-label={label} className={cls}>{children}</AdminLink>;
}
