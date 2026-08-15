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
    <AdminCard>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {actionHref && actionLabel ? (
          <AdminLink
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const content = (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">
                {index + 1}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-sm font-bold text-slate-700">
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
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">
        {baseline === "list" ? "列表会话为起点" : "产品详情会话为起点"}
      </p>
      <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
        {items.slice(0, 5).map((item) => {
          const start = baseline === "list" ? item.listSessions : item.detailSessions;
          const next = baseline === "list" ? item.detailSessions : item.planSessions;

          return (
            <div key={item.key} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-bold text-slate-800">
                  {item.label}
                </span>
                <span className="shrink-0 text-xs font-bold text-blue-700">
                  {formatConversion(next, start)}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-400">
                {baseline === "list"
                  ? `列表 ${item.listSessions} · 详情 ${item.detailSessions}`
                  : `详情 ${item.detailSessions} · 套餐 ${item.planSessions}`}
                {` · 商业 ${item.commercialSessions}`}
              </p>
            </div>
          );
        })}
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">所选时段暂无数据。</p>
        ) : null}
      </div>
    </section>
  );
}
