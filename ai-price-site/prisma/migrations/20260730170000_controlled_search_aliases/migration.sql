CREATE TABLE "search_aliases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alias" TEXT NOT NULL,
    "normalized_alias" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "target_kind" VARCHAR(20) NOT NULL,
    "product_id" UUID,
    "plan_id" UUID,
    "target_title" TEXT NOT NULL,
    "target_href" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "evidence_click_count" INTEGER NOT NULL DEFAULT 0,
    "evidence_visitor_count" INTEGER NOT NULL DEFAULT 0,
    "last_clicked_at" TIMESTAMPTZ(6),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_aliases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "search_aliases_status_check"
      CHECK ("status" IN ('active', 'disabled')),
    CONSTRAINT "search_aliases_target_kind_check"
      CHECK ("target_kind" IN ('product', 'plan')),
    CONSTRAINT "search_aliases_target_check"
      CHECK (
        ("target_kind" = 'product' AND "product_id" IS NOT NULL AND "plan_id" IS NULL)
        OR
        ("target_kind" = 'plan' AND "plan_id" IS NOT NULL)
      ),
    CONSTRAINT "search_aliases_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "search_aliases_plan_id_fkey"
      FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "search_aliases_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "search_aliases_updated_by_id_fkey"
      FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "search_aliases_normalized_alias_locale_key"
ON "search_aliases"("normalized_alias", "locale");

CREATE INDEX "search_aliases_status_locale_idx"
ON "search_aliases"("status", "locale");

CREATE INDEX "search_aliases_product_id_idx"
ON "search_aliases"("product_id");

CREATE INDEX "search_aliases_plan_id_idx"
ON "search_aliases"("plan_id");
