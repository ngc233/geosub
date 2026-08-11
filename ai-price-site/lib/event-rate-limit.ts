export const EVENT_RATE_LIMIT_REQUESTS = 60;
export const EVENT_RATE_LIMIT_WINDOW_MS = 60_000;
export const EVENT_RATE_LIMIT_RETENTION_DAYS = 2;

export type EventRateLimitState = {
  requestCount: number;
  windowStartedAtMs: number;
};

export type EventRateLimitDecision = EventRateLimitState & {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type AdvanceEventRateLimitInput = {
  state: EventRateLimitState | null;
  nowMs: number;
  limit?: number;
  windowMs?: number;
};

export function buildEventRateLimitDecision({
  requestCount,
  windowStartedAtMs,
  nowMs,
  limit = EVENT_RATE_LIMIT_REQUESTS,
  windowMs = EVENT_RATE_LIMIT_WINDOW_MS,
}: EventRateLimitState & {
  nowMs: number;
  limit?: number;
  windowMs?: number;
}): EventRateLimitDecision {
  const allowed = requestCount <= limit;
  const remaining = Math.max(0, limit - requestCount);
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(1, Math.ceil((windowStartedAtMs + windowMs - nowMs) / 1000));

  return {
    requestCount,
    windowStartedAtMs,
    allowed,
    remaining,
    retryAfterSeconds,
  };
}

export function advanceEventRateLimitWindow({
  state,
  nowMs,
  limit = EVENT_RATE_LIMIT_REQUESTS,
  windowMs = EVENT_RATE_LIMIT_WINDOW_MS,
}: AdvanceEventRateLimitInput): EventRateLimitDecision {
  const expired = !state || state.windowStartedAtMs <= nowMs - windowMs;
  const requestCount = expired ? 1 : state.requestCount + 1;
  const windowStartedAtMs = expired ? nowMs : state.windowStartedAtMs;

  return buildEventRateLimitDecision({
    requestCount,
    windowStartedAtMs,
    nowMs,
    limit,
    windowMs,
  });
}
