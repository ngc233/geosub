import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  REQUIRED_REVIEW_REASON_CODES,
  reviewReasonAction,
  reviewReasonLabel,
} from "./review-reason-copy.ts";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../../../..");
const autoReviewSql = readFileSync(
  resolve(repoRoot, "geosub-backend/sql/033_app_store_stability_auto_review_v2.sql"),
  "utf8",
);

function getSqlReasonCodes() {
  return Array.from(autoReviewSql.matchAll(/v_reason_code := '([^']+)'/g), (match) => match[1]).sort();
}

test("every SQL auto-review reason code has admin-facing copy", () => {
  const requiredCodes = new Set<string>(REQUIRED_REVIEW_REASON_CODES);

  for (const reasonCode of getSqlReasonCodes()) {
    assert.ok(
      requiredCodes.has(reasonCode),
      `${reasonCode} should have a label and action in review-reason-copy.ts`,
    );
    assert.notEqual(reviewReasonLabel(reasonCode), reasonCode);
    assert.notEqual(reviewReasonAction(reasonCode), "查看具体记录的审核说明。");
  }
});

test("hard price anomalies explain that the system blocks them automatically", () => {
  assert.match(reviewReasonAction("app_store_observation_anomaly"), /不会自动上线/);
  assert.match(reviewReasonAction("app_store_observation_anomaly"), /不需要人工逐国打开 App Store/);
  assert.match(reviewReasonAction("app_store_price_suspiciously_low"), /不会自动上线/);
  assert.match(reviewReasonAction("app_store_global_price_outlier"), /自动挡住/);
});

test("unknown reason codes still fall back safely", () => {
  assert.equal(reviewReasonLabel("new_reason_code"), "new_reason_code");
  assert.equal(reviewReasonAction("new_reason_code"), "查看具体记录的审核说明。");
});
