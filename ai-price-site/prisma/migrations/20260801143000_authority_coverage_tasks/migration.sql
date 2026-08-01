CREATE TABLE "authority_coverage_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "gap_code" VARCHAR(40) NOT NULL,
    "action_kind" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    "action_href" TEXT NOT NULL,
    "note" TEXT,
    "baseline_price_count" INTEGER NOT NULL DEFAULT 0,
    "baseline_stale_price_count" INTEGER NOT NULL DEFAULT 0,
    "baseline_country_count" INTEGER NOT NULL DEFAULT 0,
    "baseline_tax_gap_count" INTEGER NOT NULL DEFAULT 0,
    "baseline_seo_locale_count" INTEGER NOT NULL DEFAULT 0,
    "baseline_decision_score" INTEGER NOT NULL DEFAULT 0,
    "baseline_quality_score" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "evaluation_started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authority_coverage_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "authority_coverage_tasks_status_check"
      CHECK ("status" IN ('in_progress', 'resolved', 'ignored')),
    CONSTRAINT "authority_coverage_tasks_gap_code_check"
      CHECK ("gap_code" IN (
        'missing_price',
        'stale_price',
        'tax_gap',
        'region_gap',
        'seo_gap',
        'decision_gap'
      )),
    CONSTRAINT "authority_coverage_tasks_action_kind_check"
      CHECK ("action_kind" IN ('collect', 'review_data', 'edit_content')),
    CONSTRAINT "authority_coverage_tasks_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "authority_coverage_tasks_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "authority_coverage_tasks_updated_by_id_fkey"
      FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "authority_coverage_tasks_product_gap_key"
ON "authority_coverage_tasks"("product_id", "gap_code");

CREATE INDEX "authority_coverage_tasks_status_updated_at_idx"
ON "authority_coverage_tasks"("status", "updated_at" DESC);

CREATE INDEX "authority_coverage_tasks_product_id_idx"
ON "authority_coverage_tasks"("product_id");
