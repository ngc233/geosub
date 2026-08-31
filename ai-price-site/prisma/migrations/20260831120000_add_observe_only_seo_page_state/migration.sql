CREATE TABLE "seo_page_states" (
    "id" UUID NOT NULL,
    "locale" "locale" NOT NULL,
    "page_type" TEXT NOT NULL,
    "canonical_path" TEXT NOT NULL,
    "product_id" UUID,
    "product_slug" TEXT,
    "plan_id" UUID,
    "plan_slug" TEXT,
    "eligibility_state" TEXT NOT NULL,
    "indexing_decision" TEXT NOT NULL,
    "decision_source" TEXT NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT,
    "policy_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seo_page_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seo_page_state_history" (
    "id" UUID NOT NULL,
    "seo_page_state_id" UUID NOT NULL,
    "locale" "locale" NOT NULL,
    "page_type" TEXT NOT NULL,
    "canonical_path" TEXT NOT NULL,
    "final_robots_index" BOOLEAN NOT NULL,
    "final_robots_follow" BOOLEAN NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "quality_score" INTEGER,
    "quality_status" TEXT,
    "sitemap_included" BOOLEAN NOT NULL,
    "indexing_decision" TEXT NOT NULL,
    "trigger_source" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "experiment_lock_id" TEXT,
    "experiment_locked" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_page_state_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seo_page_states_canonical_path_key"
ON "seo_page_states"("canonical_path");

CREATE INDEX "seo_page_states_decision_idx"
ON "seo_page_states"("locale", "page_type", "indexing_decision");

CREATE INDEX "seo_page_states_product_plan_idx"
ON "seo_page_states"("product_id", "plan_id");

CREATE INDEX "seo_page_state_history_state_recorded_idx"
ON "seo_page_state_history"("seo_page_state_id", "recorded_at" DESC);

CREATE INDEX "seo_page_state_history_path_recorded_idx"
ON "seo_page_state_history"("canonical_path", "recorded_at" DESC);

ALTER TABLE "seo_page_states"
ADD CONSTRAINT "seo_page_states_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "seo_page_states"
ADD CONSTRAINT "seo_page_states_plan_id_fkey"
FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "seo_page_state_history"
ADD CONSTRAINT "seo_page_state_history_seo_page_state_id_fkey"
FOREIGN KEY ("seo_page_state_id") REFERENCES "seo_page_states"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
