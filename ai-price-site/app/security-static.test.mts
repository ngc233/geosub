import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function readProjectFile(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("admin login has persistent throttling and no public default credentials", () => {
  const auth = readProjectFile("lib/admin-auth.ts");
  const action = readProjectFile("app/admin-login/actions.ts");
  const page = readProjectFile("app/admin-login/page.tsx");
  const seed = readProjectFile("prisma/seed.cjs");
  const schema = readProjectFile("prisma/schema.prisma");

  assert.match(auth, /LOGIN_WINDOW_MINUTES = 15/);
  assert.match(auth, /LOGIN_BLOCK_MINUTES = 30/);
  assert.match(auth, /MAX_ACTIVE_SESSIONS = 5/);
  assert.match(auth, /FROM admin_login_attempts/);
  assert.match(action, /getAdminLoginThrottle/);
  assert.match(action, /recordAdminLoginFailure/);
  assert.match(page, /error === "throttled"/);
  assert.doesNotMatch(page, /GeosubAdmin_2026!/);
  assert.doesNotMatch(page, /defaultValue="admin@geosub\.local"/);
  assert.match(seed, /GEOSUB_ADMIN_PASSWORD/);
  assert.doesNotMatch(seed, /GeosubAdmin_2026!/);
  assert.match(schema, /model AdminLoginAttempt/);
});

test("every admin mutation entry point rechecks authentication", () => {
  const actionFiles = [
    "app/admin/articles/actions.ts",
    "app/admin/collector-jobs/actions.ts",
    "app/admin/discovery/actions.ts",
    "app/admin/navigation/actions.ts",
    "app/admin/price-observations/actions.ts",
    "app/admin/products/actions.ts",
    "app/admin/review/actions.ts",
    "app/admin/settings/actions.ts",
  ];

  for (const file of actionFiles) {
    const source = readProjectFile(file);
    const exportedActions = source.match(/^export async function/gm)?.length || 0;
    const authChecks = source.match(/await requireAdmin\(\)/g)?.length || 0;

    assert.ok(exportedActions > 0, `${file} should export an admin action`);
    assert.equal(authChecks, exportedActions, `${file} must authenticate every action`);
  }
});

test("public event ingestion is bounded and accepts known analytics keys only", () => {
  const route = readProjectFile("app/api/events/route.ts");

  assert.match(route, /MAX_REQUEST_BYTES = 32 \* 1024/);
  assert.match(route, /MAX_METADATA_BYTES = 8 \* 1024/);
  assert.match(route, /ALLOWED_EVENT_KEYS/);
  assert.match(route, /Unsupported eventKey/);
  assert.match(route, /status: 413/);
});

test("global responses carry baseline production security headers", () => {
  const config = readProjectFile("next.config.ts");
  const proxy = readProjectFile("proxy.ts");
  const policy = readProjectFile("lib/content-security-policy.ts");
  const layout = readProjectFile("app/layout.tsx");

  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /Strict-Transport-Security/);
  assert.match(proxy, /Content-Security-Policy-Report-Only/);
  assert.match(proxy, /requestHeaders\.set\("x-nonce", nonce\)/);
  assert.match(proxy, /requestHeaders\.set\("Content-Security-Policy"/);
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.match(policy, /style-src 'self' 'unsafe-inline'/);
  assert.match(policy, /img-src 'self' data: blob: https:/);
  assert.match(policy, /connect-src 'self'/);
  assert.match(layout, /nonce=\{nonce\}/);
});

test("deployment installs verified backups and safe analytics retention", () => {
  const backup = readProjectFile("../geosub-backend/deploy/linux-arm64/db-backup.sh");
  const restore = readProjectFile("../geosub-backend/deploy/linux-arm64/db-restore.sh");
  const restoreDrill = readProjectFile(
    "../geosub-backend/deploy/linux-arm64/db-restore-drill.sh"
  );
  const restoreValidation = readProjectFile(
    "../geosub-backend/deploy/linux-arm64/db-restore-validate.sql"
  );
  const upgrade = readProjectFile("../geosub-backend/deploy/linux-arm64/upgrade.sh");
  const backupTimer = readProjectFile(
    "../geosub-backend/deploy/linux-arm64/systemd/geosub-db-backup.timer"
  );
  const retention = readProjectFile("scripts/prune-event-logs.cjs");
  const retentionTimer = readProjectFile(
    "../geosub-backend/deploy/linux-arm64/systemd/geosub-event-retention.timer"
  );

  assert.match(backup, /pg_restore --list/);
  assert.match(backup, /\.partial/);
  assert.match(backup, /GEOSUB_BACKUP_MIRROR_DIR/);
  assert.match(backup, /db-restore-counts\.sql/);
  assert.match(backup, /mirror_hash/);
  assert.match(backup, /-mmin \+"\$retention_minutes"/);
  assert.match(restore, /Checking backup catalog before destructive restore/);
  assert.match(restore, /actual_hash="\$\(sha256sum "\$BACKUP_FILE"/);
  assert.match(restoreDrill, /CREATE_RESTORE_DRILL_DATABASE/);
  assert.match(restoreDrill, /Refusing to use the production database/);
  assert.match(restoreDrill, /--exit-on-error/);
  assert.match(restoreDrill, /db-restore-validate\.sql/);
  assert.match(restoreDrill, /Backup-time count snapshot is missing or empty/);
  assert.match(restoreDrill, /expected_counts_hash/);
  assert.match(restoreDrill, /diff -u/);
  assert.match(restoreValidation, /BEGIN READ ONLY/);
  assert.match(restoreValidation, /Unvalidated foreign keys/);
  assert.match(restoreValidation, /pg_views/);
  assert.match(backupTimer, /OnCalendar=\*-\*-\* 02:40:00/);
  assert.match(retention, /Dry run only/);
  assert.match(retention, /generatedBy/);
  assert.match(retentionTimer, /OnCalendar=\*-\*-\* 04:30:00/);
  assert.match(upgrade, /npx prisma migrate deploy/);
  assert.match(upgrade, /geosub-db-backup\.timer/);
  assert.match(upgrade, /geosub-event-retention\.timer/);
});
