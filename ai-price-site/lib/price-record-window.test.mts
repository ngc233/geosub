import assert from "node:assert/strict";
import test from "node:test";
import { readPriceRecordWindow } from "./price-record-window.ts";
test("reads beyond the former cap without skipping review boundaries", async () => {
  const source = Array.from({ length: 6103 }, (_, i) => ({ id: i, status: i === 5100 ? "rejected" : "approved" }));
  const result = await readPriceRecordWindow<(typeof source)[number]>(async (cursor, limit) => source.slice(cursor ? cursor.id + 1 : 0, (cursor ? cursor.id + 1 : 0) + limit));
  assert.deepEqual(result.records, source);
  assert.equal(result.truncated, false);
});
test("exact cap, overflow and empty reads are distinct", async () => {
  for (const count of [0, 3, 4]) {
    const source = Array.from({ length: count }, (_, id) => ({ id }));
    const result = await readPriceRecordWindow<(typeof source)[number]>(async (cursor, limit) => source.slice(cursor ? cursor.id + 1 : 0, (cursor ? cursor.id + 1 : 0) + limit), 2, 3);
    assert.equal(result.truncated, count > 3);
    assert.deepEqual(result.records, source.slice(0, 3));
  }
});
test("a failed later page fails the read rather than returning a complete empty history", async () => {
  await assert.rejects(readPriceRecordWindow(async (cursor) => {
    if (cursor) throw new Error("read failed");
    return [{ id: 1 }];
  }, 1), /read failed/);
});
