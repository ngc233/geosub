import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(appDir, "..");
const repoDir = resolve(frontendDir, "..");
const require = createRequire(import.meta.url);
const manifest = require(resolve(
  repoDir,
  "geosub-backend",
  "scripts",
  "migration-manifest.cjs",
));
const productionRunner = readFileSync(
  resolve(repoDir, "geosub-backend", "deploy", "linux-arm64", "db-apply-sql.sh"),
  "utf8",
);
const postDeployCheck = readFileSync(
  resolve(repoDir, "geosub-backend", "deploy", "linux-arm64", "post-deploy-check.sh"),
  "utf8",
);
const localRunner = readFileSync(
  resolve(frontendDir, "scripts", "migrate-database.cjs"),
  "utf8",
);
const migrationAudit = readFileSync(
  resolve(frontendDir, "scripts", "check-migrations.cjs"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(frontendDir, "package.json"), "utf8"),
) as { scripts: Record<string, string> };

test("one migration manifest classifies every SQL and Prisma migration", () => {
  const summary = manifest.validateManifest({ frontendDir });
  assert.equal(summary.core, manifest.coreFiles.length);
  assert.equal(summary.baseline, manifest.legacyBaselineFiles.length);
  assert.equal(summary.content, manifest.contentFiles.length);
  assert.equal(summary.retired, manifest.retiredFiles.size);
  assert.equal(summary.prisma, manifest.prismaMigrations.length);
  assert.ok(summary.core > 60);
  assert.equal(manifest.baselineCutoverFile, "sql/063_system_task_runs.sql");
  assert.ok(manifest.legacyBaselineFiles.includes("sql/062_app_store_coverage_gap_rechecks.sql"));
  assert.ok(!manifest.legacyBaselineFiles.includes(manifest.baselineCutoverFile));
  assert.equal(summary.prisma, 14);
});

test("local and production SQL runners consume the canonical manifest", () => {
  assert.match(productionRunner, /migration-manifest\.cjs/);
  assert.match(productionRunner, /list "\$MODE"/);
  assert.match(productionRunner, /list baseline/);
  assert.match(productionRunner, /baseline_legacy_migrations/);
  assert.match(productionRunner, /queue_app_store_coverage_gap_rechecks/);
  assert.doesNotMatch(productionRunner, /core_files=\(/);
  assert.match(localRunner, /apply-local-sql\.cjs/);
  assert.match(localRunner, /prisma\/build\/index\.js/);
  assert.match(localRunner, /prismaCli, "migrate", "deploy"/);
  assert.equal(packageJson.scripts["db:migrate"], "node scripts/migrate-database.cjs");
});

test("migration audits cover both registries and run during release checks", () => {
  assert.match(migrationAudit, /geosub_schema_migrations/);
  assert.match(migrationAudit, /_prisma_migrations/);
  assert.match(migrationAudit, /legacyBaselineFiles/);
  assert.match(postDeployCheck, /list core/);
  assert.match(postDeployCheck, /list prisma/);
  assert.match(postDeployCheck, /check_prisma_migration/);
  assert.match(packageJson.scripts["preflight:full"], /check:migration-manifest/);
});
