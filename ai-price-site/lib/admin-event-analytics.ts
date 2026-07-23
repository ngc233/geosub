import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const COMMERCIAL_EVENT_KEYS = [
  "click_affiliate",
  "click_official",
  "click_ad",
] as const;

export type AdminEventKind = "all" | "view" | "interaction" | "commercial";
export type AdminEventQuality =
  | "all"
  | "missing-session"
  | "missing-visitor"
  | "not-found"
  | "unknown-device"
  | "automated";

export const HIGH_FREQUENCY_EVENT_THRESHOLD = 100;

const AUTOMATED_USER_AGENT_MARKERS = [
  "bot",
  "crawler",
  "spider",
  "headless",
  "lighthouse",
  "pagespeed",
  "curl",
  "wget",
  "python-requests",
  "httpclient",
] as const;

export type AdminEventFilters = {
  from: string;
  to: string;
  start: Date;
  endExclusive: Date;
  kind: AdminEventKind;
  quality: AdminEventQuality;
  product: string;
  device: string;
  query: string;
  error?: string;
};

type ProductIdentity = {
  id: string;
  slug: string;
};

function dateOnlyUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || formatDateInput(date) !== value ? null : date;
}

function normalizeKind(value?: string): AdminEventKind {
  if (value === "view" || value === "interaction" || value === "commercial") {
    return value;
  }

  return "all";
}

function normalizeQuality(value?: string): AdminEventQuality {
  if (
    value === "missing-session" ||
    value === "missing-visitor" ||
    value === "not-found" ||
    value === "unknown-device" ||
    value === "automated"
  ) {
    return value;
  }

  return "all";
}

export function parseAdminEventFilters(params: {
  from?: string;
  to?: string;
  type?: string;
  quality?: string;
  product?: string;
  device?: string;
  q?: string;
}): AdminEventFilters {
  const today = dateOnlyUtc(new Date());
  const defaultStart = new Date(today);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 6);

  const base = {
    from: formatDateInput(defaultStart),
    to: formatDateInput(today),
    start: defaultStart,
    endExclusive: new Date(today.getTime() + 86_400_000),
    kind: normalizeKind(params.type),
    quality: normalizeQuality(params.quality),
    product: String(params.product || "").trim().slice(0, 120),
    device: ["desktop", "mobile", "tablet", "unknown"].includes(
      String(params.device || ""),
    )
      ? String(params.device)
      : "",
    query: String(params.q || "").trim().slice(0, 120),
  } satisfies AdminEventFilters;

  if (!params.from && !params.to) return base;

  const start = parseDateInput(params.from);
  const end = parseDateInput(params.to);

  if (!start || !end) {
    return {
      ...base,
      error: "请选择完整且有效的开始与结束日期。",
    };
  }

  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (days < 1 || days > 730 || end > today) {
    return {
      ...base,
      error: "查询范围需在今天以前，且不能超过 730 天。",
    };
  }

  return {
    ...base,
    from: formatDateInput(start),
    to: formatDateInput(end),
    start,
    endExclusive: new Date(end.getTime() + 86_400_000),
  };
}

export function productionEventWhere(): Prisma.EventLogWhereInput {
  return {
    NOT: [
      { pagePath: { startsWith: "/zh/tracking-test" } },
      { source: { in: ["manual_test", "affiliate_test"] } },
      { eventKey: "test_event" },
    ],
  };
}

