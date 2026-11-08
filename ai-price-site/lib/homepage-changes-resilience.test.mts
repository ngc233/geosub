import assert from "node:assert/strict";
import test from "node:test";
import { createHomepageChangesGuard, homepageChangesErrorCategory, HomepageChangesCoolingDown } from "./homepage-changes-resilience.ts";

test("concurrent cold requests share one read; failures retry after 30s, not after 1h", async () => {
  let now = 100, calls = 0, logs = 0, fail = true;
  const guard = createHomepageChangesGuard(async () => { calls++; await new Promise(r => setTimeout(r, 10)); if (fail) throw Error("secret"); return [42]; }, () => logs++, () => now);
  const result = await Promise.allSettled(Array.from({ length: 20 }, () => guard()));
  assert.ok(result.every(r => r.status === "rejected"));
  assert.equal(calls, 1); assert.equal(logs, 1);
  now += 29_999;
  await assert.rejects(guard(), HomepageChangesCoolingDown); assert.equal(calls, 1);
  now++; fail = false;
  assert.deepEqual(await guard(), [42]); assert.equal(calls, 2);
  assert.deepEqual(await guard(), [42]); assert.equal(calls, 3); // success caching is Next's responsibility
});
test("failure category never includes SQL, connection string or raw error message", () => {
  assert.equal(homepageChangesErrorCategory({code:"P2028",message:"secret"}),"timeout");
  assert.equal(homepageChangesErrorCategory({code:"P2010",meta:{code:"57014",message:"secret"}}),"timeout");
  assert.equal(homepageChangesErrorCategory({code:"57014"}),"timeout");
  assert.equal(homepageChangesErrorCategory({code:"P2010",meta:{driverAdapterError:{cause:{originalCode:"57014",originalMessage:"secret"}}}}),"timeout");
  assert.equal(homepageChangesErrorCategory(new Error("postgres://secret")),"read-error");
});
