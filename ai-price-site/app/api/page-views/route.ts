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

  return new NextResponse(null, { status: 204 });
}
