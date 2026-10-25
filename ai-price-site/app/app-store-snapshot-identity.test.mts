import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

test("actual App Store collector captures period identity without guessing unknown items", () => {
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", resolve("../geosub-backend/tests/app-store-snapshot-identity.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: captured snapshot identity/);
});
