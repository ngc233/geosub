import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "../..");
const contract = require("../../geosub-backend/deploy/linux-arm64/content-release-contract.cjs");
const policy = JSON.parse(readFileSync(join(root, "geosub-backend/deploy/linux-arm64/rolling-content-compatibility.json"), "utf8"));
const rendererFiles = [
  "ai-price-site/components/ProductCanvasOverview.tsx",
  "ai-price-site/components/ProductCanvasPricing.tsx",
  "ai-price-site/lib/product-canvas.ts",
  "ai-price-site/lib/product-canvas-order.ts",
];

test("V4 rollback fingerprints new rendering dependencies and rejects changes or missing files", () => {
  for (const file of rendererFiles) assert(policy.files.includes(file), `${file} must be fingerprinted`);
  const retained = "ead5051bb786a6cc16d0791ad463667e9fe1b0b4";
  const fixtures = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/retained-content-contracts.json"), "utf8"));
  const pair = policy.approvedPairs.find((entry: { from: string; retainedCommit: string }) =>
    entry.from === contract.fingerprint(root, policy.files) && entry.retainedCommit === retained);
  assert(pair, "Current candidate needs an exact reviewed retained-reader pair");
  assert(pair.toFiles, "Retained scope must be explicit; old builds lack V4 files");
  const temp = mkdtempSync(join(tmpdir(), "geosub-v4-contract-"));
  const from = join(temp, "candidate"), to = join(temp, "retained");
  const put = (base: string, file: string, bytes: Buffer) => {
    mkdirSync(dirname(join(base, file)), { recursive: true });
    writeFileSync(join(base, file), bytes);
  };
  try {
    for (const file of policy.files) put(from, file, readFileSync(join(root, file)));
    for (const file of pair.toFiles) {
      const fixture = fixtures[retained][file];
      const bytes = gunzipSync(Buffer.from(fixture.gzipBase64.join(""), "base64"));
      assert.equal(contract.hash(bytes), fixture.sha256);
      put(to, file, bytes);
    }
    assert.equal(contract.fingerprint(to, pair.toFiles), pair.to);
    assert.equal(contract.rollbackPlan(from, to, policy).mode, "audited-compatible-readers");
    for (const file of rendererFiles) {
      const bytes = readFileSync(join(from, file));
      put(from, file, Buffer.concat([bytes, Buffer.from("\n// unreviewed change\n")]));
      assert.equal(contract.rollbackPlan(from, to, policy).mode, "code-default-required", file);
      rmSync(join(from, file));
      assert.equal(contract.rollbackPlan(from, to, policy).mode, "code-default-required", file);
      put(from, file, bytes);
    }
    assert.equal(contract.rollbackPlan(to, from, policy).mode, "code-default-required");
    assert.equal(contract.rollbackPlan(from, to, { ...policy, approvedPairs: [] }).mode, "code-default-required");
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
