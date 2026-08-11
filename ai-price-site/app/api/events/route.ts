import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  ANALYTICS_CONSENT_COOKIE_NAME,
  ANALYTICS_CONSENT_GRANTED,
} from "../../../lib/analytics-consent";
import { ANALYTICS_EVENTS } from "../../../lib/analytics-events";
import {
  buildEventRateLimitDecision,
  EVENT_RATE_LIMIT_REQUESTS,
  EVENT_RATE_LIMIT_RETENTION_DAYS,
  EVENT_RATE_LIMIT_WINDOW_MS,
} from "../../../lib/event-rate-limit";
import { prisma } from "../../../lib/prisma";

const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_METADATA_BYTES = 8 * 1024;
const ALLOWED_EVENT_KEYS = new Set<string>(Object.values(ANALYTICS_EVENTS));
const EVENT_RATE_LIMIT_CLEANUP_CHANCE = 0.01;

type EventRateLimitRow = {
  request_count: number;
  window_started_at: Date;
};

function getClientIp(request: NextRequest) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashEventRateLimitKey(ipAddress: string) {
  return createHash("sha256")
    .update(`event:${ipAddress.trim().toLowerCase()}`)
    .digest("hex");
}

async function consumeEventRateLimit(request: NextRequest) {
  const keyHash = hashEventRateLimitKey(getClientIp(request));
  const windowSeconds = Math.ceil(EVENT_RATE_LIMIT_WINDOW_MS / 1000);
  const rows = await prisma.$queryRaw<EventRateLimitRow[]>(Prisma.sql`
    INSERT INTO event_rate_limits (
      key_hash,
      request_count,
      window_started_at,
      updated_at
    )
    VALUES (${keyHash}, 1, NOW(), NOW())
    ON CONFLICT (key_hash) DO UPDATE
    SET
      request_count = CASE
        WHEN event_rate_limits.window_started_at <= NOW() - make_interval(secs => ${windowSeconds})
          THEN 1
        ELSE event_rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN event_rate_limits.window_started_at <= NOW() - make_interval(secs => ${windowSeconds})
          THEN NOW()
        ELSE event_rate_limits.window_started_at
      END,
      updated_at = NOW()
    RETURNING request_count, window_started_at
  `);
  const row = rows[0];

  if (!row) {
    throw new Error("Event rate limit state was not returned.");
  }

  if (Math.random() < EVENT_RATE_LIMIT_CLEANUP_CHANCE) {
    try {
      await prisma.$executeRaw(Prisma.sql`
        DELETE FROM event_rate_limits
        WHERE updated_at < NOW() - make_interval(days => ${EVENT_RATE_LIMIT_RETENTION_DAYS})
      `);
    } catch {
      console.warn("Event rate limit cleanup unavailable; continuing event processing.");
    }
  }

  return buildEventRateLimitDecision({
    requestCount: Number(row.request_count),
    windowStartedAtMs: row.window_started_at.getTime(),
    nowMs: Date.now(),
  });
}

function cleanString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

function cleanUuid(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    return null;
  }

  return text;
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(value);

    if (Buffer.byteLength(serialized, "utf8") > MAX_METADATA_BYTES) {
      return undefined;
    }

    return JSON.parse(serialized) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

function getDeviceType(userAgent: string | null) {
  if (!userAgent) {
    return "unknown";
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes("ipad") || ua.includes("tablet")) {
    return "tablet";
  }

  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
    return "mobile";
  }

  return "desktop";
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: "Request body is too large.",
      },
      {
        status: 413,
      }
    );
  }

  if (
    request.cookies.get(ANALYTICS_CONSENT_COOKIE_NAME)?.value !==
    ANALYTICS_CONSENT_GRANTED
  ) {
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
        consentRequired: true,
      },
      {
        status: 202,
      },
    );
  }

  let rateLimit;

  try {
    rateLimit = await consumeEventRateLimit(request);
  } catch {
    console.warn("Event rate limiting unavailable; skipping event write.");
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
      },
      {
        status: 202,
      },
    );
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many event requests.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "X-RateLimit-Limit": String(EVENT_RATE_LIMIT_REQUESTS),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: Record<string, unknown> | null = null;

  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      }
    );
  }

  if (!body) {
    return NextResponse.json(
      {
        ok: false,
        error: "Empty body.",
      },
      {
        status: 400,
      }
    );
  }

  const eventKey = cleanString(body.eventKey, 120);

  if (!eventKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "eventKey is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (!ALLOWED_EVENT_KEYS.has(eventKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported eventKey.",
      },
      {
        status: 422,
      }
    );
  }

  const existingAnonymousId = request.cookies.get("geosub_anon_id")?.value;
  const anonymousId = existingAnonymousId || randomUUID();

  const userAgent = request.headers.get("user-agent");
  const referrerFromHeader = request.headers.get("referer");

  const eventData = {
    eventKey,
    eventName: cleanString(body.eventName, 200),

    pagePath: cleanString(body.pagePath, 1000),
    pageTitle: cleanString(body.pageTitle, 300),
    referrer: cleanString(body.referrer, 1000) || cleanString(referrerFromHeader, 1000),

    locale: cleanString(body.locale, 20) || "zh",
    sessionId: cleanString(body.sessionId, 200),
    anonymousId,

    productId: cleanUuid(body.productId),
    planId: cleanUuid(body.planId),
    countryId: cleanUuid(body.countryId),
    articleId: cleanUuid(body.articleId),

    buttonKey: cleanString(body.buttonKey, 200),
    placement: cleanString(body.placement, 200),
    source: cleanString(body.source, 200),
    deviceType: getDeviceType(userAgent),

    userAgent: cleanString(userAgent, 1000),

    metadata: cleanMetadata(body.metadata),
  };

  try {
    await prisma.eventLog.create({
      data: eventData,
    });
  } catch {
    console.warn("Event tracking unavailable; skipping event write.");

    const response = NextResponse.json(
      {
        ok: false,
        skipped: true,
      },
      {
        status: 202,
      },
    );

    if (!existingAnonymousId) {
      response.cookies.set("geosub_anon_id", anonymousId, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  }

  const response = NextResponse.json(
    {
      ok: true,
    },
    {
      headers: {
        "X-RateLimit-Limit": String(EVENT_RATE_LIMIT_REQUESTS),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    },
  );

  if (!existingAnonymousId) {
    response.cookies.set("geosub_anon_id", anonymousId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
