import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  deviceNameZh,
  trafficSourceNameZh,
  toCount,
} from "./dashboard-formatters";

export type DashboardRange = 7 | 30 | 90 | 180 | 365 | 730;

export type DashboardPeriod = {
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

export type FunnelSegment = {
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

export function getTodayUtc() {
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

export function formatDateInput(date: Date) {
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

export function getDashboardPeriod(params: {
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
export async function getDashboardData(period: DashboardPeriod) {
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
              WHEN event.page_path ~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)/(ai-pricing|streaming-pricing)/[^/?]+'
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
              WHEN event.page_path ~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)/(ai-pricing|streaming-pricing)/[^/?]+'
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
            ~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)/(ai-pricing|streaming-pricing)/?$'
        ORDER BY event.session_key, event.created_at, event.id
      ),
      detail_starts AS (
        SELECT DISTINCT ON (list.session_key)
          list.session_key,
          event.created_at AS detail_at,
          CASE
            WHEN SPLIT_PART(COALESCE(event.page_path, ''), '?', 1)
              ~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)/(ai-pricing|streaming-pricing)/[^/]+/?$'
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
              ~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)/(ai-pricing|streaming-pricing)/[^/]+/?$'
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