export function buildAdminEventWhere(
  filters: AdminEventFilters,
  product?: ProductIdentity | null,
  highFrequencyVisitorIds: string[] = [],
): Prisma.EventLogWhereInput {
  const conditions: Prisma.EventLogWhereInput[] = [
    productionEventWhere(),
    {
      createdAt: {
        gte: filters.start,
        lt: filters.endExclusive,
      },
    },
  ];

  if (filters.kind === "view") {
    conditions.push({ eventKey: "page_view" });
  } else if (filters.kind === "commercial") {
    conditions.push({ eventKey: { in: [...COMMERCIAL_EVENT_KEYS] } });
  } else if (filters.kind === "interaction") {
    conditions.push({
      eventKey: {
        notIn: ["page_view", ...COMMERCIAL_EVENT_KEYS],
      },
    });
  }

  if (product) {
    conditions.push({
      OR: [
        { productId: product.id },
        { buttonKey: { startsWith: `${product.slug}:` } },
        { pagePath: { contains: `/ai-pricing/${product.slug}` } },
        { pagePath: { contains: `/streaming-pricing/${product.slug}` } },
      ],
    });
  }

  if (filters.device) {
    conditions.push({ deviceType: filters.device });
  }

  if (filters.quality === "missing-session") {
    conditions.push({ OR: [{ sessionId: null }, { sessionId: "" }] });
  } else if (filters.quality === "missing-visitor") {
    conditions.push({ OR: [{ anonymousId: null }, { anonymousId: "" }] });
  } else if (filters.quality === "not-found") {
    conditions.push({
      eventKey: "page_view",
      OR: [
        { pageTitle: { startsWith: "404", mode: "insensitive" } },
        { pageTitle: { contains: "not found", mode: "insensitive" } },
      ],
    });
  } else if (filters.quality === "unknown-device") {
    conditions.push({
      OR: [{ deviceType: null }, { deviceType: "" }, { deviceType: "unknown" }],
    });
  } else if (filters.quality === "automated") {
    conditions.push(buildSuspectedAutomatedWhere(highFrequencyVisitorIds));
  }

  if (filters.query) {
    conditions.push({
      OR: [
        { eventKey: { contains: filters.query, mode: "insensitive" } },
        { eventName: { contains: filters.query, mode: "insensitive" } },
        { pagePath: { contains: filters.query, mode: "insensitive" } },
        { buttonKey: { contains: filters.query, mode: "insensitive" } },
        { placement: { contains: filters.query, mode: "insensitive" } },
        { source: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }

  return { AND: conditions };
}

export function buildSuspectedAutomatedWhere(
  highFrequencyVisitorIds: string[],
): Prisma.EventLogWhereInput {
  return {
    OR: [
      ...AUTOMATED_USER_AGENT_MARKERS.map((marker) => ({
        userAgent: { contains: marker, mode: Prisma.QueryMode.insensitive },
      })),
      ...(highFrequencyVisitorIds.length > 0
        ? [{ anonymousId: { in: highFrequencyVisitorIds } }]
        : []),
    ],
  };
}

export async function findHighFrequencyVisitorIds(
  filters: Pick<AdminEventFilters, "start" | "endExclusive">,
) {
  const rows = await prisma.$queryRaw<Array<{ anonymous_id: string }>>`
    SELECT DISTINCT grouped.anonymous_id
    FROM (
      SELECT
        event.anonymous_id,
        DATE_TRUNC('day', event.created_at) AS event_day
      FROM event_logs event
      WHERE event.created_at >= ${filters.start}
        AND event.created_at < ${filters.endExclusive}
        AND NULLIF(event.anonymous_id, '') IS NOT NULL
        AND NOT (
          COALESCE(event.page_path, '') LIKE '/zh/tracking-test%'
          OR COALESCE(event.source, '') IN ('manual_test', 'affiliate_test')
          OR event.event_key = 'test_event'
        )
      GROUP BY event.anonymous_id, DATE_TRUNC('day', event.created_at)
      HAVING COUNT(*) >= ${HIGH_FREQUENCY_EVENT_THRESHOLD}
    ) grouped
  `;

  return rows.map((row) => row.anonymous_id);
}

export function inferEventProductSlug(
  event: {
    productId?: string | null;
    buttonKey?: string | null;
    pagePath?: string | null;
  },
  productSlugById: Map<string, string>,
  knownSlugs: Set<string>,
) {
  if (event.productId) {
    const directSlug = productSlugById.get(event.productId);
    if (directSlug) return directSlug;
  }

  const buttonSlug = event.buttonKey?.split(":")[0]?.trim();
  if (buttonSlug && knownSlugs.has(buttonSlug)) return buttonSlug;

  const pathSlug = event.pagePath?.match(
    /^\/(?:zh|en|ja|ko|es|tr|ar|fr|it|de|pt)\/(?:ai-pricing|streaming-pricing)\/([^/?#]+)/,
  )?.[1];

  return pathSlug && knownSlugs.has(pathSlug) ? pathSlug : null;
}

export function eventNameZh(eventKey: string) {
  const labels: Record<string, string> = {
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
    click_price_map_region: "地图地区点击",
    open_share_modal: "打开分享弹窗",
    copy_link: "复制链接",
    copy_share_link: "复制分享链接",
    download_share_image: "下载分享图",
    share_to_social: "分享到社交平台",
    search_digital_service: "搜索数字服务",
    search_no_result: "搜索无结果",
    click_search_result: "搜索结果点击",
  };

  return labels[eventKey] || eventKey;
}

export function sourceNameZh(source?: string | null) {
  const labels: Record<string, string> = {
    frontend_auto: "自动访问埋点",
    frontend_click: "前台点击埋点",
    tracked_link: "链接点击",
    tracked_button: "按钮点击",
    segmented_control: "分段选项切换",
  };

  return source ? labels[source] || source : "未标记";
}

export function deviceNameZh(device?: string | null) {
  const labels: Record<string, string> = {
    desktop: "桌面端",
    mobile: "手机端",
    tablet: "平板",
    unknown: "未知设备",
  };

  return device ? labels[device] || device : "未知设备";
}
