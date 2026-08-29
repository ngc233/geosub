import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { summarizeCollectorRunError } from "./collector-run-error-copy.ts";

test("summarizes incomplete App Store runs without exposing the raw log as row copy", () => {
  const detail = [
    "App Store collection incomplete.",
    "Inserted: 0.",
    "Confirmed storefronts: 1.",
    "Transient failures: 14.",
    "Temporary storefront failures must be retried.",
  ].join(" ");

  assert.deepEqual(summarizeCollectorRunError(detail), {
    summary: "14 个 App Store 商店暂时失败，需重试。",
    detail,
  });
});

test("keeps unknown errors available as detail while showing actionable Chinese copy", () => {
  const detail = "Unexpected collector response from upstream";

  assert.deepEqual(summarizeCollectorRunError(detail), {
    summary: "采集失败，请进入“任务”查看完整错误。",
    detail,
  });
});

test("uses the existing fallback when no collector error was recorded", () => {
  assert.deepEqual(summarizeCollectorRunError(null), {
    summary: "最近一次采集失败，需要先看失败原因。",
    detail: null,
  });
});

test("only bounds queue reasons that retain a complete title detail", () => {
  const overview = readFileSync(
    new URL("./DataQualityOverview.tsx", import.meta.url),
    "utf8",
  );

  assert.match(overview, /health\.reasonDetail \? "line-clamp-3" : ""/);
  assert.match(overview, /title=\{health\.reasonDetail \|\| undefined\}/);
});
