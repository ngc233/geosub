#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const backendDir = path.resolve(__dirname, "..");

const coreFiles = [
  "schema.sql",
  "seed-chatgpt.sql",
  "sql/001_affordability_income_tables.sql",
  "sql/002_compute_plan_affordability.sql",
  "sql/003_affordability_views.sql",
  "sql/004_affordability_source_metadata_fix.sql",
  "sql/008_price_observations_view_v4.sql",
  "sql/009_price_observation_review_functions.sql",
  "sql/010_refresh_affordability_function.sql",
  "sql/011_price_observations_history_view.sql",
  "sql/012_exchange_rate_sync_system.sql",
  "sql/013_price_auto_review_rules.sql",
  "sql/014_product_discovery_candidates.sql",
  "sql/015_discovery_sources.sql",
  "sql/016_discovery_source_checks.sql",
  "sql/017_discovery_change_classification.sql",
  "sql/018_discovery_feed_trigger_fields.sql",
  "sql/019_discovery_source_strategy.sql",
  "sql/020_discovery_collection_handoff.sql",
  "sql/021_collector_job_runs.sql",
  "sql/022_discovery_manual_scan_queue.sql",
  "sql/023_app_store_stability_auto_review.sql",
  "sql/024_app_store_availability_status.sql",
  "sql/025_archive_non_subscription_plans.sql",
  "sql/026_clear_legacy_multisource_review_notes.sql",
  "sql/027_archive_capacity_only_app_store_items.sql",
  "sql/028_country_tax_profiles.sql",
  "sql/029_country_app_store_risk_profiles.sql",
  "sql/030_country_app_store_risk_model.sql",
  "sql/031_app_store_country_coverage.sql",
  "sql/032_country_tax_profile_v2.sql",
  "sql/033_app_store_stability_auto_review_v2.sql",
  "sql/034_affordability_metric_precision.sql",
  "sql/035_country_tax_profile_sync_system.sql",
  "sql/036_product_plan_specs_seed.sql",
  "sql/037_inferred_app_store_tax_profiles.sql",
  "sql/038_common_app_store_tax_profiles.sql",
  "sql/039_relax_claude_max_app_store_range.sql",
  "sql/040_gemini_app_store_collector.sql",
  "sql/041_merge_gemini_advanced_into_pro.sql",
  "sql/042_price_observation_evidence_view.sql",
  "sql/043_app_store_collection_schedule_policy.sql",
  "sql/052_collector_job_runs_running_status.sql",
  "sql/053_admin_collection_performance.sql",
  "sql/054_refresh_affordability_app_store_scope.sql",
  "sql/055_refresh_matching_app_store_prices.sql",
  "sql/056_refresh_exact_local_app_store_prices.sql",
  "sql/057_quarantine_published_app_store_price_outliers.sql",
  "sql/058_normalize_disney_app_store_plans.sql",
  "sql/059_stale_app_store_price_lifecycle.sql",
  "sql/060_reclassify_app_store_selection_false_positives.sql",
  "sql/061_ignore_legacy_non_primary_app_store_tiers.sql",
  "sql/062_app_store_coverage_gap_rechecks.sql",
  "sql/063_system_task_runs.sql",
  "sql/064_data_quality_repair_cycles.sql",
  "sql/065_operational_self_healing.sql",
  "sql/066_public_product_lifecycle.sql",
  "sql/067_app_store_availability_semantics.sql",
  "sql/068_plan_region_availability.sql",
  "sql/069_required_catalog_products.sql",
  "sql/070_disney_app_store_source.sql",
  "sql/071_archive_superseded_app_store_ambiguities.sql",
  "sql/072_normalize_hbo_max_app_store_plans.sql",
  "sql/073_product_seo_content_quality.sql",
  "sql/074_repair_hbo_max_app_store_selection.sql",
  "sql/075_serialize_app_store_auto_review.sql",
  "sql/076_event_rate_limits.sql",
];

