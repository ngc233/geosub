import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyOperationsBrief,
  fingerprintDailyOperationsBrief,
  serializeDailyOperationsBrief,
  shouldSuppressDailyOperationsBrief,
} from "./daily-operations-brief.ts";
import type { DailyOperationItem } from "./admin-daily-operations.ts";

function item(
  state: DailyOperationItem["state"],
  slug: string,
): DailyOperationItem {
  return {
    productId: slug,
    productSlug: slug,
    productName: slug.toUpperCase(),
    state,
    reason: `${slug} reason`,
    systemSummary: `${slug} system`,
    actionLabel: "查看",
    actionHref: `/admin/${slug}`,
    qualityScore: 80,
    taskEffect: null,
    businessEffect: null,
    businessSummary: null,
  };
}

test("daily brief prioritizes failures and only exposes intervention products", () => {
  const brief = buildDailyOperationsBrief([
    item("healthy", "healthy"),
    item("queued", "queued"),
    item("action", "action"),
    item("failed", "failed"),
  ], new Date("2026-08-01T00:00:00.000Z"));

  assert.equal(brief.level, "critical");
  assert.equal(brief.counts.failed, 1);
  assert.equal(brief.counts.action, 1);
  assert.deepEqual(
    brief.interventionItems.map((entry) => entry.productSlug),
    ["action", "failed"],
  );

  const payload = serializeDailyOperationsBrief(brief);
  assert.equal(payload.interventionRequired, true);
  assert.deepEqual(payload.products.map((entry) => entry.slug), ["action", "failed"]);
  assert.equal(JSON.stringify(payload).includes("systemSummary"), false);
});

test("daily brief stays quiet when products are healthy or already processing", () => {
  const progress = buildDailyOperationsBrief([
    item("running", "running"),
    item("queued", "queued"),
    item("healthy", "healthy"),
  ]);
  assert.equal(progress.level, "progress");
  assert.equal(progress.interventionItems.length, 0);

  const healthy = buildDailyOperationsBrief([item("healthy", "healthy")]);
  assert.equal(healthy.level, "healthy");
  assert.equal(healthy.interventionItems.length, 0);
});

test("daily brief fingerprint ignores generation time and product ordering", () => {
  const first = buildDailyOperationsBrief([
    item("action", "beta"),
    item("failed", "alpha"),
  ], new Date("2026-08-01T00:00:00.000Z"));
  const second = buildDailyOperationsBrief([
    item("failed", "alpha"),
    item("action", "beta"),
  ], new Date("2026-08-02T00:00:00.000Z"));

  assert.equal(
    fingerprintDailyOperationsBrief(first),
    fingerprintDailyOperationsBrief(second),
  );

  second.interventionItems[0].reason = "changed reason";
  assert.notEqual(
    fingerprintDailyOperationsBrief(first),
    fingerprintDailyOperationsBrief(second),
  );
});

test("duplicate suppression stops unchanged repeats but allows recovery and recurrence", () => {
  const fingerprint = "same-problem";

  assert.equal(
    shouldSuppressDailyOperationsBrief(
      { fingerprint, status: "sent" },
      fingerprint,
    ),
    true,
  );
  assert.equal(
    shouldSuppressDailyOperationsBrief(
      { fingerprint, status: "suppressed" },
      fingerprint,
    ),
    true,
  );
  assert.equal(
    shouldSuppressDailyOperationsBrief(
      { fingerprint: "healthy-state", status: "no_action" },
      fingerprint,
    ),
    false,
  );
  assert.equal(
    shouldSuppressDailyOperationsBrief(
      { fingerprint: "changed-problem", status: "sent" },
      fingerprint,
    ),
    false,
  );
  assert.equal(
    shouldSuppressDailyOperationsBrief(
      { fingerprint, status: "failed" },
      fingerprint,
    ),
    false,
  );
});
