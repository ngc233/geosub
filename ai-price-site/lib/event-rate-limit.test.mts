import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceEventRateLimitWindow,
  EVENT_RATE_LIMIT_REQUESTS,
  EVENT_RATE_LIMIT_WINDOW_MS,
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
