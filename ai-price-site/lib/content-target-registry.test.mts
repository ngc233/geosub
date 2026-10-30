import assert from "node:assert/strict";
import test from "node:test";
import { contentTargets, getRegisteredContentTarget, contentTargetReadiness, overviewEditorialFields, protectedContentFields } from "./content-target-registry.ts";
import { CONTENT_PATH, CONTENT_TAG, isContentTarget } from "./managed-content.ts";
import { getActiveSeoExperimentLock } from "./seo-experiment-locks.ts";

test("pilot identity is unchanged and new canaries remain blocked for production", () => {
  const pilot = getRegisteredContentTarget("overview:en:chatgpt");
  assert.equal(pilot.canonicalPath, CONTENT_PATH);
  assert.equal(pilot.cacheTag, CONTENT_TAG);
  assert.equal(pilot.storagePrefix, "content-pilot:en:chatgpt:");
  for (const id of ["overview:zh:claude", "overview:en:claude"]) {
    const value = getRegisteredContentTarget(id);
    assert.equal(getActiveSeoExperimentLock(value.canonicalPath), null);
    assert.equal(contentTargetReadiness(id).expansionActivated, false);
    assert.ok(contentTargetReadiness(id).blockers.includes("exact_rollback_compatibility"));
    assert.equal(isContentTarget(value.locale, value.productSlug), true);
  }
});
test("each page/language has a separate immutable storage, cache and route identity", () => {
  for (const key of ["id", "canonicalPath", "storagePrefix", "cacheTag"] as const) assert.equal(new Set(contentTargets.map((row) => row[key])).size, contentTargets.length);
  assert.throws(() => { (getRegisteredContentTarget("overview:zh:claude") as { canonicalPath: string }).canonicalPath = "/en/ai-pricing/chatgpt"; }, TypeError);
  assert.throws(() => { (getRegisteredContentTarget("overview:en:claude").sourceHosts as string[]).push("evil.test"); }, TypeError);
});
test("unregistered routes, locales, plans and frozen targets cannot be supplied as target IDs", () => {
  for (const id of ["/en/ai-pricing/claude", "overview:es:claude", "overview:zh:chatgpt/plus", "plan:zh:chatgpt:plus", "__proto__", "overview:en:../../admin"]) assert.throws(() => getRegisteredContentTarget(id), /未登记/);
  for (const name of protectedContentFields) assert.ok(!(overviewEditorialFields as readonly string[]).includes(name));
});
