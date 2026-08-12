import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import AdminLink from "@/components/admin/AdminLink";
import { AdminCard } from "../../components/admin/AdminCard";
import { AdminButton } from "../../components/admin/AdminButton";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { formatConversion, formatNumber } from "./dashboard-formatters";
import {
  formatDateInput,
  getTodayUtc,
  type DashboardRange,
  type DashboardPeriod,
  type FunnelSegment,
} from "./queries";

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
export function shouldShowTrendLabel(index: number, total: number, days: number) {
  if (total <= 10) return true;
  if (index === 0 || index === total - 1) return true;

  if (days <= 30) return index % 3 === 0;
  if (days <= 90) return index % 2 === 0;
  if (days <= 180) return index % 3 === 0;
  if (days <= 365) return index % 3 === 0;
  if (days <= 730) return index % 4 === 0;

  return index % 2 === 0;
}

export function TrendChart({
  period,
  trend,
}: {
  period: DashboardPeriod;
  trend: Array<{
    label: string;
    pageViews: number;
    clicks: number;
  }>;
}) {
  const maxValue = Math.max(
    1,
    ...trend.map((item) => Math.max(item.pageViews, item.clicks))
  );

  const totalPageViews = trend.reduce((sum, item) => sum + item.pageViews, 0);
  const totalClicks = trend.reduce((sum, item) => sum + item.clicks, 0);
  const hasTrendData = totalPageViews > 0 || totalClicks > 0;
  const chartWidth = 1000;
  const chartHeight = 260;
  const chartLeft = 48;
  const chartRight = 18;
  const chartTop = 18;
  const chartBottom = 42;
  const plotWidth = chartWidth - chartLeft - chartRight;
  const plotHeight = chartHeight - chartTop - chartBottom;
  const getX = (index: number) =>
    chartLeft +
    (trend.length <= 1 ? plotWidth / 2 : (index / (trend.length - 1)) * plotWidth);
  const getY = (value: number) =>
    chartTop + plotHeight - (value / maxValue) * plotHeight;
  const pageViewPoints = trend
    .map((item, index) => `${getX(index)},${getY(item.pageViews)}`)
    .join(" ");
  const clickPoints = trend
    .map((item, index) => `${getX(index)},${getY(item.clicks)}`)
    .join(" ");
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const ranges: Array<{
    label: string;
    value: DashboardRange;
  }> = [
    { label: "7 天", value: 7 },
    { label: "30 天", value: 30 },
    { label: "90 天", value: 90 },
    { label: "6 个月", value: 180 },
    { label: "12 个月", value: 365 },
    { label: "24 个月", value: 730 },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">访问与点击趋势</h2>
          <p className="mt-1 text-sm text-slate-500">
            历史趋势读取 daily_stats 聚合表，当天数据实时读取 event_logs；全部按 UTC 自然日统计。
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 lg:items-end">
          <SegmentedControl
            ariaLabel="Dashboard 时间范围"
            value={period.isCustom ? "custom" : String(period.range)}
            tone="blue"
            size="sm"
            prefetch={false}
            items={[
              ...ranges.map((item) => ({
                label: item.label,
                value: String(item.value),
                href: `/admin?range=${item.value}`,
              })),
              {
                label: "自定义",
                value: "custom",
                disabled: !period.isCustom,
              },
            ]}
          />

          <form
            action="/admin"
            method="get"
            className={`flex flex-wrap items-end gap-2 rounded-xl border px-3 py-2 ${
              period.isCustom
                ? "border-blue-200 bg-blue-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
          <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
            开始日期
            <input
              type="date"
              name="from"
              defaultValue={period.from}
              max={formatDateInput(getTodayUtc())}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
            />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
            结束日期
            <input
              type="date"
              name="to"
              defaultValue={period.to}
              max={formatDateInput(getTodayUtc())}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
            />
          </label>
          <AdminButton type="submit" size="sm">
            应用
          </AdminButton>
          </form>

          {period.error ? (
            <p className="text-xs font-medium text-red-600">{period.error}</p>
          ) : null}
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700">访问量</p>
          <p className="mt-1 text-2xl font-bold text-blue-950">
            {formatNumber(totalPageViews)}
          </p>
        </div>

        <div className="rounded-xl bg-indigo-50 px-4 py-3">
          <p className="text-xs font-semibold text-indigo-700">点击事件</p>
          <p className="mt-1 text-2xl font-bold text-indigo-950">
            {formatNumber(totalClicks)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-slate-50 px-3 py-4 sm:px-5">
        {hasTrendData ? (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-64 min-w-[640px] w-full"
              role="img"
              aria-label={`访问趋势：${totalPageViews} 次访问，${totalClicks} 次点击`}
            >
              {gridLines.map((ratio) => {
                const y = chartTop + plotHeight - ratio * plotHeight;
                const value = Math.round(maxValue * ratio);

                return (
                  <g key={ratio}>
                    <line
                      x1={chartLeft}
                      y1={y}
                      x2={chartWidth - chartRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200"
                      strokeWidth="1"
                    />
                    <text
                      x={chartLeft - 9}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[11px] font-semibold"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              <polyline
                points={pageViewPoints}
                fill="none"
                stroke="#2563eb"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={clickPoints}
                fill="none"
                stroke="#818cf8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {trend.map((item, index) => {
                const x = getX(index);

                return (
                  <g key={item.label}>
                    <circle
                      cx={x}
                      cy={getY(item.pageViews)}
                      r="5"
                      fill="#2563eb"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <title>{`${item.label}：访问 ${item.pageViews}`}</title>
                    </circle>
                    <circle
                      cx={x}
                      cy={getY(item.clicks)}
                      r="5"
                      fill="#818cf8"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <title>{`${item.label}：点击 ${item.clicks}`}</title>
                    </circle>
                    {shouldShowTrendLabel(index, trend.length, period.days) ? (
                      <text
                        x={x}
                        y={chartHeight - 13}
                        textAnchor="middle"
                        className="fill-slate-400 text-[11px] font-semibold"
                      >
                        {item.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-slate-500">
            所选时段还没有正式访问或点击数据，产生新访问后会自动绘制趋势线。
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            访问量
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
            点击事件
          </span>
        </div>
      </div>
    </div>
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
