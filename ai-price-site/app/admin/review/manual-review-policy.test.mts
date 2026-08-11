import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function readReviewFile(fileName: string) {
  return readFileSync(resolve(currentDir, fileName), "utf8");
}

test("pending review copy makes source links diagnostic instead of required verification", () => {
  const source = readReviewFile("PendingProductReviewSection.tsx");

  assert.match(source, /不需要逐个国家人工核验/);
  assert.match(source, /查看采集证据/);
  assert.doesNotMatch(source, /打开来源/);
});

test("manual approval is presented as an exceptional override", () => {
  const source = readReviewFile("ObservationReviewActions.tsx");

  assert.match(source, /人工覆盖/);
  assert.match(source, /仅在已有独立结算证据时使用/);
  assert.doesNotMatch(source, /强制入库/);
});

test("collection workspace keeps the default flow understandable", () => {
  const overview = readReviewFile("ReviewOverviewSections.tsx");
  const pending = readReviewFile("PendingProductReviewSection.tsx");
  const runs = readReviewFile("CollectionRunHistorySection.tsx");

  assert.match(overview, /选择要采集的产品/);
  assert.match(overview, /开始采集/);
  assert.match(pending, /需要系统继续处理的产品/);
  assert.match(pending, /仍要重新采集/);
  assert.doesNotMatch(pending, /规则已修，重新采集/);
  assert.doesNotMatch(pending, /只补采这个产品/);
  assert.match(runs, /本轮采集状态/);
  assert.match(runs, /技术详情/);
  assert.doesNotMatch(runs, /<table/);
});
