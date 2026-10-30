import { getTrustedClientIp, type HeaderReader } from "./client-ip.ts";

export const EVENT_RATE_LIMIT_REQUESTS = 60;
export const EVENT_RATE_LIMIT_WINDOW_MS = 60_000;
export const EVENT_RATE_LIMIT_RETENTION_DAYS = 2;
export const EVENT_RATE_LIMIT_MAX_MEMORY_KEYS = 10_000;

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

type EventRateLimitStoreOptions = {
  limit?: number;
  maxKeys?: number;
  windowMs?: number;
};

export function isEventRateLimitEnabled(
  value = process.env.GEOSUB_EVENTS_RATE_LIMIT_ENABLED,
) {
  const normalized = value?.trim().toLowerCase();

  return normalized !== "0" && normalized !== "false" && normalized !== "off";
}

export function getTrustedEventClientIp(
  headers: HeaderReader,
  configuredHeader = process.env.GEOSUB_EVENTS_CLIENT_IP_HEADER ||
    process.env.GEOSUB_CLIENT_IP_HEADER,
) {
  return getTrustedClientIp(headers, configuredHeader);
}

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

export function createInMemoryEventRateLimiter({
  limit = EVENT_RATE_LIMIT_REQUESTS,
  maxKeys = EVENT_RATE_LIMIT_MAX_MEMORY_KEYS,
  windowMs = EVENT_RATE_LIMIT_WINDOW_MS,
}: EventRateLimitStoreOptions = {}) {
  const states = new Map<string, EventRateLimitState>();
  const boundedMaxKeys = Math.max(1, Math.trunc(maxKeys));
  let operations = 0;

  function pruneExpired(nowMs: number) {
    for (const [key, state] of states) {
      if (state.windowStartedAtMs <= nowMs - windowMs) {
        states.delete(key);
      }
    }
  }

  return {
    consume(key: string, nowMs = Date.now()) {
      operations += 1;

      if (operations % 256 === 0) {
        pruneExpired(nowMs);
      }

      if (!states.has(key) && states.size >= boundedMaxKeys) {
        pruneExpired(nowMs);

        if (states.size >= boundedMaxKeys) {
          const oldestKey = states.keys().next().value;

          if (oldestKey) {
            states.delete(oldestKey);
          }
        }
      }

      const decision = advanceEventRateLimitWindow({
        state: states.get(key) || null,
        nowMs,
        limit,
        windowMs,
      });

      states.delete(key);
      states.set(key, {
        requestCount: decision.requestCount,
        windowStartedAtMs: decision.windowStartedAtMs,
      });

      return decision;
    },
    get size() {
      return states.size;
    },
    clear() {
      states.clear();
    },
  };
}

export async function checkEventRateLimitSafely(
  check: () => EventRateLimitDecision | Promise<EventRateLimitDecision>,
  onError?: (error: unknown) => void,
) {
  try {
    return await check();
  } catch (error) {
    onError?.(error);
    return null;
  }
}
