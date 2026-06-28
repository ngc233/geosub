import Link from "next/link";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
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

function formatNumber(value: number | string) {
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("zh-CN").format(value);
}

function getUtcDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getTodayUtc() {
  return getUtcDateOnly(new Date());
}

function getTodayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getRangeStartUtc(days: DashboardRange) {
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

function normalizeRange(value?: string): DashboardRange {
  if (value === "30") return 30;
  if (value === "90") return 90;
  if (value === "180") return 180;
  if (value === "365") return 365;
  if (value === "730") return 730;
  return 7;
}

function getBucketSize(range: DashboardRange) {
  if (range <= 30) return 1;
  if (range <= 90) return 3;
  if (range <= 180) return 7;
  if (range <= 365) return 14;
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
    click_internal_link: "内部链接点击",
    click_official: "官方入口点击",
    click_affiliate: "Affiliate 点击",
    click_button: "按钮点击",
    click_ad: "广告点击",
    select_plan: "套餐切换",
    click_country: "地区点击",
    open_share_modal: "打开分享弹窗",
    copy_link: "复制链接",
    download_share_image: "下载分享图",
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
  };

  if (!source) return "未知来源";
  return map[source] || source;
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

  if (path.startsWith("/zh/ai-pricing/")) {
    const slug = path.split("/").filter(Boolean).pop() || "数字服务";
    return `${slug} 价格页`;
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
  range,
}: {
  stats: Array<{
    statDate: Date;
    metricKey: string;
    metricValue: number;
  }>;
  range: DashboardRange;
}) {
  const start = getRangeStartUtc(range);
  const bucketSize = getBucketSize(range);
  const days = [];

  for (let i = 0; i < range; i++) {
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

function shouldShowTrendLabel(index: number, total: number, range: DashboardRange) {
  if (total <= 10) return true;
  if (index === 0 || index === total - 1) return true;

  if (range === 30) return index % 3 === 0;
  if (range === 90) return index % 2 === 0;
  if (range === 180) return index % 3 === 0;
  if (range === 365) return index % 3 === 0;
  if (range === 730) return index % 4 === 0;

  return index % 2 === 0;
}

function TrendChart({
  range,
  trend,
}: {
  range: DashboardRange;
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
            趋势图读取 daily_stats 聚合表，适合长期查看 7 天到 24 个月的访问和点击变化。
          </p>
        </div>

        <SegmentedControl
          ariaLabel="Dashboard 时间范围"
          value={String(range)}
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
              disabled: true,
            },
          ]}
        />
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

      <div className="overflow-hidden rounded-3xl bg-slate-50 px-5 py-5">
        <div className="flex h-52 items-end gap-2">
          {trend.map((item, index) => {
            const pageHeight = Math.max(4, (item.pageViews / maxValue) * 100);
            const clickHeight = Math.max(4, (item.clicks / maxValue) * 100);

            return (
              <div
                key={item.label}
                className="flex flex-1 flex-col items-center gap-2"
                title={`${item.label}：访问 ${item.pageViews}，点击 ${item.clicks}`}
              >
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div
                    className="w-full rounded-t-lg bg-blue-600/80 transition hover:bg-blue-700"
                    style={{ height: `${pageHeight}%` }}
                  />
                  <div
                    className="w-full rounded-t-lg bg-indigo-400/80 transition hover:bg-indigo-500"
                    style={{ height: `${clickHeight}%` }}
                  />
                </div>
                <span className="h-4 max-w-16 truncate text-[10px] font-semibold text-slate-400">
                  {shouldShowTrendLabel(index, trend.length, range) ? item.label : ""}
                </span>
              </div>
            );
          })}
        </div>

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

async function getDashboardData(range: DashboardRange) {
  const todayStart = getTodayStart();
  const rangeStart = getRangeStartUtc(range);
  const rangeEnd = getRangeEndExclusiveUtc();
  const staleSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    todayPageViews,
    todayClickEvents,
    todayAffiliateClicks,
    todayOfficialClicks,
    todayButtonClicks,
    trendStats,
    digitalServices,
    plans,
    countries,
    regionPrices,
    articles,
    adSlots,
    affiliateLinks,
    siteSettings,
    pendingReviews,
    priceAnomalies,
    stalePrices,
    lowConfidencePrices,
    missingSourcePrices,
    missingSeoServices,
    missingFaqServices,
    draftArticles,
    topServicesRaw,
    recentEvents,
  ] = await Promise.all([
    prisma.eventLog.count({
      where: productionEventWhere({
        eventKey: "page_view",
        createdAt: {
          gte: todayStart,
        },
      }),
    }),
    prisma.eventLog.count({
      where: productionEventWhere({
        eventKey: {
          startsWith: "click_",
        },
        createdAt: {
          gte: todayStart,
        },
      }),
    }),
    prisma.eventLog.count({
      where: productionEventWhere({
        eventKey: "click_affiliate",
        createdAt: {
          gte: todayStart,
        },
      }),
    }),
    prisma.eventLog.count({
      where: productionEventWhere({
        eventKey: "click_official",
        createdAt: {
          gte: todayStart,
        },
      }),
    }),
    prisma.eventLog.count({
      where: productionEventWhere({
        eventKey: "click_button",
        createdAt: {
          gte: todayStart,
        },
      }),
    }),
    prisma.dailyStat.findMany({
      where: {
        statDate: {
          gte: rangeStart,
          lt: rangeEnd,
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
    prisma.product.count(),
    prisma.plan.count(),
    prisma.country.count(),
    prisma.regionPrice.count(),
    prisma.article.count(),
    prisma.adSlot.count(),
    prisma.affiliateLink.count(),
    prisma.siteSetting.count(),
    prisma.reviewQueue.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.regionPrice.count({
      where: {
        OR: [
          { confidenceScore: { lt: 60 } },
          { lastCheckedAt: null },
          { lastCheckedAt: { lt: staleSince } },
          { primarySourceId: null },
        ],
      },
    }),
    prisma.regionPrice.count({
      where: {
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: staleSince } }],
      },
    }),
    prisma.regionPrice.count({
      where: {
        confidenceScore: { lt: 60 },
      },
    }),
    prisma.regionPrice.count({
      where: {
        primarySourceId: null,
      },
    }),
    prisma.product.count({
      where: {
        status: "PUBLISHED",
        seoMetas: {
          none: {
            status: "PUBLISHED",
          },
        },
      },
    }),
    prisma.product.count({
      where: {
        status: "PUBLISHED",
        faqs: {
          none: {
            status: "PUBLISHED",
          },
        },
      },
    }),
    prisma.article.count({
      where: {
        status: "DRAFT",
      },
    }),
    prisma.product.findMany({
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        _count: {
          select: {
            plans: true,
            regionPrices: true,
            faqs: true,
            seoMetas: true,
            affiliateLinks: true,
          },
        },
      },
    }),
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

  const trend = buildTrendSeriesFromDailyStats({
    stats: trendStats,
    range,
  });

  const topServices = topServicesRaw
    .map((service) => ({
      label: service.name,
      description: `${service._count.regionPrices} 条地区价格，${service._count.plans} 个套餐`,
      value: service._count.regionPrices,
      href: "/admin/products",
    }))
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 5);

  return {
    todayPageViews,
    todayClickEvents,
    todayAffiliateClicks,
    todayOfficialClicks,
    todayButtonClicks,
    trend,
    digitalServices,
    plans,
    countries,
    regionPrices,
    articles,
    adSlots,
    affiliateLinks,
    siteSettings,
    pendingReviews,
    priceAnomalies,
    stalePrices,
    lowConfidencePrices,
    missingSourcePrices,
    missingSeoServices,
    missingFaqServices,
    draftArticles,
    topServices,
    recentEvents,
  };
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    range?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const range = normalizeRange(params?.range);
  const data = await getDashboardData(range);

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
    {
      label: "广告位",
      value: data.adSlots,
      helper: "商业化展示位",
      href: "/admin/commercial",
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
          helper="实时读取 event_logs"
        />
        <AdminStatCard
          label="今日点击"
          value={data.todayClickEvents}
          helper="实时读取 click_*"
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
        <TrendChart range={range} trend={data.trend} />
      </div>

      <div className="mb-8 grid gap-5 xl:grid-cols-3">
        <DashboardPanel
          title="服务资产覆盖排行"
          description="当前按价格覆盖量排序，用于判断哪些服务数据更完整。后续可改为按访问、搜索或商业点击热度排序。"
          actionHref="/admin/products"
          actionLabel="进入服务库"
        >
          <RankingList items={data.topServices} emptyText="暂无服务资产数据。" />
        </DashboardPanel>

        <DashboardPanel
          title="商业化点击"
          description="读取今日 event_logs 中的商业点击事件。"
          actionHref="/admin/commercial"
          actionLabel="商业设置"
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-3">
                <CircleDollarSign className="text-blue-700" size={18} strokeWidth={2} />
                <div>
                  <p className="text-sm font-bold text-slate-950">
                    Affiliate 点击
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    今日：{data.todayAffiliateClicks} 次
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-3">
                <MousePointerClick className="text-blue-700" size={18} strokeWidth={2} />
                <div>
                  <p className="text-sm font-bold text-slate-950">
                    点击事件
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    官方入口：{data.todayOfficialClicks} 次，普通按钮：
                    {data.todayButtonClicks} 次
                  </p>
                </div>
              </div>
            </div>
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
        description="用于确认最近用户行为和埋点健康状态。这里隐藏测试页和手动测试数据，完整原始日志后续单独做事件日志页面。"
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
            服务库、套餐库和价格库已经接入后台总览。下一步建议让 /zh/ai-pricing 和 /en/ai-pricing 读取数据库中的真实产品、套餐和地区价格，先把 ChatGPT 价格页跑通。
          </p>
        </AdminAlert>
      </div>
    </div>
  );
}

