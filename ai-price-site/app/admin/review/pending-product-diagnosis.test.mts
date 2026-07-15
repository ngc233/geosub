import assert from "node:assert/strict";
import test from "node:test";
import { diagnosePendingProductGroup } from "./pending-product-diagnosis.ts";
import type { PendingProductGroup } from "./types.ts";

function group(overrides: Partial<PendingProductGroup> = {}): PendingProductGroup {
  return {
    productSlug: "chatgpt",
    productName: "ChatGPT",
    rows: [],
    plans: [],
    latestSuccessAt: null,
    hasFreshSuccess: false,
    pendingCount: 10,
    planCount: 2,
    countryCount: 8,
    blockedCount: 0,
    waitingCount: 0,
    changedCount: 0,
    lowConfidenceCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    ignoredCount: 0,
    ...overrides,
  };
}

test("blocked pending product is treated as a hard anomaly, not manual approval work", () => {
  const diagnosis = diagnosePendingProductGroup(group({ blockedCount: 3 }));

  assert.equal(diagnosis.level, "danger");
  assert.equal(diagnosis.label, "硬异常");
  assert.match(diagnosis.detail, /不要人工强行通过/);
});

test("freshly collected product asks the operator to wait instead of clicking repeatedly", () => {
  const diagnosis = diagnosePendingProductGroup(group({ hasFreshSuccess: true, pendingCount: 12 }));

  assert.equal(diagnosis.level, "info");
  assert.equal(diagnosis.label, "已补采");
  assert.match(diagnosis.nextAction, /不要反复点采集/);
});

test("sample shortage is explained as an automatic collection problem", () => {
  const diagnosis = diagnosePendingProductGroup(
    group({
      pendingCount: 9,
      waitingCount: 9,
    }),
  );

  assert.equal(diagnosis.label, "样本不足");
  assert.match(diagnosis.detail, /不是人工核验问题/);
});

test("large pending backlog suggests product-level recollection", () => {
  const diagnosis = diagnosePendingProductGroup(group({ pendingCount: 120 }));

  assert.equal(diagnosis.level, "warning");
  assert.equal(diagnosis.label, "积压较多");
  assert.match(diagnosis.nextAction, /只补采这个产品/);
});
