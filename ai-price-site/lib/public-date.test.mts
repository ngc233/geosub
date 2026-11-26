import assert from "node:assert/strict";
import test from "node:test";
import { formatPublicDate } from "./public-date.ts";

const now = new Date("2026-11-04T12:00:00Z");
test("same-year date has a short Chinese label and a complete datetime", () => {
  assert.deepEqual(formatPublicDate("2026-11-04", now), { text: "11月4日", dateTime: "2026-11-04" });
  assert.deepEqual(formatPublicDate("2026-11-04", now, "zh-tw"), { text: "11月4日", dateTime: "2026-11-04" });
  assert.deepEqual(formatPublicDate("2026-11-04", now, "ja"), { text: "11月4日", dateTime: "2026-11-04" });
  assert.deepEqual(formatPublicDate("2026-11-04", now, "ko"), { text: "11월 4일", dateTime: "2026-11-04" });
  assert.deepEqual(formatPublicDate("2026-11-04", now, "en"), { text: "Nov 4", dateTime: "2026-11-04" });
  assert.deepEqual(formatPublicDate("2026-11-04", now, "es"), { text: "4 nov", dateTime: "2026-11-04" });
});
test("cross-year date keeps its year", () => {
  assert.deepEqual(formatPublicDate("2025-12-30", now), { text: "2025年12月30日", dateTime: "2025-12-30" });
  assert.deepEqual(formatPublicDate("2025-12-30", now, "ko"), { text: "2025년 12월 30일", dateTime: "2025-12-30" });
  assert.deepEqual(formatPublicDate("2025-12-30", now, "en"), { text: "Dec 30, 2025", dateTime: "2025-12-30" });
  assert.deepEqual(formatPublicDate("2025-12-30", now, "es"), { text: "30 dic 2025", dateTime: "2025-12-30" });
});
test("missing and invalid dates do not invent a date", () => {
  for (const input of [undefined, null, "", "bad", "2026-02-30", "2026-02-30T12:00:00Z", "11/04/2026", new Date(NaN)]) {
    assert.equal(formatPublicDate(input, now), null);
  }
});
test("timestamps and the year boundary use Asia/Shanghai, not the host timezone", () => {
  assert.deepEqual(formatPublicDate("2025-12-31T16:30:00Z", new Date("2025-12-31T17:00:00Z")), { text: "1月1日", dateTime: "2026-01-01" });
  assert.deepEqual(formatPublicDate("2025-12-31", new Date("2025-12-31T17:00:00Z")), { text: "2025年12月31日", dateTime: "2025-12-31" });
});
