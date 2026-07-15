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

  assert.match(source, /不要求人工逐国打开 App Store 核验/);
  assert.match(source, /查看采集证据/);
  assert.doesNotMatch(source, /打开来源/);
});

test("manual approval is presented as an exceptional override", () => {
  const source = readReviewFile("ObservationReviewActions.tsx");

  assert.match(source, /人工覆盖/);
  assert.match(source, /仅在已有独立结算证据时使用/);
  assert.doesNotMatch(source, /强制入库/);
});
