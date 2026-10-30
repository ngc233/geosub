import { adminButtonClassName } from "@/components/admin/AdminButton";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import AdminLink from "@/components/admin/AdminLink";
import { AdminCard } from "../../components/admin/AdminCard";
import { formatConversion, formatNumber } from "./dashboard-formatters";
import type { FunnelSegment } from "./queries";

export function DashboardPanel({
  title,
  description,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <AdminCard className="dark:border-admin-border dark:bg-admin-surface dark:shadow-black/20">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
              {description}
            </p>
          ) : null}
        </div>

        {actionHref && actionLabel ? (
          <AdminLink
            href={actionHref}
            className={adminButtonClassName({variant:"secondary",size:"sm",className:""})}
          >
            {actionLabel}
            <ArrowRight size={14} strokeWidth={2} />
          </AdminLink>
        ) : null}
      </div>

      {children}
    </AdminCard>
  );
}
export function RankingList({
  items,
  emptyText,
}: {
  items: Array<{
    label: string;
    description: string;
    value: string | number;
    href?: string;
  }>;
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-admin-card border border-dashed border-admin-border-strong bg-admin-surface-subtle
        px-5 py-8 text-center text-sm text-admin-text-muted dark:border-admin-border-strong
        dark:bg-admin-chip/60 dark:text-admin-text-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const content = (
          <div className="flex items-center justify-between gap-4 rounded-admin-card border border-admin-border
            bg-admin-surface px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40
            dark:border-admin-border dark:bg-admin-surface dark:hover:border-blue-700 dark:hover:bg-blue-950/40">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-admin-chip text-xs font-semibold text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted">
                {index + 1}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-admin-text dark:text-admin-text">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-xs text-admin-text-muted dark:text-admin-text-muted">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-sm font-semibold text-admin-text-body dark:text-admin-text-body">
              {formatNumber(item.value)}
            </div>
          </div>
        );

        if (!item.href) return <div key={item.label}>{content}</div>;

        return (
          <AdminLink key={item.label} href={item.href} className="block">
            {content}
          </AdminLink>
        );
      })}
    </div>
  );
}

export function FunnelSegmentList({
  title,
  items,
  baseline,
}: {
  title: string;
  items: FunnelSegment[];
  baseline: "list" | "detail";
}) {
  return (
    <section className="min-w-0 py-1 lg:px-5 lg:first:pl-0 lg:last:pr-0">
      <h3 className="text-sm font-semibold text-admin-text dark:text-admin-text">{title}</h3>
      <p className="mt-1 text-xs text-admin-text-faint dark:text-admin-text-muted">
        {baseline === "list" ? "列表会话为起点" : "产品详情会话为起点"}
      </p>
      <div className="mt-3 divide-y divide-admin-border border-y border-admin-border dark:divide-admin-border dark:border-admin-border">
        {items.slice(0, 5).map((item) => {
          const start = baseline === "list" ? item.listSessions : item.detailSessions;
          const next = baseline === "list" ? item.detailSessions : item.planSessions;

          return (
            <div key={item.key} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-admin-text dark:text-admin-text-body">
                  {item.label}
                </span>
                <span className="shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {formatConversion(next, start)}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-admin-text-faint dark:text-admin-text-muted">
                {baseline === "list"
                  ? `列表 ${item.listSessions} · 详情 ${item.detailSessions}`
                  : `详情 ${item.detailSessions} · 套餐 ${item.planSessions}`}
                {` · 商业 ${item.commercialSessions}`}
              </p>
            </div>
          );
        })}
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-admin-text-faint dark:text-admin-text-muted">所选时段暂无数据。</p>
        ) : null}
      </div>
    </section>
  );
}
