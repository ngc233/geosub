import { NextRequest, NextResponse } from "next/server";
import {
  AGGREGATE_PAGE_VIEW_METRIC,
  AGGREGATE_PAGE_VIEW_SOURCE,
  getUtcStatDate,
  normalizeAggregatePagePath,
} from "../../../lib/aggregate-page-views";
import { prisma } from "../../../lib/prisma";
import { classifyPageViewPopulation, PAGE_VIEW_MEASUREMENT_VERSION, PAGE_VIEW_POPULATION_METRICS } from "../../../lib/page-view-measurement";

const MAX_REQUEST_BYTES = 1024;
const PAGE_VIEW_WINDOW_MS = 60_000;
const PAGE_VIEW_GLOBAL_LIMIT_PER_WINDOW = 600;
const PAGE_VIEW_PATH_LIMIT_PER_WINDOW = 120;
const PAGE_VIEW_MAX_TRACKED_PATHS = 2_000;

const pageViewWindowState = new Map<string, { count: number; startedAt: number }>();

function allowAggregatePageViewWrite(pagePath: string, now = Date.now()) {
  if (pageViewWindowState.size >= PAGE_VIEW_MAX_TRACKED_PATHS) {
    for (const [key, state] of pageViewWindowState) {
      if (state.startedAt <= now - PAGE_VIEW_WINDOW_MS) {
        pageViewWindowState.delete(key);
      }
    }
    if (pageViewWindowState.size >= PAGE_VIEW_MAX_TRACKED_PATHS) {
      const oldestKey = pageViewWindowState.keys().next().value;
      if (oldestKey) pageViewWindowState.delete(oldestKey);
    }
  }

  for (const [key, limit] of [
    ["global", PAGE_VIEW_GLOBAL_LIMIT_PER_WINDOW],
    [`page:${pagePath}`, PAGE_VIEW_PATH_LIMIT_PER_WINDOW],
  ] as const) {
    const current = pageViewWindowState.get(key);
    if (!current || current.startedAt <= now - PAGE_VIEW_WINDOW_MS) {
      pageViewWindowState.set(key, { count: 1, startedAt: now });
      continue;
    }
    if (current.count >= limit) {
      return false;
    }
    current.count += 1;
  }

  return true;
}

function getBrowserRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");

  if (!host || (protocol !== "http" && protocol !== "https")) return null;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function isSameOriginBrowserRequest(request: NextRequest, pagePath: string) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const referer = request.headers.get("referer");
  const requestOrigin = getBrowserRequestOrigin(request);

  if (
    !requestOrigin ||
    origin !== requestOrigin ||
    fetchSite !== "same-origin" ||
    !referer
  ) {
    return false;
  }

  try {
    const refererUrl = new URL(referer);
    return (
      refererUrl.origin === requestOrigin &&
      normalizeAggregatePagePath(refererUrl.pathname) === pagePath
    );
  } catch {
    return false;
  }
}

function buildDailyStatInput(
  statDate: Date,
  dimensionType: "global" | "page",
  dimensionKey: string,
  metricKey = AGGREGATE_PAGE_VIEW_METRIC,
) {
  return {
    statDate,
    metricKey,
    dimensionType,
    dimensionKey,
  };
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let rawPayload: string;
  try {
    rawPayload = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (new TextEncoder().encode(rawPayload).byteLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const pagePath = normalizeAggregatePagePath(
    (payload as { pagePath?: unknown } | null)?.pagePath,
  );
  if (!pagePath || !isSameOriginBrowserRequest(request, pagePath)) {
    return NextResponse.json({ error: "Invalid page view." }, { status: 400 });
  }

  if (!allowAggregatePageViewWrite(pagePath)) {
    return new NextResponse(null, { status: 202 });
  }

  const statDate = getUtcStatDate();
  const metadata = {
    generatedBy: AGGREGATE_PAGE_VIEW_SOURCE,
    storage: "daily_aggregate_only",
    identifiers: "none",
    timezone: "UTC",
  };

  const population = classifyPageViewPopulation(payload, request.headers.get("x-geosub-measurement-traffic"));
  const populationMetric = PAGE_VIEW_POPULATION_METRICS[population];
  const populationMetadata = {
    ...metadata,
    contractVersion: PAGE_VIEW_MEASUREMENT_VERSION,
    population,
    classification: "client_exclusion_signals_not_verified_humans",
  };

  try {
    await prisma.$transaction([
      prisma.dailyStat.upsert({
        where: {
          statDate_metricKey_dimensionType_dimensionKey: buildDailyStatInput(
            statDate,
            "global",
            "global",
          ),
        },
        update: { metricValue: { increment: 1 } },
        create: {
          ...buildDailyStatInput(statDate, "global", "global"),
          metricValue: 1,
          label: "无 Cookie 页面浏览总量",
          metadata,
        },
      }),
      prisma.dailyStat.upsert({
        where: {
          statDate_metricKey_dimensionType_dimensionKey: buildDailyStatInput(
            statDate,
            "page",
            pagePath,
          ),
        },
        update: { metricValue: { increment: 1 } },
        create: {
          ...buildDailyStatInput(statDate, "page", pagePath),
          metricValue: 1,
          label: pagePath,
          metadata,
        },
      }),
      ...(["global", "page"] as const).map((dimensionType) => {
        const dimensionKey = dimensionType === "global" ? "global" : pagePath;
        const identity = buildDailyStatInput(statDate, dimensionType, dimensionKey, populationMetric);
        return prisma.dailyStat.upsert({
          where: { statDate_metricKey_dimensionType_dimensionKey: identity },
          update: { metricValue: { increment: 1 } },
          create: { ...identity, metricValue: 1, label: dimensionKey, metadata: populationMetadata },
        });
      }),
    ]);
  } catch {
    globalThis.console?.warn("Page-view tracking unavailable; skipping aggregate write.");
    return new NextResponse(null, { status: 202 });
  }

  return new NextResponse(null, { status: 204 });
}
