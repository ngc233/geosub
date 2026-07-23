import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const upgrade = readFileSync(
  resolve(appDir, "..", "..", "geosub-backend", "deploy", "linux-arm64", "upgrade.sh"),
  "utf8",
);
const rollback = readFileSync(
  resolve(appDir, "..", "..", "geosub-backend", "deploy", "linux-arm64", "rollback.sh"),
  "utf8",
);
const postDeployCheck = readFileSync(
  resolve(
    appDir,
    "..",
    "..",
    "geosub-backend",
    "deploy",
    "linux-arm64",
    "post-deploy-check.sh",
  ),
  "utf8",
);
const localMigrationRunner = readFileSync(
  resolve(appDir, "..", "scripts", "apply-local-sql.cjs"),
  "utf8",
);
const migrationAudit = readFileSync(
  resolve(appDir, "..", "scripts", "check-migrations.cjs"),
  "utf8",
);
const releaseCheck = readFileSync(
  resolve(appDir, "..", "..", "scripts", "release-check.ps1"),
  "utf8",
);

test("ARM64 upgrades persist deployment evidence before changing runtime state", () => {
  assert.match(upgrade, /PREVIOUS_COMMIT="\$\(repo_commit\)"/);
  assert.match(upgrade, /ATTEMPT_FILE=/);
  assert.match(upgrade, /write_attempt_state "started"/);
  assert.match(upgrade, /GEOSUB_PREVIOUS_COMMIT/);
  assert.match(upgrade, /GEOSUB_TARGET_COMMIT/);
  assert.match(upgrade, /GEOSUB_BACKUP_PATH/);
});

test("ARM64 upgrade failures restart runtime and retain the verified backup", () => {
  assert.match(upgrade, /trap 'deployment_failed/);
  assert.match(upgrade, /sha256sum -c "\$BACKUP_PATH\.sha256"/);
  assert.match(upgrade, /write_attempt_state "failed"/);
  assert.match(upgrade, /start_runtime_services/);
  assert.match(upgrade, /best-effort basis/);
});

test("successful ARM64 upgrades record health-gated completion", () => {
  assert.match(upgrade, /CURRENT_STEP="product_logos"/);
  assert.match(upgrade, /npm run sync:logos/);
  assert.match(
    upgrade,
    /export NODE_ENV=production GEOSUB_LOGO_STORAGE_DIR='\$LOGO_STORAGE_DIR'/,
  );
  assert.match(
    postDeployCheck,
    /export NODE_ENV=production GEOSUB_LOGO_STORAGE_DIR='\$LOGO_STORAGE_DIR'/,
  );
  assert.match(upgrade, /CURRENT_STEP="post_deploy_health"/);
  assert.match(upgrade, /post-deploy-check\.sh/);
  assert.match(upgrade, /write_attempt_state "succeeded"/);
  assert.match(upgrade, /trap - ERR/);
  assert.match(upgrade, /sort -nr \| sed -n '1p' \| cut/);
  assert.match(postDeployCheck, /sort -nr \| sed -n '1p' \| cut/);
  assert.doesNotMatch(upgrade, /sort -nr \| head -n 1 \| cut/);
  assert.doesNotMatch(postDeployCheck, /sort -nr \| head -n 1 \| cut/);
});

test("rollback requires the exact deployment ID and trusted evidence", () => {
  assert.match(rollback, /--confirm DEPLOYMENT_ID/);
  assert.match(rollback, /CONFIRM_ID[\s\S]*GEOSUB_DEPLOYMENT_ID/);
  assert.match(rollback, /mode 0600/);
  assert.match(rollback, /sha256sum -c "\$GEOSUB_BACKUP_PATH\.sha256"/);
});

test("rollback restores recorded code without silently restoring the database", () => {
  assert.match(rollback, /checkout --detach/);
  assert.match(rollback, /npm run build/);
  assert.match(rollback, /post-deploy-check\.sh/);
  assert.match(rollback, /GEOSUB_ROLLBACK_DATABASE_RESTORED/);
  assert.match(rollback, /GEOSUB_BRANCH=detached-rollback/);
  assert.match(rollback, /RELEASE_DIR\/current\.env/);
  assert.doesNotMatch(rollback, /pg_restore/);
});

test("local migrations are immutable and the v2 registry is audited", () => {
  assert.match(localMigrationRunner, /Migration checksum changed after it was applied/);
  assert.doesNotMatch(localMigrationRunner, /ON CONFLICT[\s\S]*DO UPDATE/);
  assert.match(migrationAudit, /063_system_task_runs\.sql/);
  assert.match(migrationAudit, /068_plan_region_availability\.sql/);
  assert.match(migrationAudit, /069_required_catalog_products\.sql/);
  assert.match(migrationAudit, /070_disney_app_store_source\.sql/);
  assert.match(migrationAudit, /071_archive_superseded_app_store_ambiguities\.sql/);
  assert.match(migrationAudit, /checksum mismatch/);
  assert.match(migrationAudit, /not registered/);
});

test("release gate rejects tracked secrets and credential-bearing files", () => {
  assert.match(releaseCheck, /Test-RepositorySecrets/);
  assert.match(releaseCheck, /tracked secret-bearing filename/);
  assert.match(releaseCheck, /private-key header/);
  assert.match(releaseCheck, /database URL with embedded credentials/);
  assert.match(releaseCheck, /Repository secrets/);
});