// Databases created before the migration registry was introduced already have
// these migrations applied. They may be registered as a verified baseline, but
// must never be replayed merely because their historical rows are absent.
const baselineCutoverFile = "sql/063_system_task_runs.sql";
const legacyBaselineFiles = coreFiles.slice(0, coreFiles.indexOf(baselineCutoverFile));

const contentFiles = [
  "content-system-tables.sql",
  "content-system-directus.sql",
  "register-directus.sql",
  "directus-zh.sql",
  "directus-cn-v2.sql",
  "directus-polish.sql",
  "fix_nav_categories_utf8.sql",
  "seed_footer_navigation_zh.sql",
  "seed_en_navigation_draft.sql",
  "publish_en_navigation.sql",
  "publish_footer_trust_pages.sql",
  "sql/045_article_soft_delete_trash.sql",
];

const retiredFiles = new Map([
  ["cleanup-duplicates.sql", "Manual repair script; never part of automatic deployments."],
  ["sql/004_affordability_source_metadata.sql", "Superseded by sql/004_affordability_source_metadata_fix.sql."],
  ["sql/006_price_observation_tables.sql", "Superseded by the current schema.sql observation model."],
  ["sql/007_fix_pending_price_observations_view.sql", "Superseded by the current v4 observation view."],
  ["sql/007_fix_pending_price_observations_view_v3.sql", "Superseded by sql/008_price_observations_view_v4.sql."],
  ["sql/044_public_navigation_launch_scope.sql", "Legacy launch content migration retained for history only."],
  ["sql/046_update_chatgpt_logo_to_app_store_artwork.sql", "Superseded by persistent official logo synchronization."],
  ["sql/047_sync_official_app_store_logos.sql", "Superseded by persistent official logo synchronization."],
  ["sql/048_fix_chatgpt_plus_korea_app_store_outlier.sql", "Superseded by generic anomaly quarantine and automatic review rules."],
  ["sql/049_quarantine_app_store_anomaly_promotions.sql", "Superseded by current published outlier quarantine rules."],
  ["sql/050_cleanup_app_store_plan_matching_artifacts.sql", "Superseded by current plan matching and legacy-tier cleanup rules."],
]);

