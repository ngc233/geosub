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
  const successGateMigration = readFileSync(
    resolve(
      repoDir,
      "geosub-backend",
      "sql",
      "schema",
      "054_successful_collection_publication_gate.sql",
    ),
    "utf8",
  );
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
  assert.match(
    successGateMigration,
    /CREATE TRIGGER promote_public_product_after_successful_collection_trigger/,
  );
  assert.match(successGateMigration, /NEW\.status = 'succeeded'/);
  assert.match(successGateMigration, /NEW\.collector_kind = 'app_store'/);
  assert.match(successGateMigration, /ON collector_job_runs/);
  assert.doesNotMatch(
    successGateMigration.match(
      /CREATE OR REPLACE FUNCTION promote_public_product_from_region_price\(\)[\s\S]*?\$\$;/,
    )?.[0] || "",
    /UPDATE products/,
  );
  assert.equal(
    migrationEntriesForLegacyFile("sql/066_public_product_lifecycle.sql").length,
    2,
  );
  assert.match(postDeploy, /entries schema/);
  assert.match(postDeploy, /products\.status = 'published'/);
  assert.match(postDeploy, /all published App Store products have published coverage/);
});
