import assert from "node:assert/strict";
import test from "node:test";
import { parseCollectorMetadata, priceVersionLabel } from "./admin-version-model.ts";

const valid = {
  schemaVersion: 1, component: "collector", version: "2.22.1",
  commit: "a".repeat(40), deployedAt: "2026-10-31T01:02:03.000Z", operation: "upgrade",
};

test("collector metadata returns only the safe installed component identity", () => {
  assert.deepEqual(parseCollectorMetadata({ ...valid, secret: "never expose", dir: "/private" }), valid);
  assert.equal(parseCollectorMetadata({ ...valid, component: "website" }), null);
  assert.equal(parseCollectorMetadata({ ...valid, commit: "branch-name" }), null);
  assert.equal(parseCollectorMetadata({ ...valid, version: "candidate" }), null);
  assert.equal(parseCollectorMetadata({ ...valid, deployedAt: "not a date" }), null);
  assert.equal(parseCollectorMetadata({ ...valid, operation: "failed" }), null);
  assert.equal(parseCollectorMetadata(null), null);
});

test("rollback keeps its actual component version independently from website", () => {
  assert.equal(parseCollectorMetadata({ ...valid, version: "2.21.2", operation: "rollback" })?.version, "2.21.2");
});

test("price labels use the real recorded UTC date and durable sequence", () => {
  assert.equal(priceVersionLabel("42", "2026-10-31T01:02:03.000Z"), "D20261031.0042");
  assert.equal(priceVersionLabel("10001", "2026-11-01T00:00:00.000Z"), "D20261101.10001");
  assert.equal(priceVersionLabel("0", "2026-10-31"), null);
  assert.equal(priceVersionLabel("42", "invalid"), null);
});
