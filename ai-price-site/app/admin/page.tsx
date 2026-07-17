import Link from "next/link";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  Globe2,
  MousePointerClick,
  Search,
} from "lucide-react";
import { prisma } from "../../lib/prisma";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../components/admin/AdminCard";
import AdminAlert from "../../components/admin/AdminAlert";
import SegmentedControl from "../../components/ui/SegmentedControl";

type DashboardRange = 7 | 30 | 90 | 180 | 365 | 730;

type DashboardPeriod = {
  range: DashboardRange;
  days: number;
  start: Date;
  endExclusive: Date;
  from: string;
  to: string;
  isCustom: boolean;
  error?: string;
};

type DashboardSummaryRow = {
  today_page_views: bigint;
  today_click_events: bigint;
  today_affiliate_clicks: bigint;
  today_official_clicks: bigint;
  today_button_clicks: bigint;
  digital_services: bigint;
  plans: bigint;
  countries: bigint;
  region_prices: bigint;
  articles: bigint;
  pending_reviews: bigint;
  price_anomalies: bigint;
  stale_prices: bigint;
  low_confidence_prices: bigint;
  missing_source_prices: bigint;
  missing_seo_services: bigint;
  missing_faq_services: bigint;
  draft_articles: bigint;
};

type ServiceHeatRow = {
  id: string;
  slug: string;
  name: string;
  page_views: bigint;
  interactions: bigint;
  unique_visitors: bigint;
  heat_score: bigint;
};

type CommercialAttributionRow = {
  group_kind: "product" | "entry";
  key: string;
  label: string;
  affiliate_clicks: bigint;
  official_clicks: bigint;
  ad_clicks: bigint;
  total_clicks: bigint;
};

type FunnelQualityRow = {
  list_sessions: bigint;
  detail_sessions: bigint;
  plan_sessions: bigint;
  commercial_sessions: bigint;
  missing_session_events: bigint;
  missing_visitor_events: bigint;
  not_found_views: bigint;
  unknown_device_events: bigint;
  high_frequency_visitor_days: bigint;
  device_segments: unknown;
  source_segments: unknown;
  product_segments: unknown;
};

type FunnelSegment = {
  key: string;
  label: string;
  listSessions: number;
  detailSessions: number;
  planSessions: number;
  commercialSessions: number;
};

const DASHBOARD_INTERACTION_EVENT_KEYS = [
  "select_plan",
  "open_share_modal",
  "copy_share_link",
  "download_share_image",
  "share_to_social",
  "search_digital_service",
] as const;

function formatNumber(value: number | string) {
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("zh-CN").format(value);
}

function toCount(value: bigint | number | null | undefined) {
  return Number(value || 0);
}

function formatConversion(current: number, previous: number) {
  if (previous <= 0) return "0%";
  return `${Math.round((current / previous) * 100)}%`;
}

function normalizeFunnelSegments(value: unknown): FunnelSegment[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const row = item as Record<string, unknown>;
    const key = String(row.key || "").trim();

    if (!key) return [];

    return [{
      key,
      label: String(row.label || key),
      listSessions: Number(row.listSessions || 0),
      detailSessions: Number(row.detailSessions || 0),
      planSessions: Number(row.planSessions || 0),
      commercialSessions: Number(row.commercialSessions || 0),
    }];
  });
}

function getUtcDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getTodayUtc() {
  return getUtcDateOnly(new Date());
}

function getTodayStartUtc() {
  return getTodayUtc();
}

function getRangeStartUtc(days: number) {
  const today = getTodayUtc();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return start;
}

