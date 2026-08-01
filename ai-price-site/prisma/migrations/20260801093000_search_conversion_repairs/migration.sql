CREATE TABLE "search_conversion_repairs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query" TEXT NOT NULL,
    "normalized_query" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "target_key" VARCHAR(120) NOT NULL,
    "product_id" UUID,
    "plan_id" UUID,
    "blocker_code" VARCHAR(40) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    "action_href" TEXT NOT NULL,
    "note" TEXT,
    "baseline_result_clicks" INTEGER NOT NULL DEFAULT 0,
    "baseline_plan_engagements" INTEGER NOT NULL DEFAULT 0,
    "baseline_commercial_conversions" INTEGER NOT NULL DEFAULT 0,
    "baseline_window_days" INTEGER NOT NULL DEFAULT 30,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "evaluation_started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_conversion_repairs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "search_conversion_repairs_status_check"
      CHECK ("status" IN ('in_progress', 'resolved', 'ignored')),
    CONSTRAINT "search_conversion_repairs_blocker_code_check"
      CHECK ("blocker_code" IN (
        'missing_target',
        'missing_price',
        'missing_entry',
        'stale_price',
        'thin_plan_copy',
        'trust_gap',
        'ux_review'
      )),
    CONSTRAINT "search_conversion_repairs_baseline_window_days_check"
      CHECK ("baseline_window_days" IN (7, 30, 90)),
    CONSTRAINT "search_conversion_repairs_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "search_conversion_repairs_updated_by_id_fkey"
      FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "search_conversion_repairs_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "search_conversion_repairs_plan_id_fkey"
      FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "search_conversion_repairs_identity_key"
ON "search_conversion_repairs"(
  "normalized_query",
  "locale",
  "target_key",
  "blocker_code"
);

CREATE INDEX "search_conversion_repairs_status_updated_at_idx"
ON "search_conversion_repairs"("status", "updated_at" DESC);

CREATE INDEX "search_conversion_repairs_product_id_idx"
ON "search_conversion_repairs"("product_id");

CREATE INDEX "search_conversion_repairs_plan_id_idx"
ON "search_conversion_repairs"("plan_id");
