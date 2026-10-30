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

  assert.match(overview, /异常审核/);
  assert.match(overview, /稳定价格通过验证后自动写入正式库/);
  assert.doesNotMatch(overview, /<ManualCollectionProgressForm/);
  assert.match(pending, /待审异常/);
  assert.match(pending, /修正后补采/);
  assert.match(pending, /补采不会跳过稳定样本或硬异常门禁/);
  assert.match(runs, /本次采集进度/);
  assert.match(runs, /继续处理异常/);
  assert.match(runs, /查看正式价格/);
  assert.match(runs, /技术详情/);
  assert.doesNotMatch(runs, /<table/);
});
