import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlanSitemapPromotionRevision,
  getDefaultPlanSitemapPromotionState,
  parsePlanSitemapPromotionState,
  rollbackLatestPlanSitemapPromotionRevision,
} from "./seo-plan-promotion-state.ts";

test("plan promotion state falls back to the reviewed code baseline", () => {
  const state = parsePlanSitemapPromotionState("not-json");

  assert.deepEqual(state, getDefaultPlanSitemapPromotionState());
  assert.ok(state.activeSlugs.includes("chatgpt"));
  assert.equal(state.revisions.length, 0);
});

test("plan promotion changes are normalized audited and reversible", () => {
  const baseline = getDefaultPlanSitemapPromotionState();
  const removedSlug = baseline.activeSlugs[0];
  const changed = createPlanSitemapPromotionRevision({
    current: baseline,
    nextActiveSlugs: baseline.activeSlugs
      .filter((slug) => slug !== removedSlug)
      .concat("captions"),
    id: "change-1",
    changedAt: "2026-08-14T06:00:00.000Z",
    actorLabel: "admin@example.com",
    reason: "Captions reached the reviewed promotion threshold.",
  });

  assert.ok(changed.activeSlugs.includes("captions"));
  assert.ok(!changed.activeSlugs.includes(removedSlug));
  assert.deepEqual(changed.revisions[0].addedSlugs, ["captions"]);
  assert.deepEqual(changed.revisions[0].removedSlugs, [removedSlug]);

  const restored = rollbackLatestPlanSitemapPromotionRevision({
    current: changed,
    expectedRevisionId: "change-1",
    id: "rollback-1",
    changedAt: "2026-08-14T06:05:00.000Z",
    actorLabel: "admin@example.com",
  });

  assert.deepEqual(restored.activeSlugs, baseline.activeSlugs);
  assert.equal(restored.revisions.at(-1)?.kind, "rollback");
  assert.deepEqual(restored.revisions.at(-1)?.addedSlugs, [removedSlug]);
  assert.deepEqual(restored.revisions.at(-1)?.removedSlugs, ["captions"]);
});

test("plan promotion rollback rejects stale browser state", () => {
  const baseline = getDefaultPlanSitemapPromotionState();
  const changed = createPlanSitemapPromotionRevision({
    current: baseline,
    nextActiveSlugs: baseline.activeSlugs.concat("captions"),
    id: "change-1",
    changedAt: "2026-08-14T06:00:00.000Z",
    actorLabel: "admin@example.com",
    reason: "Approved with capacity.",
  });

  assert.throws(
    () => rollbackLatestPlanSitemapPromotionRevision({
      current: changed,
      expectedRevisionId: "older-change",
      id: "rollback-1",
      changedAt: "2026-08-14T06:05:00.000Z",
      actorLabel: "admin@example.com",
    }),
    /history changed/i,
  );
});
