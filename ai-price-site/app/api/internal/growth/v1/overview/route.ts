import { NextRequest, NextResponse } from "next/server";
import {
  authorizeGrowthIntelligenceRequest,
  GROWTH_INTELLIGENCE_API_CONSUMERS_ENV,
  GROWTH_INTELLIGENCE_API_ENABLED_ENV,
} from "../../../../../../lib/growth-intelligence-auth";
import {
  getGrowthIntelligenceOverview,
  parseGrowthIntelligenceWindowDays,
} from "../../../../../../lib/growth-intelligence-read-model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_LIMIT_REQUESTS = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitState = new Map<string, { count: number; startedAt: number }>();

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      Vary: "Authorization",
      ...headers,
    },
  });
}

function consumeRateLimit(consumerId: string, now = Date.now()) {
  const current = rateLimitState.get(consumerId);
  if (!current || current.startedAt <= now - RATE_LIMIT_WINDOW_MS) {
    rateLimitState.set(consumerId, { count: 1, startedAt: now });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, retryAfter: 0 };
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.startedAt + RATE_LIMIT_WINDOW_MS - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_REQUESTS - current.count,
    retryAfter: 0,
  };
}

function auditAccess(input: {
  consumerId: string | null;
  status: number;
  durationMs: number;
  outcome: string;
}) {
  console.info(JSON.stringify({
    event: "geosub.growth_intelligence_api_access",
    route: "/api/internal/growth/v1/overview",
    method: "GET",
    ...input,
  }));
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const authorization = authorizeGrowthIntelligenceRequest({
    authorization: request.headers.get("authorization"),
    requiredScope: "growth:read",
    enabled: process.env[GROWTH_INTELLIGENCE_API_ENABLED_ENV],
    consumerConfig: process.env[GROWTH_INTELLIGENCE_API_CONSUMERS_ENV],
  });

  if (!authorization.ok) {
    auditAccess({
      consumerId: null,
      status: authorization.status,
      durationMs: Date.now() - startedAt,
      outcome: authorization.code,
    });
    const message = authorization.status === 404
      ? "Not found."
      : authorization.status === 503
        ? "Growth intelligence API is unavailable."
        : authorization.status === 403
          ? "Insufficient scope."
          : "Unauthorized.";
    return json(
      { ok: false, error: message },
      authorization.status,
      authorization.status === 401
        ? { "WWW-Authenticate": 'Bearer realm="GeoSub Growth Intelligence"' }
        : {},
    );
  }

  const rateLimit = consumeRateLimit(authorization.consumer.id);
  const rateHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMIT_REQUESTS),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
  };
  if (!rateLimit.allowed) {
    auditAccess({
      consumerId: authorization.consumer.id,
      status: 429,
      durationMs: Date.now() - startedAt,
      outcome: "rate_limited",
    });
    return json(
      { ok: false, error: "Too many requests." },
      429,
      { ...rateHeaders, "Retry-After": String(rateLimit.retryAfter) },
    );
  }

  const days = parseGrowthIntelligenceWindowDays(
    request.nextUrl.searchParams.get("days"),
  );
  if (!days) {
    auditAccess({
      consumerId: authorization.consumer.id,
      status: 400,
      durationMs: Date.now() - startedAt,
      outcome: "invalid_window",
    });
    return json(
      { ok: false, error: "days must be one of 7, 30 or 90." },
      400,
      rateHeaders,
    );
  }

  try {
    const overview = await getGrowthIntelligenceOverview(days);
    auditAccess({
      consumerId: authorization.consumer.id,
      status: 200,
      durationMs: Date.now() - startedAt,
      outcome: "success",
    });
    return json({ ok: true, data: overview }, 200, rateHeaders);
  } catch {
    auditAccess({
      consumerId: authorization.consumer.id,
      status: 503,
      durationMs: Date.now() - startedAt,
      outcome: "read_model_unavailable",
    });
    return json(
      { ok: false, error: "Growth intelligence read model is unavailable." },
      503,
      rateHeaders,
    );
  }
}
