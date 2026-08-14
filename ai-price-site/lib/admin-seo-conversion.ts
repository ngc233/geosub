import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.ts";
import { readAdminReadModel } from "./admin-read-model-cache.ts";
import {
  COMMERCIAL_ACTION_EVENT_KEYS,
  PLAN_ENGAGEMENT_EVENT_KEYS,
  SEO_CONVERSION_SESSION_MINUTES,
  SEO_CONVERSION_WINDOW_DAYS,
  type SeoConversionMetric,
  type SeoEngineConversion,
  type SeoLandingPageConversion,
  type SeoSearchEngine,
  type SeoTrafficConversionOverview,
} from "./seo-traffic-conversion.ts";

type ConversionRow = {
  engine: SeoSearchEngine;
  landing_sessions: bigint;
  pricing_sessions: bigint;
  plan_sessions: bigint;
  official_sessions: bigint;
  commercial_sessions: bigint;
  completed_sessions: bigint;
};

type LandingPageRow = ConversionRow & {
  landing_path: string;
};

type AggregateRow = {
  engine_rows: Array<ConversionRow> | null;
  page_rows: Array<LandingPageRow> | null;
};

function toMetric(row?: Partial<ConversionRow>): SeoConversionMetric {
  return {
    landingSessions: Number(row?.landing_sessions || 0),
    pricingSessions: Number(row?.pricing_sessions || 0),
    planSessions: Number(row?.plan_sessions || 0),
    officialSessions: Number(row?.official_sessions || 0),
    commercialSessions: Number(row?.commercial_sessions || 0),
    completedSessions: Number(row?.completed_sessions || 0),
  };
}

function addMetric(
  total: SeoConversionMetric,
  next: SeoConversionMetric,
): SeoConversionMetric {
  return {
    landingSessions: total.landingSessions + next.landingSessions,
    pricingSessions: total.pricingSessions + next.pricingSessions,
    planSessions: total.planSessions + next.planSessions,
    officialSessions: total.officialSessions + next.officialSessions,
    commercialSessions: total.commercialSessions + next.commercialSessions,
    completedSessions: total.completedSessions + next.completedSessions,
  };
}