function getRangeEndExclusiveUtc() {
  const today = getTodayUtc();
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

function formatMonthDay(date: Date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeRange(value?: string): DashboardRange {
  if (value === "30") return 30;
  if (value === "90") return 90;
  if (value === "180") return 180;
  if (value === "365") return 365;
  if (value === "730") return 730;
  return 7;
}

function parseDateInput(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || formatDateInput(date) !== value) {
    return null;
  }

  return date;
}

function getDashboardPeriod(params: {
  range?: string;
  from?: string;
  to?: string;
}): DashboardPeriod {
  const range = normalizeRange(params.range);
  const today = getTodayUtc();
  const defaultStart = getRangeStartUtc(range);
  const defaultPeriod = {
    range,
    days: range,
    start: defaultStart,
    endExclusive: getRangeEndExclusiveUtc(),
    from: formatDateInput(defaultStart),
    to: formatDateInput(today),
    isCustom: false,
  } satisfies DashboardPeriod;

  if (!params.from && !params.to) {
    return defaultPeriod;
  }

  const from = parseDateInput(params.from);
  const to = parseDateInput(params.to);

  if (!from || !to) {
    return {
      ...defaultPeriod,
      error: "请选择完整且有效的开始与结束日期。",
    };
  }

  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

  if (days < 1 || days > 730 || to > today) {
    return {
      ...defaultPeriod,
      error: "自定义范围需在今天以前，且不能超过 730 天。",
    };
  }

  const endExclusive = new Date(to);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  return {
    range,
    days,
    start: from,
    endExclusive,
    from: formatDateInput(from),
    to: formatDateInput(to),
    isCustom: true,
  };
}

function getBucketSize(days: number) {
  if (days <= 30) return 1;
  if (days <= 90) return 3;
  if (days <= 180) return 7;
  if (days <= 365) return 14;
  return 30;
}

function productionEventWhere(
  extra: Prisma.EventLogWhereInput = {}
): Prisma.EventLogWhereInput {
  return {
    ...extra,
    NOT: [
      {
        pagePath: {
          startsWith: "/zh/tracking-test",
        },
      },
      {
        source: {
          in: ["manual_test", "affiliate_test"],
        },
      },
      {
        eventKey: "test_event",
      },
    ],
  };
}

function eventNameZh(eventKey: string) {
  const map: Record<string, string> = {
    page_view: "页面访问",
    click_digital_service_card: "服务卡片点击",
    click_digital_service_sidebar: "服务切换",
    click_internal_link: "内部链接点击",
    click_official: "官方入口点击",
    click_affiliate: "Affiliate 点击",
    click_button: "按钮点击",
    click_ad: "广告点击",
    select_plan: "套餐切换",
    click_country: "地区点击",
    open_share_modal: "打开分享弹窗",
    copy_link: "复制链接",
    copy_share_link: "复制分享链接",
    download_share_image: "下载分享图",
    share_to_social: "分享到社交平台",
    search_digital_service: "搜索数字服务",
  };

  return map[eventKey] || eventKey;
}

function sourceNameZh(source?: string | null) {
  const map: Record<string, string> = {
    frontend_auto: "自动访问埋点",
    frontend_click: "前台点击埋点",
    tracked_link: "链接点击",
    tracked_button: "按钮点击",
    segmented_control: "分段选项切换",
  };

  if (!source) return "未知来源";
  return map[source] || source;
}

function trafficSourceNameZh(source: string) {
  const map: Record<string, string> = {
    direct: "直接访问",
    internal: "站内跳转",
    search: "搜索引擎",
    social: "社交平台",
    referral: "外部引荐",
  };

  return map[source] || source;
}

function commercialEntryNameZh(value: string) {
  const map: Record<string, string> = {
    affiliate_box: "Affiliate 推荐位",
    product_hero: "产品页主入口",
    pricing_card: "价格卡片",
    product_sidebar: "产品侧栏",
    ad_slot: "广告位",
    frontend_click: "前台点击",
    tracked_link: "追踪链接",
    tracked_button: "追踪按钮",
    unmarked: "未标记入口",
  };

  return map[value] || value;
}

function deviceNameZh(deviceType?: string | null) {
  if (deviceType === "mobile") return "移动端";
  if (deviceType === "tablet") return "平板";
  if (deviceType === "desktop") return "桌面端";
  return "未知设备";
}

function pageNameZh(pagePath?: string | null) {
  if (!pagePath) return "未知页面";

  const path = pagePath.split("?")[0].replace(/\/$/, "");

  if (path === "/zh" || path === "") return "中文首页";
  if (path === "/zh/ai-pricing") return "AI 定价列表页";
  if (path === "/zh/ai-pricing/chatgpt") return "ChatGPT 价格页";
  if (path === "/zh/streaming-pricing") return "流媒体定价列表页";
  if (path === "/en/ai-pricing") return "英文 AI 定价列表页";
  if (path === "/en/streaming-pricing") return "英文流媒体定价列表页";

  if (path.startsWith("/zh/ai-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "数字服务";
    return `${slug} 价格页`;
  }

  if (path.startsWith("/zh/streaming-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "流媒体服务";
    return `${slug} 流媒体价格页`;
  }

  if (path.startsWith("/en/ai-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "AI service";
    return `${slug} 英文价格页`;
  }

  if (path.startsWith("/en/streaming-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "streaming service";
    return `${slug} 英文流媒体价格页`;
  }

  if (path.startsWith("/zh/articles/")) return "文章详情页";
  if (path.startsWith("/zh/guides/")) return "教程详情页";

  return path;
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const seconds = Math.max(1, Math.floor(diff / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return "刚刚";
}

function DashboardPanel({
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
          <Link
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            {actionLabel}
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        ) : null}
      </div>

      {children}
    </AdminCard>
  );
}

function buildTrendSeriesFromDailyStats({
  stats,
  period,
}: {
  stats: Array<{
    statDate: Date;
    metricKey: string;
    metricValue: number;
  }>;
  period: DashboardPeriod;
}) {
  const start = period.start;
  const bucketSize = getBucketSize(period.days);
  const days = [];

  for (let i = 0; i < period.days; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    days.push(date);
  }

  const statMap = new Map<string, { pageViews: number; clicks: number }>();

  for (const item of stats) {
    const key = item.statDate.toISOString().slice(0, 10);
    const current = statMap.get(key) || { pageViews: 0, clicks: 0 };

    if (item.metricKey === "page_views") {
      current.pageViews = item.metricValue;
    }

    if (item.metricKey === "click_events") {
      current.clicks = item.metricValue;
    }

    statMap.set(key, current);
  }

  const daily = days.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const stat = statMap.get(key) || { pageViews: 0, clicks: 0 };

    return {
      date,
      pageViews: stat.pageViews,
      clicks: stat.clicks,
    };
  });

  const grouped = [];

  for (let i = 0; i < daily.length; i += bucketSize) {
    const chunk = daily.slice(i, i + bucketSize);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];

    grouped.push({
      label:
        bucketSize === 1
          ? formatMonthDay(first.date)
          : `${formatMonthDay(first.date)}-${formatMonthDay(last.date)}`,
      pageViews: chunk.reduce((sum, item) => sum + item.pageViews, 0),
      clicks: chunk.reduce((sum, item) => sum + item.clicks, 0),
    });
  }

  return grouped;
}

function shouldShowTrendLabel(index: number, total: number, days: number) {
  if (total <= 10) return true;
  if (index === 0 || index === total - 1) return true;

  if (days <= 30) return index % 3 === 0;
  if (days <= 90) return index % 2 === 0;
  if (days <= 180) return index % 3 === 0;
  if (days <= 365) return index % 3 === 0;
  if (days <= 730) return index % 4 === 0;

  return index % 2 === 0;
}

function TrendChart({
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
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
          <button
            type="submit"
            className="h-9 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-blue-700"
          >
            应用
          </button>
          </form>

          {period.error ? (
            <p className="text-xs font-medium text-red-600">{period.error}</p>
          ) : null}
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700">访问量</p>
          <p className="mt-1 text-2xl font-bold text-blue-950">
            {formatNumber(totalPageViews)}
          </p>
        </div>

        <div className="rounded-2xl bg-indigo-50 px-4 py-3">
          <p className="text-xs font-semibold text-indigo-700">点击事件</p>
          <p className="mt-1 text-2xl font-bold text-indigo-950">
            {formatNumber(totalClicks)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-50 px-3 py-4 sm:px-5">
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

function RankingList({
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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const content = (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40">
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
          <Link key={item.label} href={item.href} className="block">
            {content}
          </Link>
        );
      })}
    </div>
  );
}

function FunnelSegmentList({
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

async function getDashboardData(period: DashboardPeriod) {
  const todayStart = getTodayStartUtc();
  const staleSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    summaryRows,
    trendStats,
    serviceHeatRows,
    commercialAttributionRows,
    funnelQualityRows,
    recentEvents,
  ] = await Promise.all([
    prisma.$queryRaw<DashboardSummaryRow[]>`
      WITH production_events AS (
        SELECT event_key
        FROM event_logs
        WHERE created_at >= ${todayStart}
          AND NOT (
            COALESCE(page_path, '') LIKE '/zh/tracking-test%'
            OR COALESCE(source, '') IN ('manual_test', 'affiliate_test')
            OR event_key = 'test_event'
          )
      ),
      event_summary AS (
        SELECT
          COUNT(*) FILTER (WHERE event_key = 'page_view')::bigint AS today_page_views,
          COUNT(*) FILTER (
            WHERE event_key LIKE 'click_%'
              OR event_key IN (${Prisma.join(DASHBOARD_INTERACTION_EVENT_KEYS)})
          )::bigint AS today_click_events,
          COUNT(*) FILTER (WHERE event_key = 'click_affiliate')::bigint AS today_affiliate_clicks,
          COUNT(*) FILTER (WHERE event_key = 'click_official')::bigint AS today_official_clicks,
          COUNT(*) FILTER (WHERE event_key = 'click_button')::bigint AS today_button_clicks
        FROM production_events
      ),
      price_summary AS (
        SELECT
          COUNT(*)::bigint AS region_prices,
          COUNT(*) FILTER (
            WHERE confidence_score < 60
              OR last_checked_at IS NULL
              OR last_checked_at < ${staleSince}
              OR primary_source_id IS NULL
          )::bigint AS price_anomalies,
          COUNT(*) FILTER (
            WHERE last_checked_at IS NULL OR last_checked_at < ${staleSince}
          )::bigint AS stale_prices,
          COUNT(*) FILTER (WHERE confidence_score < 60)::bigint AS low_confidence_prices,
          COUNT(*) FILTER (WHERE primary_source_id IS NULL)::bigint AS missing_source_prices
        FROM region_prices
      )
      SELECT
        event_summary.*,
        (SELECT COUNT(*)::bigint FROM products) AS digital_services,
        (SELECT COUNT(*)::bigint FROM plans) AS plans,
        (SELECT COUNT(*)::bigint FROM countries) AS countries,
        price_summary.region_prices,
        (SELECT COUNT(*)::bigint FROM articles) AS articles,
        (
          SELECT COUNT(*)::bigint
          FROM review_queue
          WHERE status = 'pending'
        ) AS pending_reviews,
        price_summary.price_anomalies,
        price_summary.stale_prices,
        price_summary.low_confidence_prices,
        price_summary.missing_source_prices,
        (
          SELECT COUNT(*)::bigint
          FROM products product
          WHERE product.status = 'published'
            AND NOT EXISTS (
              SELECT 1
              FROM seo_meta seo
              WHERE seo.product_id = product.id
                AND seo.status = 'published'
            )
        ) AS missing_seo_services,
        (
          SELECT COUNT(*)::bigint
          FROM products product
          WHERE product.status = 'published'
            AND NOT EXISTS (
              SELECT 1
              FROM faqs faq
              WHERE faq.product_id = product.id
                AND faq.status = 'published'
            )
        ) AS missing_faq_services,
        (
          SELECT COUNT(*)::bigint
          FROM articles
          WHERE status = 'draft'
        ) AS draft_articles
      FROM event_summary
      CROSS JOIN price_summary
    `,
    prisma.dailyStat.findMany({
      where: {
        statDate: {
          gte: period.start,
          lt: period.endExclusive,
        },
        metricKey: {
          in: ["page_views", "click_events"],
        },
        dimensionType: "global",
        dimensionKey: "global",
      },
      select: {
        statDate: true,
        metricKey: true,
        metricValue: true,
      },
      orderBy: {
        statDate: "asc",
      },
    }),
    prisma.$queryRaw<ServiceHeatRow[]>`
      WITH normalized_events AS (
        SELECT
          event.event_key,
          event.anonymous_id,
          COALESCE(
            direct_product.slug,
            NULLIF(SPLIT_PART(event.button_key, ':', 1), ''),
            CASE
              WHEN event.page_path ~ '^/(zh|en)/(ai-pricing|streaming-pricing)/[^/?]+'
              THEN SPLIT_PART(SPLIT_PART(event.page_path, '?', 1), '/', 4)
              ELSE NULL
            END
          ) AS product_slug
        FROM event_logs event
        LEFT JOIN products direct_product ON direct_product.id = event.product_id
        WHERE event.created_at >= ${period.start}
          AND event.created_at < ${period.endExclusive}
          AND (
            event.event_key = 'page_view'
            OR event.event_key LIKE 'click_%'
            OR event.event_key IN (${Prisma.join(DASHBOARD_INTERACTION_EVENT_KEYS)})
          )
          AND NOT (
            COALESCE(event.page_path, '') LIKE '/zh/tracking-test%'
            OR COALESCE(event.source, '') IN ('manual_test', 'affiliate_test')
            OR event.event_key = 'test_event'
          )
      )
      SELECT
        product.id::text AS id,
        product.slug,
        product.name,
        COUNT(*) FILTER (WHERE event.event_key = 'page_view')::bigint AS page_views,
        COUNT(*) FILTER (WHERE event.event_key <> 'page_view')::bigint AS interactions,
        COUNT(DISTINCT event.anonymous_id)::bigint AS unique_visitors,
        (
          COUNT(*) FILTER (WHERE event.event_key = 'page_view')
          + COUNT(*) FILTER (WHERE event.event_key <> 'page_view') * 3
        )::bigint AS heat_score
      FROM products product
      JOIN normalized_events event ON event.product_slug = product.slug
      WHERE product.status = 'published'
      GROUP BY product.id, product.slug, product.name
      ORDER BY heat_score DESC, unique_visitors DESC, product.name ASC
      LIMIT 5
    `,
    prisma.$queryRaw<CommercialAttributionRow[]>`
      WITH commercial_events AS (
        SELECT
          event.event_key,
          COALESCE(
            direct_product.slug,
            NULLIF(SPLIT_PART(event.button_key, ':', 1), ''),
            CASE
              WHEN event.page_path ~ '^/(zh|en)/(ai-pricing|streaming-pricing)/[^/?]+'
              THEN SPLIT_PART(SPLIT_PART(event.page_path, '?', 1), '/', 4)
              ELSE NULL
            END
          ) AS product_slug,
          COALESCE(
            NULLIF(event.placement, ''),
            NULLIF(event.button_key, ''),
            NULLIF(event.source, ''),
            'unmarked'
          ) AS entry_key
        FROM event_logs event
        LEFT JOIN products direct_product ON direct_product.id = event.product_id
        WHERE event.created_at >= ${period.start}
          AND event.created_at < ${period.endExclusive}
          AND event.event_key IN ('click_affiliate', 'click_official', 'click_ad')
          AND NOT (
            COALESCE(event.page_path, '') LIKE '/zh/tracking-test%'
            OR COALESCE(event.source, '') IN ('manual_test', 'affiliate_test')
            OR event.event_key = 'test_event'
          )
      ),
      product_groups AS (
        SELECT
          'product'::text AS group_kind,
          product.slug AS key,
          product.name AS label,
          COUNT(*) FILTER (WHERE event.event_key = 'click_affiliate')::bigint AS affiliate_clicks,
          COUNT(*) FILTER (WHERE event.event_key = 'click_official')::bigint AS official_clicks,
          COUNT(*) FILTER (WHERE event.event_key = 'click_ad')::bigint AS ad_clicks,
          COUNT(*)::bigint AS total_clicks
        FROM commercial_events event
        JOIN products product ON product.slug = event.product_slug
        WHERE product.status = 'published'
        GROUP BY product.slug, product.name
      ),
      entry_groups AS (
        SELECT
          'entry'::text AS group_kind,
          event.entry_key AS key,
          event.entry_key AS label,
          COUNT(*) FILTER (WHERE event.event_key = 'click_affiliate')::bigint AS affiliate_clicks,
          COUNT(*) FILTER (WHERE event.event_key = 'click_official')::bigint AS official_clicks,
          COUNT(*) FILTER (WHERE event.event_key = 'click_ad')::bigint AS ad_clicks,
          COUNT(*)::bigint AS total_clicks
        FROM commercial_events event
        GROUP BY event.entry_key
      )
      SELECT * FROM product_groups
      UNION ALL
      SELECT * FROM entry_groups
    `,
    prisma.$queryRaw<FunnelQualityRow[]>`
      WITH production_events AS (
        SELECT
          event.id,
          event.event_key,
          event.page_path,
          event.page_title,
          event.session_id,
          event.anonymous_id,
          event.device_type,
          event.referrer,
          event.source,
          event.created_at
        FROM event_logs event
        WHERE event.created_at >= ${period.start}
          AND event.created_at < ${period.endExclusive}
          AND NOT (
            COALESCE(event.page_path, '') LIKE '/zh/tracking-test%'
            OR COALESCE(event.source, '') IN ('manual_test', 'affiliate_test')
            OR event.event_key = 'test_event'
          )
      ),
      anonymous_event_gaps AS (
        SELECT
          event.*,
          LAG(event.created_at) OVER (
            PARTITION BY event.anonymous_id
            ORDER BY event.created_at, event.id
          ) AS previous_event_at
        FROM production_events event
        WHERE NULLIF(event.session_id, '') IS NULL
          AND NULLIF(event.anonymous_id, '') IS NOT NULL
      ),
      anonymous_sessionized AS (
        SELECT
          event.*,
          CONCAT(
            'anonymous:',
            event.anonymous_id,
            ':',
            SUM(
              CASE
                WHEN event.previous_event_at IS NULL
                  OR event.created_at - event.previous_event_at > INTERVAL '30 minutes'
                THEN 1
                ELSE 0
              END
            ) OVER (
              PARTITION BY event.anonymous_id
              ORDER BY event.created_at, event.id
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            )
          ) AS session_key
        FROM anonymous_event_gaps event
      ),
      sessionized_events AS (
        SELECT
          event.id,
          event.event_key,
          event.page_path,
          event.page_title,
          event.device_type,
          event.referrer,
          event.source,
          event.created_at,
          CONCAT('session:', event.session_id) AS session_key
        FROM production_events event
        WHERE NULLIF(event.session_id, '') IS NOT NULL

        UNION ALL

        SELECT
          event.id,
          event.event_key,
          event.page_path,
          event.page_title,
          event.device_type,
          event.referrer,
          event.source,
          event.created_at,
          event.session_key
        FROM anonymous_sessionized event
      ),
      list_starts AS (
        SELECT DISTINCT ON (event.session_key)
          event.session_key,
          event.created_at AS list_at,
          COALESCE(NULLIF(event.device_type, ''), 'unknown') AS device_key,
          CASE
            WHEN COALESCE(event.referrer, '') = '' THEN 'direct'
            WHEN event.referrer ILIKE '%geosub.org%'
              OR event.referrer ILIKE '%localhost%'
              OR event.referrer ILIKE '%127.0.0.1%'
            THEN 'internal'
            WHEN event.referrer ILIKE '%google.%'
              OR event.referrer ILIKE '%bing.%'
              OR event.referrer ILIKE '%baidu.%'
              OR event.referrer ILIKE '%duckduckgo.%'
              OR event.referrer ILIKE '%yahoo.%'
            THEN 'search'
            WHEN event.referrer ILIKE '%x.com%'
              OR event.referrer ILIKE '%twitter.%'
              OR event.referrer ILIKE '%facebook.%'
              OR event.referrer ILIKE '%reddit.%'
              OR event.referrer ILIKE '%t.me%'
            THEN 'social'
            ELSE 'referral'
          END AS source_key
        FROM sessionized_events event
        WHERE event.event_key = 'page_view'
          AND SPLIT_PART(COALESCE(event.page_path, ''), '?', 1)
            ~ '^/(zh|en)/(ai-pricing|streaming-pricing)/?$'
        ORDER BY event.session_key, event.created_at, event.id
      ),
      detail_starts AS (
        SELECT DISTINCT ON (list.session_key)
          list.session_key,
          event.created_at AS detail_at,
          CASE
            WHEN SPLIT_PART(COALESCE(event.page_path, ''), '?', 1)
              ~ '^/(zh|en)/(ai-pricing|streaming-pricing)/[^/]+/?$'
            THEN SPLIT_PART(SPLIT_PART(event.page_path, '?', 1), '/', 4)
            ELSE NULL
          END AS product_slug
        FROM list_starts list
        JOIN sessionized_events event
          ON event.session_key = list.session_key
          AND event.created_at >= list.list_at
        WHERE (
            event.event_key = 'page_view'
            AND SPLIT_PART(COALESCE(event.page_path, ''), '?', 1)
              ~ '^/(zh|en)/(ai-pricing|streaming-pricing)/[^/]+/?$'
          )
          OR event.event_key = 'view_digital_service'
        ORDER BY list.session_key, event.created_at, event.id
      ),
      plan_starts AS (
        SELECT
          detail.session_key,
          MIN(event.created_at) AS plan_at
        FROM detail_starts detail
        JOIN sessionized_events event
          ON event.session_key = detail.session_key
          AND event.created_at >= detail.detail_at
        WHERE event.event_key = 'select_plan'
        GROUP BY detail.session_key
      ),
      commercial_starts AS (
        SELECT
          plan.session_key,
          MIN(event.created_at) AS commercial_at
        FROM plan_starts plan
        JOIN sessionized_events event
          ON event.session_key = plan.session_key
          AND event.created_at >= plan.plan_at
        WHERE event.event_key IN ('click_affiliate', 'click_official', 'click_ad')
        GROUP BY plan.session_key
      ),
      session_funnel AS (
        SELECT
          list.session_key,
          list.device_key,
          list.source_key,
          detail.product_slug,
          list.list_at,
          detail.detail_at,
          plan.plan_at,
          commercial.commercial_at
        FROM list_starts list
        LEFT JOIN detail_starts detail ON detail.session_key = list.session_key
        LEFT JOIN plan_starts plan ON plan.session_key = list.session_key
        LEFT JOIN commercial_starts commercial ON commercial.session_key = list.session_key
      ),
      device_segments AS (
        SELECT
          funnel.device_key AS key,
          funnel.device_key AS label,
          COUNT(*)::bigint AS list_sessions,
          COUNT(*) FILTER (WHERE funnel.detail_at IS NOT NULL)::bigint AS detail_sessions,
          COUNT(*) FILTER (WHERE funnel.plan_at IS NOT NULL)::bigint AS plan_sessions,
          COUNT(*) FILTER (WHERE funnel.commercial_at IS NOT NULL)::bigint AS commercial_sessions
        FROM session_funnel funnel
        GROUP BY funnel.device_key
      ),
      source_segments AS (
        SELECT
          funnel.source_key AS key,
          funnel.source_key AS label,
          COUNT(*)::bigint AS list_sessions,
          COUNT(*) FILTER (WHERE funnel.detail_at IS NOT NULL)::bigint AS detail_sessions,
          COUNT(*) FILTER (WHERE funnel.plan_at IS NOT NULL)::bigint AS plan_sessions,
          COUNT(*) FILTER (WHERE funnel.commercial_at IS NOT NULL)::bigint AS commercial_sessions
        FROM session_funnel funnel
        GROUP BY funnel.source_key
      ),
      product_segments AS (
        SELECT
          product.slug AS key,
          product.name AS label,
          COUNT(*)::bigint AS list_sessions,
          COUNT(*)::bigint AS detail_sessions,
          COUNT(*) FILTER (WHERE funnel.plan_at IS NOT NULL)::bigint AS plan_sessions,
          COUNT(*) FILTER (WHERE funnel.commercial_at IS NOT NULL)::bigint AS commercial_sessions
        FROM session_funnel funnel
        JOIN products product ON product.slug = funnel.product_slug
        WHERE funnel.detail_at IS NOT NULL
        GROUP BY product.slug, product.name
      ),
      high_frequency_visitor_days AS (
        SELECT
          event.anonymous_id,
          DATE_TRUNC('day', event.created_at) AS event_day
        FROM production_events event
        WHERE NULLIF(event.anonymous_id, '') IS NOT NULL
        GROUP BY event.anonymous_id, DATE_TRUNC('day', event.created_at)
        HAVING COUNT(*) >= 100
      )
      SELECT
        (SELECT COUNT(*)::bigint FROM list_starts) AS list_sessions,
        (SELECT COUNT(*)::bigint FROM detail_starts) AS detail_sessions,
        (SELECT COUNT(*)::bigint FROM plan_starts) AS plan_sessions,
        (SELECT COUNT(*)::bigint FROM commercial_starts) AS commercial_sessions,
        COUNT(*) FILTER (WHERE NULLIF(event.session_id, '') IS NULL)::bigint AS missing_session_events,
        COUNT(*) FILTER (WHERE NULLIF(event.anonymous_id, '') IS NULL)::bigint AS missing_visitor_events,
        COUNT(*) FILTER (
          WHERE event.event_key = 'page_view'
            AND (
              COALESCE(event.page_title, '') ILIKE '404%'
              OR COALESCE(event.page_title, '') ILIKE '%not found%'
            )
        )::bigint AS not_found_views,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(event.device_type, ''), 'unknown') = 'unknown'
        )::bigint AS unknown_device_events,
        (SELECT COUNT(*)::bigint FROM high_frequency_visitor_days) AS high_frequency_visitor_days,
        COALESCE((
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'key', segment.key,
              'label', segment.label,
              'listSessions', segment.list_sessions,
              'detailSessions', segment.detail_sessions,
              'planSessions', segment.plan_sessions,
              'commercialSessions', segment.commercial_sessions
            ) ORDER BY segment.list_sessions DESC, segment.label ASC
          )
          FROM device_segments segment
        ), '[]'::jsonb) AS device_segments,
        COALESCE((
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'key', segment.key,
              'label', segment.label,
              'listSessions', segment.list_sessions,
              'detailSessions', segment.detail_sessions,
              'planSessions', segment.plan_sessions,
              'commercialSessions', segment.commercial_sessions
            ) ORDER BY segment.list_sessions DESC, segment.label ASC
          )
          FROM source_segments segment
        ), '[]'::jsonb) AS source_segments,
        COALESCE((
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'key', segment.key,
              'label', segment.label,
              'listSessions', segment.list_sessions,
              'detailSessions', segment.detail_sessions,
              'planSessions', segment.plan_sessions,
              'commercialSessions', segment.commercial_sessions
            ) ORDER BY segment.list_sessions DESC, segment.label ASC
          )
          FROM product_segments segment
        ), '[]'::jsonb) AS product_segments
      FROM production_events event
    `,
    prisma.eventLog.findMany({
      where: productionEventWhere({}),
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        eventKey: true,
        pagePath: true,
        source: true,
        deviceType: true,
        buttonKey: true,
        createdAt: true,
      },
    }),
  ]);

  const summary = summaryRows[0];
  const todayPageViews = toCount(summary?.today_page_views);
  const todayClickEvents = toCount(summary?.today_click_events);
  const todayAffiliateClicks = toCount(summary?.today_affiliate_clicks);
  const todayOfficialClicks = toCount(summary?.today_official_clicks);
  const todayButtonClicks = toCount(summary?.today_button_clicks);
  const includesToday =
    period.start <= getTodayUtc() && period.endExclusive > getTodayUtc();

  const trend = buildTrendSeriesFromDailyStats({
    stats: [
      ...trendStats,
      ...(includesToday
        ? [
            {
              statDate: getTodayUtc(),
              metricKey: "page_views",
              metricValue: todayPageViews,
            },
            {
              statDate: getTodayUtc(),
              metricKey: "click_events",
              metricValue: todayClickEvents,
            },
          ]
        : []),
    ],
    period,
  });

  const topServices = serviceHeatRows.map((service) => ({
    label: service.name,
    description: `${toCount(service.page_views)} 次访问 · ${toCount(
      service.interactions,
    )} 次互动 · ${toCount(service.unique_visitors)} 位访客`,
    value: toCount(service.heat_score),
    href: `/admin/products/${service.id}/edit`,
  }));
  const commercialProducts = commercialAttributionRows
    .filter((row) => row.group_kind === "product")
    .sort((a, b) => toCount(b.total_clicks) - toCount(a.total_clicks))
    .slice(0, 3)
    .map((row) => ({
      label: row.label,
      description: `Affiliate ${toCount(row.affiliate_clicks)} · 官方 ${toCount(
        row.official_clicks,
      )} · 广告 ${toCount(row.ad_clicks)}`,
      value: toCount(row.total_clicks),
    }));
  const commercialEntries = commercialAttributionRows
    .filter((row) => row.group_kind === "entry")
    .sort((a, b) => toCount(b.total_clicks) - toCount(a.total_clicks));
  const commercialTotals = commercialEntries.reduce(
    (totals, row) => ({
      affiliate: totals.affiliate + toCount(row.affiliate_clicks),
      official: totals.official + toCount(row.official_clicks),
      ads: totals.ads + toCount(row.ad_clicks),
      all: totals.all + toCount(row.total_clicks),
    }),
    { affiliate: 0, official: 0, ads: 0, all: 0 },
  );
  const funnelQuality = funnelQualityRows[0];
  const funnel = {
    list: toCount(funnelQuality?.list_sessions),
    detail: toCount(funnelQuality?.detail_sessions),
    plan: toCount(funnelQuality?.plan_sessions),
    commercial: toCount(funnelQuality?.commercial_sessions),
  };
  const trafficQuality = {
    missingSessionEvents: toCount(funnelQuality?.missing_session_events),
    missingVisitorEvents: toCount(funnelQuality?.missing_visitor_events),
    notFoundViews: toCount(funnelQuality?.not_found_views),
    unknownDeviceEvents: toCount(funnelQuality?.unknown_device_events),
    highFrequencyVisitorDays: toCount(
      funnelQuality?.high_frequency_visitor_days,
    ),
  };
  const funnelSegments = {
    products: normalizeFunnelSegments(funnelQuality?.product_segments).slice(0, 5),
    devices: normalizeFunnelSegments(funnelQuality?.device_segments).map(
      (segment) => ({ ...segment, label: deviceNameZh(segment.key) }),
    ),
    sources: normalizeFunnelSegments(funnelQuality?.source_segments).map(
      (segment) => ({ ...segment, label: trafficSourceNameZh(segment.key) }),
    ),
  };

  return {
    todayPageViews,
    todayClickEvents,
    todayAffiliateClicks,
    todayOfficialClicks,
    todayButtonClicks,
    trend,
    digitalServices: toCount(summary?.digital_services),
    plans: toCount(summary?.plans),
    countries: toCount(summary?.countries),
    regionPrices: toCount(summary?.region_prices),
    articles: toCount(summary?.articles),
    pendingReviews: toCount(summary?.pending_reviews),
    priceAnomalies: toCount(summary?.price_anomalies),
    stalePrices: toCount(summary?.stale_prices),
    lowConfidencePrices: toCount(summary?.low_confidence_prices),
    missingSourcePrices: toCount(summary?.missing_source_prices),
    missingSeoServices: toCount(summary?.missing_seo_services),
    missingFaqServices: toCount(summary?.missing_faq_services),
    draftArticles: toCount(summary?.draft_articles),
    topServices,
    commercialProducts,
    commercialEntries,
    commercialTotals,
    funnel,
    funnelSegments,
    trafficQuality,
    recentEvents,
  };
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const period = getDashboardPeriod(params);
  const data = await getDashboardData(period);
  const eventLogHref = `/admin/events?from=${period.from}&to=${period.to}`;
  const funnelStages = [
    {
      label: "进入价格列表",
      description: "列表页起始会话",
      value: data.funnel.list,
      conversion: data.funnel.list > 0 ? 100 : 0,
      conversionLabel: "漏斗起点",
    },
    {
      label: "查看产品详情",
      description: "同会话且晚于列表访问",
      value: data.funnel.detail,
      conversion:
        data.funnel.list > 0
          ? Math.min(100, Math.round((data.funnel.detail / data.funnel.list) * 100))
          : 0,
      conversionLabel: formatConversion(data.funnel.detail, data.funnel.list),
    },
    {
      label: "切换套餐",
      description: "详情页后的套餐互动",
      value: data.funnel.plan,
      conversion:
        data.funnel.detail > 0
          ? Math.min(100, Math.round((data.funnel.plan / data.funnel.detail) * 100))
          : 0,
      conversionLabel: formatConversion(data.funnel.plan, data.funnel.detail),
    },
    {
      label: "进入商业入口",
      description: "套餐互动后的外链或广告点击",
      value: data.funnel.commercial,
      conversion:
        data.funnel.plan > 0
          ? Math.min(
              100,
              Math.round((data.funnel.commercial / data.funnel.plan) * 100),
            )
          : 0,
      conversionLabel: formatConversion(
        data.funnel.commercial,
        data.funnel.plan,
      ),
    },
  ];
  const trafficChecks = [
    {
      label: "会话 ID 缺失事件",
      description: "旧埋点或异常请求，影响严格漏斗精度",
      value: data.trafficQuality.missingSessionEvents,
      href: `${eventLogHref}&quality=missing-session`,
    },
    {
      label: "访客 ID 缺失事件",
      description: "无法归属到匿名访客的事件",
      value: data.trafficQuality.missingVisitorEvents,
      href: `${eventLogHref}&quality=missing-visitor`,
    },
    {
      label: "404 页面访问",
      description: "页面标题被识别为 404 或 not found",
      value: data.trafficQuality.notFoundViews,
      href: `${eventLogHref}&quality=not-found`,
    },
    {
      label: "未知设备事件",
      description: "请求未提供可识别的 User-Agent",
      value: data.trafficQuality.unknownDeviceEvents,
      href: `${eventLogHref}&quality=unknown-device`,
    },
    {
      label: "高频访客日",
      description: "同一匿名访客单日产生至少 100 个事件",
      value: data.trafficQuality.highFrequencyVisitorDays,
      href: `${eventLogHref}&quality=automated`,
    },
  ];

  const assetStats = [
    {
      label: "服务库",
      value: data.digitalServices,
      helper: "订阅、软件、游戏、礼品卡与虚拟服务",
      href: "/admin/products",
    },
    {
      label: "套餐库",
      value: data.plans,
      helper: "服务下的套餐、周期与方案",
      href: "/admin/plans",
    },
    {
      label: "国家 / 地区",
      value: data.countries,
      helper: "支持价格对比地区",
    },
    {
      label: "价格库",
      value: data.regionPrices,
      helper: "国家、币种、折算价与来源",
      href: "/admin/prices",
    },
    {
      label: "文章",
      value: data.articles,
      helper: "内容系统文章",
      href: "/admin/articles",
    },
    {
      label: "导航菜单",
      value: "管理",
      helper: "Header、Footer 与子菜单",
      href: "/admin/navigation",
    },
  ];

  return (
    <div>
      <AdminPageHeader
        eyebrow="Dashboard"
        title="GeoSub 运营驾驶舱"
        description="总览页用于观察访问趋势、点击趋势、数字服务热度、商业化表现、数据异常和内容 SEO 健康度。"
      />

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard
          label="今日访问量"
          value={data.todayPageViews}
          helper="UTC 今日 · 实时读取 event_logs"
        />
        <AdminStatCard
          label="今日点击"
          value={data.todayClickEvents}
          helper="UTC 今日 · 实时读取前台交互事件"
        />
        <AdminStatCard
          label="Affiliate 点击"
          value={data.todayAffiliateClicks}
          helper="今日商业点击"
        />
        <AdminStatCard
          label="官方入口点击"
          value={data.todayOfficialClicks}
          helper="今日官方跳转"
        />
        <AdminStatCard
          label="待审核"
          value={data.pendingReviews}
          helper="等待处理的数据"
          href="/admin/review"
        />
        <AdminStatCard
          label="价格异常"
          value={data.priceAnomalies}
          helper="低置信度或缺来源"
          href="/admin/review"
        />
      </div>

      <div className="mb-8">
        <TrendChart period={period} trend={data.trend} />
      </div>

      <div className="mb-8 grid gap-5 2xl:grid-cols-[1.6fr_1fr]">
        <DashboardPanel
          title="严格会话转化漏斗"
          description="仅统计同一 30 分钟会话内按时间顺序完成的路径；直接进入详情页不会计入列表起始漏斗。"
          actionHref={eventLogHref}
          actionLabel="核对事件"
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 sm:grid sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {funnelStages.map((stage, index) => (
              <div
                key={stage.label}
                className="border-b border-slate-200 px-4 py-4 last:border-b-0 sm:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-blue-700">
                    第 {index + 1} 步
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {stage.conversionLabel}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-950">
                  {formatNumber(stage.value)}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {stage.label}
                </p>
                <p className="mt-1 min-h-8 text-xs leading-4 text-slate-400">
                  {stage.description}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${stage.conversion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            新埋点直接使用会话 ID；历史事件缺少会话 ID 时，按匿名访客 30 分钟无活动间隔回算，不跨会话拼接路径。
          </p>
        </DashboardPanel>

        <DashboardPanel
          title="流量质量监控"
          description="用于发现埋点缺失、失效页面和可能放大统计的异常高频访问。"
          actionHref={eventLogHref}
          actionLabel="查看明细"
        >
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {trafficChecks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between gap-4 py-3 transition hover:bg-blue-50/60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{item.label}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {item.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-base font-bold ${
                    item.value > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {formatNumber(item.value)}
                </span>
              </Link>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="mb-8">
        <DashboardPanel
          title="漏斗切片"
          description="产品从详情会话开始比较；设备和来源从列表会话开始比较。来源按首次列表访问的 Referrer 分类。"
          actionHref={eventLogHref}
          actionLabel="查看原始事件"
        >
          <div className="grid gap-6 lg:grid-cols-3 lg:divide-x lg:divide-slate-100">
            <FunnelSegmentList
              title="按产品"
              items={data.funnelSegments.products}
              baseline="detail"
            />
            <FunnelSegmentList
              title="按设备"
              items={data.funnelSegments.devices}
              baseline="list"
            />
            <FunnelSegmentList
              title="按来源"
              items={data.funnelSegments.sources}
              baseline="list"
            />
          </div>
        </DashboardPanel>
      </div>

      <div className="mb-8 grid gap-5 xl:grid-cols-3">
        <DashboardPanel
          title="服务热度排行"
          description="按所选时段的真实访问和互动计算；一次互动按 3 分计入热度，用于识别用户真正关注的产品。"
          actionHref="/admin/products"
          actionLabel="进入服务库"
        >
          <RankingList
            items={data.topServices}
            emptyText="所选时段暂无可归属到产品的正式访问或互动。"
          />
        </DashboardPanel>

        <DashboardPanel
          title="商业化归因"
          description="按所选时段拆分 Affiliate、官方入口和广告点击，并归属到产品与入口。"
          actionHref={`/admin/events?type=commercial&from=${period.from}&to=${period.to}`}
          actionLabel="查看日志"
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Affiliate", data.commercialTotals.affiliate],
              ["官方", data.commercialTotals.official],
              ["广告", data.commercialTotals.ads],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-slate-50 px-3 py-3 text-center">
                <div className="text-lg font-bold text-slate-950">{value}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">热门商业产品</p>
              <p className="text-xs text-slate-400">合计 {data.commercialTotals.all}</p>
            </div>
            <RankingList items={data.commercialProducts} emptyText="所选时段暂无商业点击。" />
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
            <MousePointerClick size={15} className="shrink-0" />
            <span className="truncate">
              主要入口：{data.commercialEntries[0]
                ? `${commercialEntryNameZh(data.commercialEntries[0].key)} · ${toCount(data.commercialEntries[0].total_clicks)} 次`
                : "暂无数据"}
            </span>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="内容 / SEO 健康度"
          description="用于判断哪些页面需要补 SEO、FAQ 或内容。"
          actionHref="/admin/seo"
          actionLabel="查看 SEO"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Search className="text-blue-700" size={18} strokeWidth={2} />
                <span className="text-sm font-semibold text-slate-700">
                  缺 SEO 的服务
                </span>
              </div>
              <span className="text-sm font-bold text-slate-950">
                {data.missingSeoServices}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-blue-700" size={18} strokeWidth={2} />
                <span className="text-sm font-semibold text-slate-700">
                  缺 FAQ 的服务
                </span>
              </div>
              <span className="text-sm font-bold text-slate-950">
                {data.missingFaqServices}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-700" size={18} strokeWidth={2} />
                <span className="text-sm font-semibold text-slate-700">
                  草稿文章
                </span>
              </div>
              <span className="text-sm font-bold text-slate-950">
                {data.draftArticles}
              </span>
            </div>
          </div>
        </DashboardPanel>
      </div>

      <div className="mb-8 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DashboardPanel
          title="数据异常与审核"
          description="GeoSub 是价格数据平台，异常监控是后台核心能力。"
          actionHref="/admin/review"
          actionLabel="进入审核"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-700" size={18} strokeWidth={2} />
                <span className="text-sm font-semibold text-amber-900">
                  长期未更新价格
                </span>
              </div>
              <span className="text-sm font-bold text-amber-950">
                {data.stalePrices}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-700" size={18} strokeWidth={2} />
                <span className="text-sm font-semibold text-red-900">
                  低置信度价格
                </span>
              </div>
              <span className="text-sm font-bold text-red-950">
                {data.lowConfidencePrices}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Globe2 className="text-slate-600" size={18} strokeWidth={2} />
                <span className="text-sm font-semibold text-slate-700">
                  缺少来源的价格
                </span>
              </div>
              <span className="text-sm font-bold text-slate-950">
                {data.missingSourcePrices}
              </span>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="基础资产统计"
          description="服务库、套餐库、价格库、内容、导航和商业化配置的基础规模。服务库 / 套餐库 / 价格库是 GeoSub 的核心数据资产。"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {assetStats.map((item) => (
              <AdminStatCard
                key={item.label}
                label={item.label}
                value={item.value}
                helper={item.helper}
                href={item.href}
              />
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="实时事件流"
        description="用于确认最近用户行为和埋点健康状态。这里隐藏测试页和手动测试数据，完整明细可进入事件日志筛选、分页和导出。"
        actionHref="/admin/events"
        actionLabel="查看全部"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {data.recentEvents.map((event, index) => (
            <div
              key={`${event.eventKey}-${event.createdAt.toISOString()}-${index}`}
              className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                {event.eventKey === "page_view" ? (
                  <Eye size={16} strokeWidth={2} />
                ) : (
                  <Activity size={16} strokeWidth={2} />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">
                  {eventNameZh(event.eventKey)}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {pageNameZh(event.pagePath)} · {deviceNameZh(event.deviceType)} ·{" "}
                  {timeAgo(event.createdAt)}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {sourceNameZh(event.source)}
                  {event.buttonKey ? ` · ${event.buttonKey}` : ""}
                </p>
              </div>
            </div>
          ))}

          {data.recentEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              暂无可展示的正式事件。
            </div>
          ) : null}
        </div>
      </DashboardPanel>

      <div className="mt-8">
        <AdminAlert title="下一步建议" variant="info">
          <p>
            先观察严格会话漏斗和流量质量，处理 404、身份缺失或异常高频访问；商业点击样本稳定后，再接入订单或收益数据计算单产品价值。
          </p>
        </AdminAlert>
      </div>
    </div>
  );
}

