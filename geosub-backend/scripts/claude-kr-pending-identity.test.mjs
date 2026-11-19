import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

test("Claude KR independent monthly plans remain scoped, review-only and isolated from old IDs (offline)", () => {
  const result = spawnSync("pwsh", [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-File",
    fileURLToPath(new URL("../tests/claude-kr-pending-identity.ps1", import.meta.url)),
  ], {
    encoding: "utf8", timeout: 20_000,
    env: { ...process.env, DATABASE_URL: "", GEOSUB_APP_STORE_COLLECTION_ENABLED: "false" },
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal((result.stdout.match(/^PASS:/gm) || []).length, 11, result.stdout);
});

test("canonical validator accepts all specifications including unpriced review-only Claude plans without database access", () => {
  const checker = fileURLToPath(new URL("../../ai-price-site/scripts/check-product-plan-specs.cjs", import.meta.url));
  const source = readFileSync(checker, "utf8");
  const boundary = source.indexOf("\nasync function validateDatabase(");
  assert.ok(boundary > 0, "pure specification validator boundary must exist");
  const require = createRequire(import.meta.url);
  const context = {
    __dirname: dirname(checker), process: { env: {} },
    require(name) {
      if (["fs", "path", "node:fs", "node:path"].includes(name)) return require(name);
      if (name === "dotenv") return { config() {} };
      if (name === "pg") return { Client: class { constructor() { throw Error("database access forbidden"); } } };
      throw Error(`unexpected validator dependency: ${name}`);
    },
    result: undefined,
  };
  runInNewContext(`${source.slice(0, boundary)}\nresult = validateSpecs(loadAllSpecs());`, context);
  assert.equal(JSON.stringify(context.result), "[]");
});
