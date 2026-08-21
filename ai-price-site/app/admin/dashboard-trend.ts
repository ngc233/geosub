export type TrendPoint = {
  label: string;
  totalPageViews: number;
  pageViews: number;
  clicks: number;
};

export type TrendComparison = {
  previousTotalPageViews: number;
  previousPageViews: number;
  previousClicks: number;
  previousTrend: TrendPoint[];
  previousFrom: string;
  previousTo: string;
};

function getNiceStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 1) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const multiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;

  return multiplier * magnitude;
}

export function getNiceAxisScale(maxValue: number, intervalCount = 4) {
  const safeIntervals = Math.max(1, Math.floor(intervalCount));
  const step = getNiceStep(Math.max(0, maxValue) / safeIntervals);
  const axisMax = step * safeIntervals;

  return {
    axisMax,
    ticks: Array.from({ length: safeIntervals + 1 }, (_, index) => step * index),
  };
}

export function getTrendLabelStep(total: number) {
  if (total <= 10) return 1;
  return Math.ceil(total / 10);
}

export function shouldShowTrendLabel(index: number, total: number) {
  if (index < 0 || index >= total) return false;
  return index % getTrendLabelStep(total) === 0;
}

export function getTrendChangePercent(current: number, previous: number) {
  if (previous <= 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function escapeCsvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildTrendCsv({
  trend,
  previousTrend,
  showTotalPageViews,
  showPageViews,
  showClicks,
  compare,
}: {
  trend: TrendPoint[];
  previousTrend: TrendPoint[];
  showTotalPageViews: boolean;
  showPageViews: boolean;
  showClicks: boolean;
  compare: boolean;
}) {
  const headers: Array<string> = ["当前日期"];

  if (showTotalPageViews) headers.push("当前全站汇总浏览量");
  if (showPageViews) headers.push("当前已同意访问");
  if (showClicks) headers.push("当前已同意点击");

  if (compare) {
    headers.push("上一周期日期");
    if (showTotalPageViews) headers.push("上一周期全站汇总浏览量");
    if (showPageViews) headers.push("上一周期已同意访问");
    if (showClicks) headers.push("上一周期已同意点击");
  }

  const rowCount = Math.max(trend.length, compare ? previousTrend.length : 0);
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const current = trend[index];
    const previous = previousTrend[index];
    const cells: Array<string | number> = [current?.label ?? ""];

    if (showTotalPageViews) cells.push(current?.totalPageViews ?? "");
    if (showPageViews) cells.push(current?.pageViews ?? "");
    if (showClicks) cells.push(current?.clicks ?? "");

    if (compare) {
      cells.push(previous?.label ?? "");
      if (showTotalPageViews) cells.push(previous?.totalPageViews ?? "");
      if (showPageViews) cells.push(previous?.pageViews ?? "");
      if (showClicks) cells.push(previous?.clicks ?? "");
    }

    return cells.map(escapeCsvCell).join(",");
  });

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
}
