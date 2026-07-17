import Link from "next/link";
import {
  Activity,
  Download,
  Eye,
  MousePointerClick,
  Search,
  Users,
} from "lucide-react";
import { AdminCard, AdminPageHeader, AdminStatCard } from "../../../components/admin/AdminCard";
import AdminAlert from "../../../components/admin/AdminAlert";
import {
  buildAdminEventWhere,
  buildSuspectedAutomatedWhere,
  COMMERCIAL_EVENT_KEYS,
  deviceNameZh,
  eventNameZh,
  findHighFrequencyVisitorIds,
  inferEventProductSlug,
  parseAdminEventFilters,
  sourceNameZh,
} from "../../../lib/admin-event-analytics";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function normalizePage(value?: string) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatUtcDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(value);
}

function shortVisitor(value?: string | null) {
  return value ? value.slice(0, 8) : "未记录";
}

function eventTone(eventKey: string) {
  if (eventKey === "page_view") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (COMMERCIAL_EVENT_KEYS.includes(eventKey as (typeof COMMERCIAL_EVENT_KEYS)[number])) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  return "bg-violet-50 text-violet-700 ring-violet-200";
}

function buildQuery(
  filters: ReturnType<typeof parseAdminEventFilters>,
  extra: Record<string, string | number | undefined> = {},
) {
  const query = new URLSearchParams({ from: filters.from, to: filters.to });

  if (filters.kind !== "all") query.set("type", filters.kind);
  if (filters.quality !== "all") query.set("quality", filters.quality);
  if (filters.product) query.set("product", filters.product);
  if (filters.device) query.set("device", filters.device);
  if (filters.query) query.set("q", filters.query);

  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined || value === "") query.delete(key);
    else query.set(key, String(value));
  }

  return query.toString();
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    type?: string;
    quality?: string;
    product?: string;
    device?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const filters = parseAdminEventFilters(params);
  const requestedPage = normalizePage(params.page);

  const products = await prisma.product.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const selectedProduct = products.find((product) => product.slug === filters.product) || null;
  const highFrequencyVisitorIds = await findHighFrequencyVisitorIds(filters);
  const where = buildAdminEventWhere(
    filters,
    selectedProduct,
    highFrequencyVisitorIds,
  );

  const totalEvents = await prisma.eventLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const [pageViews, commercialClicks, uniqueVisitors, automatedEvents, events] = await Promise.all([
    prisma.eventLog.count({ where: { AND: [where, { eventKey: "page_view" }] } }),
    prisma.eventLog.count({
      where: { AND: [where, { eventKey: { in: [...COMMERCIAL_EVENT_KEYS] } }] },
    }),
    prisma.eventLog.findMany({
      where: { AND: [where, { anonymousId: { not: null } }] },
      distinct: ["anonymousId"],
      select: { anonymousId: true },
    }),
    prisma.eventLog.count({
      where: {
        AND: [where, buildSuspectedAutomatedWhere(highFrequencyVisitorIds)],
      },
    }),
    prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        eventKey: true,
        eventName: true,
        pagePath: true,
        pageTitle: true,
        locale: true,
        anonymousId: true,
        sessionId: true,
        productId: true,
        buttonKey: true,
        placement: true,
        source: true,
        deviceType: true,
        createdAt: true,
      },
    }),
  ]);

  const automatedPageEventRows = events.length > 0
    ? await prisma.eventLog.findMany({
        where: {
          AND: [
            { id: { in: events.map((event) => event.id) } },
            buildSuspectedAutomatedWhere(highFrequencyVisitorIds),
          ],
        },
        select: { id: true },
      })
    : [];
  const automatedPageEventIds = new Set(
    automatedPageEventRows.map((event) => event.id),
  );

  const productSlugById = new Map(products.map((product) => [product.id, product.slug]));
  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  const knownSlugs = new Set(products.map((product) => product.slug));
  const interactionCount = Math.max(0, totalEvents - pageViews);
  const exportHref = `/admin/events/export?${buildQuery(filters)}`;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Analytics"
        title="事件日志"
        description="检查真实访问、产品互动和商业点击。测试页与手动测试事件默认排除，全部时间按 UTC 统计。"
        action={
          <a
            href={exportHref}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
          >
            <Download size={16} strokeWidth={2} />
            导出当前筛选
          </a>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="事件总数" value={totalEvents} helper={`${filters.from} 至 ${filters.to}`} />
        <AdminStatCard label="页面访问" value={pageViews} helper="真实 page_view 事件" />
        <AdminStatCard label="互动事件" value={interactionCount} helper={`其中商业点击 ${commercialClicks} 次`} />
        <AdminStatCard label="独立访客" value={uniqueVisitors.length} helper="按匿名访客标识去重" />
        <AdminStatCard label="疑似自动化" value={automatedEvents} helper="UA 规则或单日高频事件" />
      </div>

      <AdminCard className="mb-6">
        <form action="/admin/events" method="get" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1.2fr_1.4fr_auto]">
          <label className="text-xs font-bold text-slate-500">
            开始日期
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            结束日期
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            事件类型
            <select
              name="type"
              defaultValue={filters.kind}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">全部事件</option>
              <option value="view">页面访问</option>
              <option value="interaction">产品互动</option>
              <option value="commercial">商业点击</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            产品
            <select
              name="product"
              defaultValue={selectedProduct?.slug || ""}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">全部产品</option>
              {products.map((product) => (
                <option key={product.id} value={product.slug}>{product.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            设备
            <select
              name="device"
              defaultValue={filters.device}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">全部设备</option>
              <option value="desktop">桌面端</option>
              <option value="mobile">手机端</option>
              <option value="tablet">平板</option>
              <option value="unknown">未知设备</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            流量质量
            <select
              name="quality"
              defaultValue={filters.quality}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">全部质量状态</option>
              <option value="missing-session">会话 ID 缺失</option>
              <option value="missing-visitor">访客 ID 缺失</option>
              <option value="not-found">404 页面访问</option>
              <option value="unknown-device">未知设备</option>
              <option value="automated">疑似自动化</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            搜索
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} />
              <input
                type="search"
                name="q"
                defaultValue={filters.query}
                placeholder="事件、页面或入口"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-11 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800">
              筛选
            </button>
            <Link href="/admin/events" className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              重置
            </Link>
          </div>
        </form>
      </AdminCard>

      {filters.error ? (
        <div className="mb-6">
          <AdminAlert title="日期范围已回退" variant="warning">{filters.error}</AdminAlert>
        </div>
      ) : null}

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">事件明细</h2>
            <p className="mt-1 text-sm text-slate-500">共 {totalEvents} 条，当前第 {page} / {totalPages} 页。</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Eye size={15} />访问
            <Activity size={15} />互动
            <MousePointerClick size={15} />商业
            <Users size={15} />访客
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[1180px]">
            <div className="grid grid-cols-[170px_170px_150px_minmax(220px,1fr)_160px_120px_100px] bg-slate-50 px-5 py-3 text-xs font-black text-slate-400">
              <div>时间（UTC）</div><div>事件</div><div>产品</div><div>页面 / 入口</div><div>来源 / 位置</div><div>设备</div><div>访客</div>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {events.map((event) => {
                const productSlug = inferEventProductSlug(event, productSlugById, knownSlugs);
                const product = productSlug ? productBySlug.get(productSlug) : null;
                const suspectedAutomated = automatedPageEventIds.has(event.id);

                return (
                  <div key={event.id} className="grid grid-cols-[170px_170px_150px_minmax(220px,1fr)_160px_120px_100px] items-center px-5 py-4 text-sm">
                    <div className="font-mono text-xs text-slate-500">{formatUtcDateTime(event.createdAt)}</div>
                    <div>
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ring-1 ${eventTone(event.eventKey)}`}>
                        {eventNameZh(event.eventKey)}
                      </span>
                      <div className="mt-1 font-mono text-[11px] text-slate-400">{event.eventKey}</div>
                    </div>
                    <div className="min-w-0">
                      {product ? (
                        <Link href={`/admin/products/${product.id}/edit`} className="font-bold text-slate-800 hover:text-blue-700">{product.name}</Link>
                      ) : <span className="text-slate-400">未归属</span>}
                      {productSlug ? <div className="mt-1 font-mono text-[11px] text-slate-400">{productSlug}</div> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-700">{event.pageTitle || event.pagePath || "未记录页面"}</div>
                      {event.buttonKey ? <div className="mt-1 truncate font-mono text-[11px] text-slate-400">{event.buttonKey}</div> : null}
                    </div>
                    <div className="min-w-0 text-xs text-slate-500">
                      <div className="truncate">{sourceNameZh(event.source)}</div>
                      <div className="mt-1 truncate text-slate-400">{event.placement || "未标记位置"}</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-600">{deviceNameZh(event.deviceType)}<div className="mt-1 uppercase text-slate-400">{event.locale || "-"}</div></div>
                    <div className="font-mono text-xs text-slate-500">
                      {shortVisitor(event.anonymousId)}
                      {!event.sessionId ? (
                        <div className="mt-1 font-sans text-[10px] font-bold text-amber-700">缺会话</div>
                      ) : null}
                      {suspectedAutomated ? (
                        <div className="mt-1 font-sans text-[10px] font-bold text-red-600">疑似自动化</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {events.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">当前筛选条件下没有正式事件。</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-slate-400">每页 {PAGE_SIZE} 条，导出最多包含 10,000 条。</p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={`/admin/events?${buildQuery(filters, { page: page - 1 })}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">上一页</Link>
            ) : <span className="rounded-lg border border-slate-100 px-3 py-2 text-sm font-bold text-slate-300">上一页</span>}
            <span className="px-2 text-sm font-semibold text-slate-500">{page} / {totalPages}</span>
            {page < totalPages ? (
              <Link href={`/admin/events?${buildQuery(filters, { page: page + 1 })}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">下一页</Link>
            ) : <span className="rounded-lg border border-slate-100 px-3 py-2 text-sm font-bold text-slate-300">下一页</span>}
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
