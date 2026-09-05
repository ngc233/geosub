import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const importer = readFileSync(
  new URL("../scripts/import-growth-search-evidence.mts", import.meta.url),
  "utf8",
);
const report = readFileSync(
  new URL("../scripts/report-growth-weekly.mts", import.meta.url),
  "utf8",
);
const rollback = readFileSync(
  new URL("../scripts/rollback-growth-search-evidence.mts", import.meta.url),
  "utf8",
);

test("growth evidence CLIs are wired and keep local write/read safety gates", () => {
  assert.match(
    packageJson.scripts["import:growth-search"],
    /scripts\/import-growth-search-evidence\.mts$/,
  );
  assert.match(
    packageJson.scripts["report:growth-weekly"],
    /scripts\/report-growth-weekly\.mts$/,
  );
  assert.match(
    packageJson.scripts["rollback:growth-search"],
    /scripts\/rollback-growth-search-evidence\.mts$/,
  );

  assert.match(importer, /--apply-local/);
  assert.match(importer, /--rollback-out/);
  assert.match(importer, /assertGrowthLocalDatabase\(process\.env\.DATABASE_URL\)/);
  assert.match(report, /BEGIN READ ONLY/);
  assert.match(report, /--snapshot-at/);
  assert.match(report, /--bing-shadow/);
  assert.match(report, /bingShadowSnapshotToGrowthEvidence/);
  assert.match(report, /--google-shadow/);
  assert.match(report, /googleShadowSnapshotToGrowthEvidence/);
  assert.match(rollback, /Current state differs from this import/);
  assert.match(rollback, /assertGrowthLocalDatabase\(process\.env\.DATABASE_URL\)/);
});
