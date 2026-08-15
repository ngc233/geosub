"use client";

import { Check, Download } from "lucide-react";
import { useState } from "react";
import { AdminButton } from "../../components/admin/AdminButton";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { formatNumber } from "./dashboard-formatters";
import {
  buildTrendCsv,
  getNiceAxisScale,
  getTrendChangePercent,
  shouldShowTrendLabel,
  type TrendComparison,
  type TrendPoint,
} from "./dashboard-trend";
import type { DashboardRange } from "./queries";

type TrendChartPeriod = {
  range: DashboardRange;
  from: string;
  to: string;
  isCustom: boolean;
  error?: string;
};

function TrendDelta({ current, previous }: { current: number; previous: number }) {
  const change = getTrendChangePercent(current, previous);

  if (change === null) {
    return <span className="text-xs font-semibold text-slate-500">前期无基数</span>;
  }

  const className =
    change > 0
      ? "text-emerald-700"
      : change < 0
        ? "text-red-600"
        : "text-slate-500";
  const value = change > 0 ? `+${change}%` : `${change}%`;

  return (
    <span className={`text-xs font-semibold tabular-nums ${className}`}>
      较上一周期 {value}
    </span>
  );
}

function SeriesCard({
  label,
  total,
  previous,
  checked,
  compare,
  tone,
  onChange,
}: {
  label: string;
  total: number;
  previous: number;
  checked: boolean;
  compare: boolean;
  tone: "blue" | "indigo";
  onChange: (checked: boolean) => void;
}) {
  const activeClasses =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-950"
      : "border-indigo-200 bg-indigo-50 text-indigo-950";
  const labelClass = tone === "blue" ? "text-blue-700" : "text-indigo-700";
  const checkClass = tone === "blue" ? "border-blue-600 bg-blue-600" : "border-indigo-500 bg-indigo-500";
  const lineClass = tone === "blue" ? "bg-blue-600" : "bg-indigo-500";

  return (
    <label
      className={`cursor-pointer rounded-xl border px-4 py-3 transition focus-within:ring-4 focus-within:ring-blue-500/10 ${
        checked
          ? activeClasses
          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        aria-label={`显示${label}趋势`}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 text-xs font-semibold ${checked ? labelClass : "text-slate-500"}`}>
          <span
            className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
              checked ? checkClass : "border-slate-300 bg-white"
            }`}
            aria-hidden="true"
          >
            {checked ? <Check size={11} strokeWidth={3} className="text-white" /> : null}
          </span>
          <span className={`h-0.5 w-5 ${checked ? lineClass : "bg-slate-300"}`} aria-hidden="true" />
          {label}
        </span>
        <span className="hidden text-[11px] font-medium text-slate-500 sm:inline">点击切换</span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tabular-nums">{formatNumber(total)}</span>
        {compare ? <TrendDelta current={total} previous={previous} /> : null}
      </div>
    </label>
  );
}

const ranges: Array<{ label: string; value: DashboardRange }> = [
  { label: "7 天", value: 7 },
  { label: "30 天", value: 30 },
  { label: "90 天", value: 90 },
  { label: "6 个月", value: 180 },
  { label: "12 个月", value: 365 },
  { label: "24 个月", value: 730 },
];

export function TrendChart({
  period,
  latestCompleteDate,
  trend,
  comparison,
}: {
  period: TrendChartPeriod;
  latestCompleteDate: string;
  trend: TrendPoint[];
  comparison: TrendComparison;
}) {
  const [showPageViews, setShowPageViews] = useState(true);
  const [showClicks, setShowClicks] = useState(true);
  const [compare, setCompare] = useState(false);

  const totalPageViews = trend.reduce((sum, item) => sum + item.pageViews, 0);
  const totalClicks = trend.reduce((sum, item) => sum + item.clicks, 0);
  const visibleValues = trend.flatMap((item) => [
    ...(showPageViews ? [item.pageViews] : []),
    ...(showClicks ? [item.clicks] : []),
  ]);
  const comparisonValues = compare
    ? comparison.previousTrend.flatMap((item) => [
        ...(showPageViews ? [item.pageViews] : []),
        ...(showClicks ? [item.clicks] : []),
      ])
    : [];
  const maxValue = Math.max(1, ...visibleValues, ...comparisonValues);
  const { axisMax, ticks } = getNiceAxisScale(maxValue);
  const hasVisibleSeries = showPageViews || showClicks;
  const hasVisibleData =
    visibleValues.some((value) => value > 0) ||
    comparisonValues.some((value) => value > 0);
  const chartWidth = 1000;
  const chartHeight = 260;
  const chartLeft = 48;
  const chartRight = 18;
  const chartTop = 18;
  const chartBottom = 42;
  const plotWidth = chartWidth - chartLeft - chartRight;
  const plotHeight = chartHeight - chartTop - chartBottom;
  const getX = (index: number, total = trend.length) =>
    chartLeft + (total <= 1 ? plotWidth / 2 : (index / (total - 1)) * plotWidth);
  const getY = (value: number) => chartTop + plotHeight - (value / axisMax) * plotHeight;
  const getPoints = (series: TrendPoint[], key: "pageViews" | "clicks") =>
    series
      .map((item, index) => `${getX(index, series.length)},${getY(item[key])}`)
      .join(" ");

  const handleExport = () => {
    const csv = buildTrendCsv({
      trend,
      previousTrend: comparison.previousTrend,
      showPageViews,
      showClicks,
      compare,
    });
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `geosub-traffic-${period.from}-${period.to}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="traffic-trend"
      className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">访问与点击趋势</h2>
          <p className="mt-1 text-sm text-slate-500">
            趋势仅显示已经结束的 UTC 自然日；今天的实时数据单独显示在上方卡片中。
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 lg:items-end">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="w-full max-w-full overflow-x-auto pb-1 [scrollbar-width:none] lg:w-auto [&::-webkit-scrollbar]:hidden">
              <SegmentedControl
                ariaLabel="Dashboard 时间范围"
                value={period.isCustom ? "custom" : String(period.range)}
                tone="blue"
                size="sm"
                className="min-w-[480px] lg:min-w-0"
                prefetch={false}
                items={[
                  ...ranges.map((item) => ({
                    label: item.label,
                    shortLabel: item.label.replace("个月", "月"),
                    value: String(item.value),
                    href: `/admin?range=${item.value}`,
                  })),
                  {
                    label: "自定义",
                    shortLabel: "自定",
                    value: "custom",
                    disabled: !period.isCustom,
                  },
                ]}
              />
            </div>

            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-within:ring-4 focus-within:ring-blue-500/10">
              <input
                type="checkbox"
                className="sr-only"
                aria-label="对比上一等长周期"
                checked={compare}
                onChange={(event) => setCompare(event.target.checked)}
              />
              <span
                className={`relative h-5 w-9 rounded-full transition ${compare ? "bg-blue-600" : "bg-slate-300"}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${compare ? "left-[18px]" : "left-0.5"}`}
                />
              </span>
              对比
            </label>

            <AdminButton type="button" size="sm" variant="secondary" onClick={handleExport}>
              <Download size={14} strokeWidth={2} aria-hidden="true" />
              导出 CSV
            </AdminButton>
          </div>

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
                type="text"
                name="from"
                defaultValue={period.from}
                inputMode="numeric"
                pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                placeholder="YYYY-MM-DD"
                aria-label="开始日期，格式为年-月-日"
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
              />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
              结束日期
              <input
                type="text"
                name="to"
                defaultValue={period.to}
                inputMode="numeric"
                pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                placeholder="YYYY-MM-DD"
                aria-label={`结束日期，最晚 ${latestCompleteDate}`}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
              />
            </label>
            <AdminButton type="submit" size="sm">
              应用
            </AdminButton>
          </form>

          {period.error ? <p className="text-xs font-medium text-red-600">{period.error}</p> : null}
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SeriesCard
          label="访问量"
          total={totalPageViews}
          previous={comparison.previousPageViews}
          checked={showPageViews}
          compare={compare}
          tone="blue"
          onChange={setShowPageViews}
        />
        <SeriesCard
          label="点击事件"
          total={totalClicks}
          previous={comparison.previousClicks}
          checked={showClicks}
          compare={compare}
          tone="indigo"
          onChange={setShowClicks}
        />
      </div>

      {compare ? (
        <p className="mb-3 text-xs font-medium text-slate-500">
          虚线为上一周期：{comparison.previousFrom} 至 {comparison.previousTo}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-slate-50 px-3 py-4 sm:px-5">
        {hasVisibleSeries && hasVisibleData ? (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-64 min-w-[640px] w-full"
              role="img"
              aria-label={`访问趋势：${totalPageViews} 次访问，${totalClicks} 次点击${compare ? "，已叠加上一周期" : ""}`}
            >
              {ticks.map((value) => {
                const y = chartTop + plotHeight - (value / axisMax) * plotHeight;

                return (
                  <g key={value}>
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

              {compare && showPageViews ? (
                <polyline
                  data-series="previous-page-views"
                  points={getPoints(comparison.previousTrend, "pageViews")}
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth="3"
                  strokeDasharray="10 8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {compare && showClicks ? (
                <polyline
                  data-series="previous-clicks"
                  points={getPoints(comparison.previousTrend, "clicks")}
                  fill="none"
                  stroke="#c7d2fe"
                  strokeWidth="3"
                  strokeDasharray="10 8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {showPageViews ? (
                <polyline
                  data-series="current-page-views"
                  points={getPoints(trend, "pageViews")}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {showClicks ? (
                <polyline
                  data-series="current-clicks"
                  points={getPoints(trend, "clicks")}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}

              {compare
                ? comparison.previousTrend.map((item, index) => {
                    const x = getX(index, comparison.previousTrend.length);
                    return (
                      <g key={`previous-${item.label}`}>
                        {showPageViews ? (
                          <circle cx={x} cy={getY(item.pageViews)} r="3.5" fill="#93c5fd">
                            <title>{`上一周期 ${item.label}：访问 ${item.pageViews}`}</title>
                          </circle>
                        ) : null}
                        {showClicks ? (
                          <circle cx={x} cy={getY(item.clicks)} r="3.5" fill="#c7d2fe">
                            <title>{`上一周期 ${item.label}：点击 ${item.clicks}`}</title>
                          </circle>
                        ) : null}
                      </g>
                    );
                  })
                : null}

              {trend.map((item, index) => {
                const x = getX(index);
                return (
                  <g key={item.label}>
                    {showPageViews ? (
                      <circle cx={x} cy={getY(item.pageViews)} r="5" fill="#2563eb" stroke="white" strokeWidth="2">
                        <title>{`${item.label}：访问 ${item.pageViews}`}</title>
                      </circle>
                    ) : null}
                    {showClicks ? (
                      <circle cx={x} cy={getY(item.clicks)} r="5" fill="#6366f1" stroke="white" strokeWidth="2">
                        <title>{`${item.label}：点击 ${item.clicks}`}</title>
                      </circle>
                    ) : null}
                    {shouldShowTrendLabel(index, trend.length) ? (
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
            {hasVisibleSeries
              ? "所选时段还没有正式访问或点击数据，产生新访问后会自动绘制趋势线。"
              : "请至少选择一个指标以显示趋势线。"}
          </div>
        )}
      </div>
    </div>
  );
}
