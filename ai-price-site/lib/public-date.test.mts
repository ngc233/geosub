import assert from "node:assert/strict";
import test from "node:test";
import { formatPublicDate } from "./public-date.ts";

const now = new Date("2026-11-04T12:00:00Z");
test("same-year date has a short Chinese label and a complete datetime", () => {
  assert.deepEqual(formatPublicDate("2026-11-04", now), { text: "11月4日", dateTime: "2026-11-04" });
});
test("cross-year date keeps its year", () => {
  assert.deepEqual(formatPublicDate("2025-12-30", now), { text: "2025年12月30日", dateTime: "2025-12-30" });
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
