import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  migrationEntriesForLegacyFile,
  readSqlMigration,
} from "../test-utils/sql-migrations.mts";

const appDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(appDir, "..", "..");

test("published prices align public product and plan lifecycle state", () => {
  const migration = readSqlMigration("sql/066_public_product_lifecycle.sql");
  const postDeploy = readFileSync(
    resolve(repoDir, "geosub-backend", "deploy", "linux-arm64", "post-deploy-check.sh"),
    "utf8",
  );

  assert.match(migration, /CREATE TRIGGER promote_public_product_from_region_price_trigger/);
  assert.match(migration, /NEW\.status = 'published'/);
  assert.match(migration, /status IN \('draft', 'review'\)/);
  assert.match(migration, /product\.category IN \('ai', 'streaming'\)/);
  assert.match(migration, /plan\.status = 'published'/);
  assert.doesNotMatch(migration, /status IN \('draft', 'review', 'archived'\)/);
  assert.equal(
    migrationEntriesForLegacyFile("sql/066_public_product_lifecycle.sql").length,
    2,
  );
  assert.match(postDeploy, /list schema/);
  assert.match(postDeploy, /products\.status = 'published'/);
  assert.match(postDeploy, /all published App Store products have published coverage/);
});
