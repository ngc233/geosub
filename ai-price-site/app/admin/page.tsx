import AdminLink from "@/components/admin/AdminLink";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Eye,
  FileText,
  Globe2,
  MousePointerClick,
  Plus,
  Search,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminStatCard,
} from "../../components/admin/AdminCard";
import { AdminLinkButton } from "../../components/admin/AdminButton";
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
} from "../../components/admin/AdminTable";
import { getDailyOperationsSummary } from "../../lib/admin-daily-operations";
import { buildDailyOperationsBrief } from "../../lib/daily-operations-brief";
import { measureAdminWorkload } from "../../lib/admin-performance";
import { readAdminReadModel } from "../../lib/admin-read-model-cache";
import {
  DashboardPanel,
  FunnelSegmentList,
  RankingList,
} from "./DashboardComponents";
import { TrendChart } from "./TrendChart";
import {
  commercialEntryNameZh,
  dailyOperationPresentation,
  deviceNameZh,
  eventNameZh,
  formatConversion,
  formatNumber,
  pageNameZh,
  sourceNameZh,
  timeAgo,
  toCount,
} from "./dashboard-formatters";
import {
  formatDateInput,
  getDashboardData,
  getDashboardPeriod,
  getYesterdayUtc,
} from "./queries";

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
  const [data, dailyOperations] = await Promise.all([
    measureAdminWorkload("dashboard.analytics", () =>
      readAdminReadModel(
        `dashboard:analytics:${period.start.toISOString()}:${period.endExclusive.toISOString()}`,
        () => getDashboardData(period),
        10_000,
      ),
    ),
    measureAdminWorkload("dashboard.daily-operations", () =>
      readAdminReadModel(
        "dashboard:daily-operations",
        () => getDailyOperationsSummary(),
        5_000,
      ),
    ),
  ]);
  const dailyBrief = buildDailyOperationsBrief(dailyOperations);
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
  const contentWorkCount =
    data.missingSeoServices + data.missingFaqServices + data.draftArticles;
  const taskCards = [
    {
      label: "待审核数据",
      value: data.pendingReviews,
      helper: "采集已完成，等待规则处理或确认",
      href: "/admin/review",
      icon: DatabaseZap,
      tone: "blue",
    },
    {
      label: "价格异常",
      value: data.priceAnomalies,
      helper: "低置信度、缺来源或异常价格",
      href: "/admin/data-quality",
      icon: AlertTriangle,
      tone: "red",
    },
    {
      label: "过期价格",
      value: data.stalePrices,
      helper: "已超过更新周期，需要重新采集",
      href: "/admin/data-quality",
      icon: Clock3,
      tone: "amber",
    },
    {
      label: "内容待完善",
      value: contentWorkCount,
      helper: "SEO、FAQ 缺口与文章草稿",
      href: "/admin/seo",
      icon: FileText,
      tone: "slate",
    },
  ] as const;
  const taskTone = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  } as const;

  return (
    <div>
      <AdminPageHeader
        eyebrow="工作台"
        title="今天需要处理什么"
        description="先处理价格采集、数据异常和内容缺口；访问与转化数据放在下方作为运营参考。"
        action={(
          <div className="flex flex-wrap gap-2">
            <AdminLinkButton
              href="/admin/discovery"
              variant="secondary"
            >
              <Plus size={16} strokeWidth={2} />
              接入产品
            </AdminLinkButton>
            <AdminLinkButton
              href="/admin/review"
            >
              <DatabaseZap size={16} strokeWidth={2} />
              采集与审核
            </AdminLinkButton>
          </div>
        )}
      />

      <section className="mb-10" aria-labelledby="admin-tasks-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 id="admin-tasks-title" className="text-lg font-bold text-slate-950">今日待办</h2>
            <p className="mt-1 text-sm text-slate-500">按影响范围从左到右处理。</p>
          </div>
          <AdminLink href="/admin/pipeline" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800">
            查看产品全流程
            <ArrowRight size={15} strokeWidth={2} />
          </AdminLink>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {taskCards.map((task) => {
            const Icon = task.icon;
            return (
              <AdminLink
                key={task.label}
                href={task.href}
                className="group min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${taskTone[task.tone]}`}>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <ArrowRight size={17} className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
                </div>
                <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{formatNumber(task.value)}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{task.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{task.helper}</p>
              </AdminLink>
            );
          })}
        </div>
      </section>

      <section className="mb-10" aria-labelledby="daily-operations-title">
        <div className={`mb-4 flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between ${
          dailyBrief.level === "critical"
            ? "border-red-200 bg-red-50"
            : dailyBrief.level === "attention"
              ? "border-amber-200 bg-amber-50"
              : dailyBrief.level === "progress"
                ? "border-blue-200 bg-blue-50"
                : "border-emerald-200 bg-emerald-50"
        }`}>
          <div>
            <p className="text-base font-bold text-slate-950">{dailyBrief.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{dailyBrief.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold tabular-nums">
            <span className="rounded-md bg-white/80 px-2.5 py-1.5 text-red-700 ring-1 ring-inset ring-red-200">失败 {dailyBrief.counts.failed}</span>
            <span className="rounded-md bg-white/80 px-2.5 py-1.5 text-amber-700 ring-1 ring-inset ring-amber-200">待处理 {dailyBrief.counts.action}</span>
            <span className="rounded-md bg-white/80 px-2.5 py-1.5 text-blue-700 ring-1 ring-inset ring-blue-200">执行中 {dailyBrief.counts.running + dailyBrief.counts.queued}</span>
            <span className="rounded-md bg-white/80 px-2.5 py-1.5 text-emerald-700 ring-1 ring-inset ring-emerald-200">健康 {dailyBrief.counts.healthy}</span>
          </div>
        </div>
        <AdminTableShell
          title="今日产品摘要"
          description="按产品汇总今天该做什么、为什么要做，以及系统是否已经排队。运行中或已排队的产品无需重复操作。"
          action={(
            <AdminLinkButton href="/admin/search-demand" variant="secondary" size="sm">
              查看完整优先级
              <ArrowRight size={14} strokeWidth={2} />
            </AdminLinkButton>
          )}
        >
          <span id="daily-operations-title" className="sr-only">今日产品摘要</span>
          <AdminTable className="min-w-[980px]">
            <AdminTableHead>
              <tr>
                <AdminTh>状态</AdminTh>
                <AdminTh>产品</AdminTh>
                <AdminTh>今天为什么要关注</AdminTh>
                <AdminTh>系统进度</AdminTh>
                <AdminTh>任务后的效果</AdminTh>
                <AdminTh align="right">下一步</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {dailyOperations.slice(0, 8).map((item) => {
                const state = dailyOperationPresentation(item.state);
                return (
                  <AdminTr key={item.productId}>
                    <AdminTd>
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${state.className}`}>
                        {state.label}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="font-bold text-slate-950">{item.productName}</span>
                      <span className="mt-1 block text-xs tabular-nums text-slate-400">
                        页面质量 {item.qualityScore}/100
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="block max-w-sm text-sm leading-6 text-slate-700">
                        {item.reason}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <span className="block max-w-xs text-xs leading-5 text-slate-600">
                        {item.systemSummary}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      {item.businessSummary ? (
                        <span className="block max-w-xs text-xs leading-5 text-slate-600">
                          {item.businessSummary}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">尚未开始可追踪的补强任务</span>
                      )}
                    </AdminTd>
                    <AdminTd align="right">
                      <AdminLinkButton href={item.actionHref} variant="secondary" size="sm">
                        {item.actionLabel}
                        <ArrowRight size={14} strokeWidth={2} />
                      </AdminLinkButton>
                    </AdminTd>
                  </AdminTr>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        </AdminTableShell>
      </section>

      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-950">今日运营</h2>
        <p className="mt-1 text-sm text-slate-500">访问与商业点击按 UTC 当日实时统计。</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </div>

      <div className="mb-8">
        <TrendChart
          period={{
            range: period.range,
            from: period.from,
            to: period.to,
            isCustom: period.isCustom,
            error: period.error,
          }}
          latestCompleteDate={formatDateInput(getYesterdayUtc())}
          trend={data.trend}
          comparison={data.trendComparison ?? {
            previousPageViews: 0,
            previousClicks: 0,
            previousTrend: [],
            previousFrom: "",
            previousTo: "",
          }}
        />
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
              <AdminLink
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
              </AdminLink>
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
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
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

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
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

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
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
            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
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

            <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
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

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
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
              className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-4"
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
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              暂无可展示的正式事件。
            </div>
          ) : null}
        </div>
      </DashboardPanel>

    </div>
  );
}