const prismaMigrations = [
  "20260625094628_init_geosub_admin",
  "20260626022722_add_event_logs_and_daily_stats",
  "20260706093000_admin_review_performance",
  "20260706103000_review_history_indexes",
  "20260707120000_admin_asset_performance",
  "20260708080000_admin_collection_performance",
  "20260717160000_event_session_analytics_indexes",
  "20260718090000_admin_login_throttle",
  "20260730113000_search_opportunity_lifecycle",
  "20260730143000_search_opportunity_effect_window",
  "20260730170000_controlled_search_aliases",
  "20260801093000_search_conversion_repairs",
  "20260801143000_authority_coverage_tasks",
  "20260801183000_operations_notification_deliveries",
];

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function sqlInventory() {
  const rootFiles = fs
    .readdirSync(backendDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name);
  const numberedFiles = fs
    .readdirSync(path.join(backendDir, "sql"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => `sql/${entry.name}`);

  return [...rootFiles, ...numberedFiles].sort();
}

function prismaInventory(frontendDir) {
  const migrationsDir = path.join(frontendDir, "prisma", "migrations");
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function validateManifest({ frontendDir } = {}) {
  if (!coreFiles.includes(baselineCutoverFile) || legacyBaselineFiles.length === 0) {
    throw new Error("Migration manifest has an invalid legacy baseline boundary.");
  }
  if (
    legacyBaselineFiles.some(
      (file, index) => file !== coreFiles[index] || file === baselineCutoverFile,
    )
  ) {
    throw new Error("Legacy baseline migrations must be a contiguous core prefix.");
  }

  const activeFiles = [...coreFiles, ...contentFiles];
  const allFiles = [...activeFiles, ...retiredFiles.keys()];
  const duplicates = allFiles.filter((file, index) => allFiles.indexOf(file) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Migration manifest contains duplicates: ${[...new Set(duplicates)].join(", ")}`);
  }

  for (const file of allFiles) {
    if (path.isAbsolute(file) || normalizePath(file).startsWith("../")) {
      throw new Error(`Migration manifest contains an unsafe path: ${file}`);
    }
    if (!fs.existsSync(path.join(backendDir, ...file.split("/")))) {
      throw new Error(`Migration manifest references a missing file: ${file}`);
    }
  }

  const inventory = sqlInventory();
  const unclassified = inventory.filter((file) => !allFiles.includes(file));
  const missingFromDisk = allFiles.filter((file) => !inventory.includes(file));
  if (unclassified.length > 0 || missingFromDisk.length > 0) {
    throw new Error(
      [
        unclassified.length > 0
          ? `Unclassified SQL migrations: ${unclassified.join(", ")}`
          : null,
        missingFromDisk.length > 0
          ? `Manifest SQL files missing from inventory: ${missingFromDisk.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const prismaDuplicates = prismaMigrations.filter(
    (migration, index) => prismaMigrations.indexOf(migration) !== index,
  );
  if (prismaDuplicates.length > 0) {
    throw new Error(
      `Prisma migration manifest contains duplicates: ${[...new Set(prismaDuplicates)].join(", ")}`,
    );
  }

  if (frontendDir) {
    const actualPrismaMigrations = prismaInventory(frontendDir);
    const unregisteredPrisma = actualPrismaMigrations.filter(
      (migration) => !prismaMigrations.includes(migration),
    );
    const missingPrisma = prismaMigrations.filter(
      (migration) => !actualPrismaMigrations.includes(migration),
    );
    if (unregisteredPrisma.length > 0 || missingPrisma.length > 0) {
      throw new Error(
        [
          unregisteredPrisma.length > 0
            ? `Unregistered Prisma migrations: ${unregisteredPrisma.join(", ")}`
            : null,
          missingPrisma.length > 0
            ? `Manifest Prisma migrations missing from disk: ${missingPrisma.join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    for (const migration of prismaMigrations) {
      const migrationFile = path.join(
        frontendDir,
        "prisma",
        "migrations",
        migration,
        "migration.sql",
      );
      if (!fs.existsSync(migrationFile)) {
        throw new Error(`Prisma migration is missing migration.sql: ${migration}`);
      }
    }
  }

  return {
    baseline: legacyBaselineFiles.length,
    core: coreFiles.length,
    content: contentFiles.length,
    retired: retiredFiles.size,
    prisma: prismaMigrations.length,
  };
}

function filesForMode(mode) {
  if (mode === "baseline") return [...legacyBaselineFiles];
  if (mode === "core") return [...coreFiles];
  if (mode === "content") return [...contentFiles];
  if (mode === "all") return [...coreFiles, ...contentFiles];
  if (mode === "prisma") return [...prismaMigrations];
  throw new Error("Migration mode must be baseline, core, content, all or prisma.");
}

function runCli() {
  const command = process.argv[2] || "validate";
  const value = process.argv[3];
  const frontendDirArg = process.argv.find((argument) => argument.startsWith("--frontend-dir="));
  const frontendDir = frontendDirArg
    ? path.resolve(frontendDirArg.slice("--frontend-dir=".length))
    : undefined;

  if (command === "list") {
    validateManifest({ frontendDir });
    process.stdout.write(`${filesForMode(value || "core").join("\n")}\n`);
    return;
  }

  if (command === "validate") {
    const summary = validateManifest({ frontendDir });
    console.log(
      `Migration manifest valid: baseline=${summary.baseline} core=${summary.core} content=${summary.content} retired=${summary.retired} prisma=${summary.prisma}`,
    );
    return;
  }

  throw new Error("Usage: migration-manifest.cjs [validate|list MODE] [--frontend-dir=PATH]");
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = {
  backendDir,
  baselineCutoverFile,
  contentFiles,
  coreFiles,
  filesForMode,
  legacyBaselineFiles,
  prismaMigrations,
  retiredFiles,
  validateManifest,
};
