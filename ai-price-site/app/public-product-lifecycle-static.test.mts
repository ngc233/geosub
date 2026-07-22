import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(appDir, "..", "..");

test("published prices align public product and plan lifecycle state", () => {
  const migration = readFileSync(
    resolve(repoDir, "geosub-backend", "sql", "066_public_product_lifecycle.sql"),
    "utf8",
  );
  const deploy = readFileSync(
    resolve(repoDir, "geosub-backend", "deploy", "linux-arm64", "db-apply-sql.sh"),
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
  assert.match(deploy, /sql\/066_public_product_lifecycle\.sql/);
  assert.match(postDeploy, /sql\/066_public_product_lifecycle\.sql/);
});

