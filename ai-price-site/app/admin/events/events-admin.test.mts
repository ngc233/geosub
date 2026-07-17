import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const eventsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(eventsDir, "../../..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

test("event analytics filters production traffic with bounded dates", () => {
  const analytics = readProjectFile("lib/admin-event-analytics.ts");

  assert.match(analytics, /days < 1 \|\| days > 730 \|\| end > today/);
  assert.match(analytics, /click_affiliate/);
  assert.match(analytics, /click_official/);
  assert.match(analytics, /click_ad/);
  assert.match(analytics, /manual_test/);
  assert.match(analytics, /affiliate_test/);
  assert.match(analytics, /tracking-test/);
  assert.match(analytics, /HIGH_FREQUENCY_EVENT_THRESHOLD = 100/);
  assert.match(analytics, /AUTOMATED_USER_AGENT_MARKERS/);
  assert.match(analytics, /findHighFrequencyVisitorIds/);
  assert.match(analytics, /missing-session/);
  assert.match(analytics, /not-found/);
  assert.match(analytics, /unknown-device/);
  assert.match(analytics, /automated/);
});

test("event log page supports operational filters pagination and export", () => {
  const page = readProjectFile("app/admin/events/page.tsx");

  for (const filterName of ["from", "to", "type", "product", "device", "quality", "q"]) {
    assert.match(page, new RegExp(`name=\\"${filterName}\\"`));
  }

  assert.match(page, /PAGE_SIZE = 25/);
  assert.match(page, /上一页/);
  assert.match(page, /下一页/);
  assert.match(page, /\/admin\/events\/export/);
  assert.match(page, /distinct: \["anonymousId"\]/);
  assert.doesNotMatch(page, /where: \{ status: "PUBLISHED" \}/);
  assert.doesNotMatch(page, /userAgent: true/);
  assert.match(page, /疑似自动化/);
  assert.match(page, /缺会话/);
});

test("event CSV export is authenticated bounded and privacy conscious", () => {
  const route = readProjectFile("app/admin/events/export/route.ts");

  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /EXPORT_LIMIT = 10_000/);
  assert.match(route, /text\/csv; charset=utf-8/);
  assert.match(route, /anonymousId\?\.slice\(0, 8\)/);
  assert.doesNotMatch(route, /userAgent: true/);
  assert.match(route, /quality: url\.searchParams\.get\("quality"\)/);
  assert.match(route, /findHighFrequencyVisitorIds/);
});
