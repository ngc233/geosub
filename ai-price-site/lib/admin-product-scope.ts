import "server-only";

import { Prisma } from "@prisma/client";
import {
  LEGACY_ACTIVATION_PREFLIGHT_RULES,
  LEGACY_AUTO_REVIEW_ERROR_PREFIX,
  LEGACY_OFFICIAL_WEB_PRODUCT_SLUGS,
} from "./admin-product-scope-policy";

export * from "./admin-product-scope-policy";

type ProductTableAlias = "product" | "p";
type CollectorJobTableAlias = "job" | "jobs";
type JobStatsTableAlias = "job_stats" | "supported";
type ScopeTableAlias = "pricing_scope" | "scope";
type RunTableAlias = "latest" | "run";

const PRODUCT_ALIAS_SQL: Record<ProductTableAlias, Prisma.Sql> = {
  product: Prisma.raw("product"),
  p: Prisma.raw("p"),
};

const JOB_ALIAS_SQL: Record<CollectorJobTableAlias, Prisma.Sql> = {
  job: Prisma.raw("job"),
  jobs: Prisma.raw("jobs"),
};

const STATS_ALIAS_SQL: Record<JobStatsTableAlias, Prisma.Sql> = {
  job_stats: Prisma.raw("job_stats"),
  supported: Prisma.raw("supported"),
};

const SCOPE_ALIAS_SQL: Record<ScopeTableAlias, Prisma.Sql> = {
  pricing_scope: Prisma.raw("pricing_scope"),
  scope: Prisma.raw("scope"),
};

const RUN_ALIAS_SQL: Record<RunTableAlias, Prisma.Sql> = {
  latest: Prisma.raw("latest"),
  run: Prisma.raw("run"),
};

const COUNT_COLUMN_SQL = {
  official_web_job_count: Prisma.raw("official_web_job_count"),
  official_web_count: Prisma.raw("official_web_count"),
  app_store_job_count: Prisma.raw("app_store_job_count"),
  app_store_count: Prisma.raw("app_store_count"),
} as const;

/**
 * Matches a pricing_page collector job that is eligible to represent a
 * product's canonical official-Web pricing scope via:
 * 1. Explicit collector job config (`job_config ->> 'billing_platform_scope' = 'web'`)
 * 2. Active `product_source_profiles` entry (`platform = 'web'`, `source_type = 'official_page'`)
 * 3. Centralized legacy pilot fallback for historical rows not yet backfilled
 */
export function officialWebEligibleJobSql(
  productAlias: ProductTableAlias,
  jobAlias: CollectorJobTableAlias,
): Prisma.Sql {
  const product = PRODUCT_ALIAS_SQL[productAlias];
  const job = JOB_ALIAS_SQL[jobAlias];
  const legacySlugs = Prisma.join(
    LEGACY_OFFICIAL_WEB_PRODUCT_SLUGS.map((slug) => Prisma.sql`${slug}`),
  );

  return Prisma.sql`(
    ${job}.job_config ->> 'collector_kind' = 'pricing_page'
    AND ${job}.job_config ->> 'official_web_source_key' = ${product}.slug
    AND (
      ${job}.job_config ->> 'billing_platform_scope' = 'web'
      OR EXISTS (
        SELECT 1
        FROM product_source_profiles profile
        WHERE profile.is_active = TRUE
          AND profile.platform = 'web'
          AND profile.source_type = 'official_page'
          AND (
            profile.product_id = ${product}.id
            OR profile.product_slug = ${product}.slug
          )
      )
      OR ${product}.slug IN (${legacySlugs})
    )
  )`;
}

/**
 * Resolves a product's canonical admin billing_platform scope (`web` vs `ios`).
 * Existing App Store products always keep `'ios'` while `app_store_* > 0`.
 */
export function webPricingScopeJoinSql({
  statsAlias,
  officialWebCountColumn,
  appStoreCountColumn,
  scopeAlias,
}: {
  statsAlias: JobStatsTableAlias;
  officialWebCountColumn: "official_web_job_count" | "official_web_count";
  appStoreCountColumn: "app_store_job_count" | "app_store_count";
  scopeAlias: ScopeTableAlias;
}): Prisma.Sql {
  const stats = STATS_ALIAS_SQL[statsAlias];
  const webCol = COUNT_COLUMN_SQL[officialWebCountColumn];
  const appStoreCol = COUNT_COLUMN_SQL[appStoreCountColumn];
  const scope = SCOPE_ALIAS_SQL[scopeAlias];

  return Prisma.sql`LEFT JOIN LATERAL (
    SELECT CASE
      WHEN COALESCE(${stats}.${webCol}, 0) > 0
        AND COALESCE(${stats}.${appStoreCol}, 0) = 0
      THEN 'web'
      ELSE 'ios'
    END AS billing_platform
  ) ${scope} ON TRUE`;
}

/**
 * Matches collector jobs that require an explicit activation preflight before
 * generic "run now" scheduling is allowed:
 * 1. Explicit `job_config ->> 'requires_activation_preflight' = 'true'`
 * 2. Active `product_source_profiles.config ->> 'requires_activation_preflight' = 'true'`
 * 3. Centralized legacy preflight rules
 */
export function activationPreflightConditionSql(
  productAlias: ProductTableAlias,
  jobAlias: CollectorJobTableAlias,
): Prisma.Sql {
  const product = PRODUCT_ALIAS_SQL[productAlias];
  const job = JOB_ALIAS_SQL[jobAlias];
  const legacyConditions = LEGACY_ACTIVATION_PREFLIGHT_RULES.map(
    (rule) =>
      Prisma.sql`(${product}.slug = ${rule.productSlug} AND ${job}.job_config ->> 'collector_kind' = ${rule.collectorKind})`,
  );

  return Prisma.sql`(
    COALESCE(${job}.job_config ->> 'requires_activation_preflight', 'false') = 'true'
    OR EXISTS (
      SELECT 1
      FROM product_source_profiles profile
      WHERE profile.is_active = TRUE
        AND COALESCE(profile.config ->> 'requires_activation_preflight', 'false') = 'true'
        AND (
          profile.product_id = ${product}.id
          OR profile.product_slug = ${product}.slug
        )
    )
    OR ${Prisma.join(legacyConditions, " OR ")}
  )`;
}

/**
 * Matches collector runs whose failure happened during automatic review rather
 * than price collection, prioritizing structured `failure_phase` / status fields
 * while preserving backwards compatibility with historical runs.
 */
export function isAutoReviewFailureSql(runAlias: RunTableAlias): Prisma.Sql {
  const run = RUN_ALIAS_SQL[runAlias];
  const legacyLikePattern = `${LEGACY_AUTO_REVIEW_ERROR_PREFIX}%`;

  return Prisma.sql`(
    ${run}.raw_payload ->> 'failure_phase' = 'auto_review'
    OR ${run}.raw_payload ->> 'failure_stage' = 'review'
    OR (
      ${run}.raw_payload ->> 'collector_status' = 'succeeded'
      AND ${run}.raw_payload ->> 'auto_review_status' = 'failed'
    )
    OR ${run}.error_message LIKE ${legacyLikePattern}
  )`;
}
