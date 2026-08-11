import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceEventRateLimitWindow,
  checkEventRateLimitSafely,
  createInMemoryEventRateLimiter,
  EVENT_RATE_LIMIT_REQUESTS,
  EVENT_RATE_LIMIT_WINDOW_MS,
  getTrustedEventClientIp,
  isEventRateLimitEnabled,
} from "./event-rate-limit.ts";

test("event rate limit increments inside the active window", () => {
  const nowMs = Date.UTC(2026, 7, 11, 12, 0, 30);
  const decision = advanceEventRateLimitWindow({
    state: {
      requestCount: 12,
      windowStartedAtMs: nowMs - 30_000,
    },
    nowMs,
  });

  assert.equal(decision.requestCount, 13);
  assert.equal(decision.allowed, true);
  assert.equal(decision.remaining, EVENT_RATE_LIMIT_REQUESTS - 13);
  assert.equal(decision.retryAfterSeconds, 0);
});

test("event rate limit resets after the window expires", () => {
  const nowMs = Date.UTC(2026, 7, 11, 12, 1, 0);
  const decision = advanceEventRateLimitWindow({
    state: {
      requestCount: EVENT_RATE_LIMIT_REQUESTS,
      windowStartedAtMs: nowMs - EVENT_RATE_LIMIT_WINDOW_MS,
    },
    nowMs,
  });

  assert.equal(decision.requestCount, 1);
  assert.equal(decision.windowStartedAtMs, nowMs);
  assert.equal(decision.allowed, true);
  assert.equal(decision.remaining, EVENT_RATE_LIMIT_REQUESTS - 1);
});

test("event rate limit blocks requests above the threshold", () => {
  const nowMs = Date.UTC(2026, 7, 11, 12, 0, 45);
  const decision = advanceEventRateLimitWindow({
    state: {
      requestCount: EVENT_RATE_LIMIT_REQUESTS,
      windowStartedAtMs: nowMs - 45_000,
    },
    nowMs,
  });

  assert.equal(decision.requestCount, EVENT_RATE_LIMIT_REQUESTS + 1);
  assert.equal(decision.allowed, false);
  assert.equal(decision.remaining, 0);
  assert.equal(decision.retryAfterSeconds, 15);
});

test("in-memory event rate limiter blocks the sixty-first request", () => {
  const limiter = createInMemoryEventRateLimiter();
  const nowMs = Date.UTC(2026, 7, 11, 12, 0, 0);
  let decision = limiter.consume("client-a", nowMs);

  for (let request = 2; request <= EVENT_RATE_LIMIT_REQUESTS + 1; request += 1) {
    decision = limiter.consume("client-a", nowMs);
  }

  assert.equal(decision.requestCount, EVENT_RATE_LIMIT_REQUESTS + 1);
  assert.equal(decision.allowed, false);
});

test("in-memory event rate limiter evicts old keys at its memory bound", () => {
  const limiter = createInMemoryEventRateLimiter({ maxKeys: 2 });
  const nowMs = Date.UTC(2026, 7, 11, 12, 0, 0);

  limiter.consume("client-a", nowMs);
  limiter.consume("client-b", nowMs);
  limiter.consume("client-c", nowMs);

  assert.equal(limiter.size, 2);
  assert.equal(limiter.consume("client-a", nowMs).requestCount, 1);
});

test("trusted client IP ignores a spoofed left-most forwarded value", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.99, 203.0.113.10",
    "x-real-ip": "203.0.113.10",
  });

  assert.equal(getTrustedEventClientIp(headers), "203.0.113.10");
  assert.equal(
    getTrustedEventClientIp(headers, "x-forwarded-for-rightmost"),
    "203.0.113.10",
  );
});

test("event rate limiting can be disabled for immediate rollback", () => {
  assert.equal(isEventRateLimitEnabled(undefined), true);
  assert.equal(isEventRateLimitEnabled("false"), false);
  assert.equal(isEventRateLimitEnabled("off"), false);
});

test("rate limiter failures degrade to an allowed request", async () => {
  let logged = false;
  const decision = await checkEventRateLimitSafely(
    () => {
      throw new Error("limiter unavailable");
    },
    () => {
      logged = true;
    },
  );

  assert.equal(decision, null);
  assert.equal(logged, true);
});