async function loadSeoTrafficConversionOverview(
  days: number,
): Promise<SeoTrafficConversionOverview> {
  const sinceDate = new Date(Date.now() - days * 86_400_000);
  const sessionInterval = `${SEO_CONVERSION_SESSION_MINUTES} minutes`;
  const planEvents = Prisma.join(
    PLAN_ENGAGEMENT_EVENT_KEYS.map((eventKey) => Prisma.sql`${eventKey}`),
  );
  const commercialEvents = Prisma.join(
    COMMERCIAL_ACTION_EVENT_KEYS.map((eventKey) => Prisma.sql`${eventKey}`),
  );

  const journeyCtes = Prisma.sql`
    WITH production_events AS (
      SELECT
        event.id,
        event.event_key,
        event.page_path,
        event.referrer,
        event.created_at,
        COALESCE(
          NULLIF(event.session_id, ''),
          NULLIF(event.anonymous_id, '')
        ) AS session_key
      FROM event_logs event
      WHERE event.created_at >= ${sinceDate}
        AND COALESCE(event.page_path, '') NOT LIKE '/admin%'
        AND COALESCE(event.page_path, '') NOT LIKE '%tracking-test%'
        AND event.event_key IN (
          'page_view',
          ${planEvents},
          ${commercialEvents}
        )
    ),
    search_page_views AS (
      SELECT
        event.*,
        SPLIT_PART(COALESCE(event.page_path, ''), '?', 1) AS landing_path,
        CASE
          WHEN LOWER(COALESCE(event.referrer, ''))
            ~ '^https?://([^/]+\\.)?google\\.[^/]+(/|$)'
          THEN 'google'
          WHEN LOWER(COALESCE(event.referrer, ''))
            ~ '^https?://([^/]+\\.)?bing\\.com(/|$)'
          THEN 'bing'
          ELSE NULL
        END AS engine
      FROM production_events event
      WHERE event.event_key = 'page_view'
        AND event.session_key IS NOT NULL
        AND SPLIT_PART(COALESCE(event.page_path, ''), '?', 1) <> ''
    ),
    landings AS (
      SELECT DISTINCT ON (view.session_key)
        view.session_key,
        view.engine,
        view.landing_path,
        view.created_at AS landing_at
      FROM search_page_views view
      WHERE view.engine IS NOT NULL
      ORDER BY view.session_key, view.created_at, view.id
    ),
    journey_actions AS (
      SELECT
        landing.session_key,
        landing.engine,
        landing.landing_path,
        landing.landing_at,
        MIN(event.created_at) FILTER (
          WHERE event.event_key = 'page_view'
            AND SPLIT_PART(COALESCE(event.page_path, ''), '?', 1)
              ~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)/(ai-pricing|streaming-pricing)/[^/]+(/[^/]+)?/?$'
        ) AS pricing_at,
        MIN(event.created_at) FILTER (
          WHERE event.event_key = 'page_view'
            AND SPLIT_PART(COALESCE(event.page_path, ''), '?', 1)
              ~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)/(ai-pricing|streaming-pricing)/[^/]+/[^/]+/?$'
        ) AS plan_page_at,
        MIN(event.created_at) FILTER (
          WHERE event.event_key IN (${planEvents})
        ) AS plan_event_at,
        MIN(event.created_at) FILTER (
          WHERE event.event_key = 'click_official'
        ) AS official_at,
        MIN(event.created_at) FILTER (
          WHERE event.event_key IN (${commercialEvents})
        ) AS commercial_at
      FROM landings landing
      LEFT JOIN production_events event
        ON event.session_key = landing.session_key
        AND event.created_at >= landing.landing_at
        AND event.created_at <= landing.landing_at + ${sessionInterval}::interval
      GROUP BY
        landing.session_key,
        landing.engine,
        landing.landing_path,
        landing.landing_at
    ),
    staged_journeys AS (
      SELECT
        action.*,
        CASE
          WHEN action.plan_page_at IS NULL THEN action.plan_event_at
          WHEN action.plan_event_at IS NULL THEN action.plan_page_at
          ELSE LEAST(action.plan_page_at, action.plan_event_at)
        END AS plan_at
      FROM journey_actions action
    ),
    journeys AS (
      SELECT
        journey.*,
        MIN(event.created_at) AS completed_at
      FROM staged_journeys journey
      LEFT JOIN production_events event
        ON event.session_key = journey.session_key
        AND journey.plan_at IS NOT NULL
        AND event.created_at >= journey.plan_at
        AND event.created_at <= journey.landing_at + ${sessionInterval}::interval
        AND event.event_key IN (${commercialEvents})
      GROUP BY
        journey.session_key,
        journey.engine,
        journey.landing_path,
        journey.landing_at,
        journey.pricing_at,
        journey.plan_page_at,
        journey.plan_event_at,
        journey.official_at,
        journey.commercial_at,
        journey.plan_at
    )
  `;

  const aggregateRows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
    ${journeyCtes},
    engine_rows AS (
      SELECT
        journey.engine,
        COUNT(*)::bigint AS landing_sessions,
        COUNT(*) FILTER (WHERE journey.pricing_at IS NOT NULL)::bigint AS pricing_sessions,
        COUNT(*) FILTER (WHERE journey.plan_at IS NOT NULL)::bigint AS plan_sessions,
        COUNT(*) FILTER (WHERE journey.official_at IS NOT NULL)::bigint AS official_sessions,
        COUNT(*) FILTER (WHERE journey.commercial_at IS NOT NULL)::bigint AS commercial_sessions,
        COUNT(*) FILTER (WHERE journey.completed_at IS NOT NULL)::bigint AS completed_sessions
      FROM journeys journey
      GROUP BY journey.engine
    ),
    page_rows AS (
      SELECT
        journey.engine,
        journey.landing_path,
        COUNT(*)::bigint AS landing_sessions,
        COUNT(*) FILTER (WHERE journey.pricing_at IS NOT NULL)::bigint AS pricing_sessions,
        COUNT(*) FILTER (WHERE journey.plan_at IS NOT NULL)::bigint AS plan_sessions,
        COUNT(*) FILTER (WHERE journey.official_at IS NOT NULL)::bigint AS official_sessions,
        COUNT(*) FILTER (WHERE journey.commercial_at IS NOT NULL)::bigint AS commercial_sessions,
        COUNT(*) FILTER (WHERE journey.completed_at IS NOT NULL)::bigint AS completed_sessions
      FROM journeys journey
      GROUP BY journey.engine, journey.landing_path
      ORDER BY landing_sessions DESC, commercial_sessions DESC, journey.landing_path
      LIMIT 8
    )
    SELECT
      COALESCE((
        SELECT JSONB_AGG(TO_JSONB(row) ORDER BY row.engine)
        FROM engine_rows row
      ), '[]'::jsonb) AS engine_rows,
      COALESCE((
        SELECT JSONB_AGG(
          TO_JSONB(row)
          ORDER BY row.landing_sessions DESC, row.commercial_sessions DESC, row.landing_path
        )
        FROM page_rows row
      ), '[]'::jsonb) AS page_rows
  `);
  const aggregate = aggregateRows[0];
  const engineRows = Array.isArray(aggregate?.engine_rows)
    ? aggregate.engine_rows
    : [];
  const pageRows = Array.isArray(aggregate?.page_rows)
    ? aggregate.page_rows
    : [];

  const engines: SeoEngineConversion[] = engineRows.map((row) => ({
    engine: row.engine,
    ...toMetric(row),
  }));
  const total = engines.reduce(
    (current, row) => addMetric(current, row),
    toMetric(),
  );
  const topPages: SeoLandingPageConversion[] = pageRows.map((row) => ({
    engine: row.engine,
    path: row.landing_path,
    ...toMetric(row),
  }));

  return {
    windowDays: days,
    sessionMinutes: SEO_CONVERSION_SESSION_MINUTES,
    since: sinceDate.toISOString(),
    total,
    engines,
    topPages,
  };
}

export function getSeoTrafficConversionOverview(
  days = SEO_CONVERSION_WINDOW_DAYS,
) {
  const normalizedDays = Math.min(Math.max(Math.trunc(days), 7), 90);
  return readAdminReadModel(
    `seo-traffic-conversion:${normalizedDays}`,
    () => loadSeoTrafficConversionOverview(normalizedDays),
    30_000,
  );
}
