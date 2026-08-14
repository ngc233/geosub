import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const collectorPath = resolve(
  repoRoot,
  "geosub-backend/scripts/collect-app-store-prices.ps1",
);

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

test("App Store collector applies transparent, bounded network controls", () => {
  const collector = readFileSync(collectorPath, "utf8");
  const renderer = readRepoFile(
    "geosub-backend/scripts/render-app-store-prices.mjs",
  );
  const environment = readRepoFile(
    "geosub-backend/deploy/linux-arm64/env.example",
  );

  assert.match(collector, /GEOSUB_APP_STORE_COLLECTION_ENABLED/);
  assert.match(collector, /GEOSUB_APP_STORE_REQUEST_DELAY_MS/);
  assert.match(collector, /GEOSUB_APP_STORE_MAX_RETRIES/);
  assert.match(collector, /GEOSUB_APP_STORE_CACHE_TTL_MINUTES/);
  assert.match(collector, /Wait-AppStoreRequestSlot/);
  assert.match(collector, /Wait-AppStoreRetryBackoff/);
  assert.match(collector, /Get-FreshAppStoreCacheContent/);
  assert.match(collector, /GeoSubPriceResearch\/2\.8/);
  assert.doesNotMatch(collector, /Chrome\/126\.0 Safari\/537\.36/);
  assert.match(renderer, /args\.get\("user-agent"\)/);
  assert.match(renderer, /GeoSubPriceResearch\/2\.8/);
  assert.match(environment, /GEOSUB_APP_STORE_COLLECTION_ENABLED=true/);
  assert.match(environment, /GEOSUB_APP_STORE_CACHE_DIR=\/var\/lib\/geosub\/app-store-cache/);
});

test("App Store emergency brake exits before database or storefront access", () => {
  const shell = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const result = spawnSync(
    shell,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", collectorPath],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GEOSUB_APP_STORE_COLLECTION_ENABLED: "false",
      },
      timeout: 20_000,
    },
  );

  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /No storefront request was made/);
  assert.doesNotMatch(output, /Product '.+' not found|database command failed/);
});
