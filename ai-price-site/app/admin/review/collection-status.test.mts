import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCollectionRedirectPath,
  getCollectionStatusMessage,
  getCollectionStatusTone,
  normalizeCollectionRunStatus,
} from "./collection-status.ts";

test("collection redirect stays relative and preserves product scope", () => {
  assert.equal(
    buildCollectionRedirectPath(
      {
        queuedCount: 2,
        runStatus: "queued",
      },
      " netflix ",
    ),
    "/admin/review?collectionQueued=2&collectionRun=queued&collectionScope=netflix&q=netflix",
  );
});

test("collection redirect without product scope does not leak hostnames", () => {
  const path = buildCollectionRedirectPath({
    queuedCount: 0,
    runStatus: "none",
  });

  assert.equal(path, "/admin/review?collectionQueued=0&collectionRun=none");
  assert.equal(path.includes("localhost"), false);
  assert.equal(path.startsWith("http"), false);
});

test("unknown collection status is normalized away", () => {
  assert.equal(normalizeCollectionRunStatus("queued"), "queued");
  assert.equal(normalizeCollectionRunStatus("unexpected"), null);
  assert.equal(normalizeCollectionRunStatus(null), null);
});

test("missing app store job gets a configuration message, not a freshness message", () => {
  const message = getCollectionStatusMessage({
    queuedCount: 0,
    collectionRun: "not_configured",
    collectionScope: "grok",
  });

  assert.match(message, /还没有可用的 App Store 采集任务/);
  assert.doesNotMatch(message, /12 小时内已经成功采集过/);
  assert.equal(getCollectionStatusTone("not_configured"), "warning");
});

test("queued collection explains that the backend runner was started", () => {
  const message = getCollectionStatusMessage({
    queuedCount: 1,
    collectionRun: "queued",
    collectionScope: "chatgpt",
  });

  assert.match(message, /已排队并唤起后台采集器/);
  assert.match(message, /chatgpt/);
  assert.equal(getCollectionStatusTone("queued"), "success");
});

test("missing product is shown as an error", () => {
  const message = getCollectionStatusMessage({
    queuedCount: 0,
    collectionRun: "not_found",
    collectionScope: "unknown-product",
  });

  assert.match(message, /没有找到 unknown-product 对应的产品/);
  assert.equal(getCollectionStatusTone("not_found"), "error");
});
