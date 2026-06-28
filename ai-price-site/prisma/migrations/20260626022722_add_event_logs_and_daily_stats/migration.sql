-- CreateTable
CREATE TABLE "event_logs" (
    "id" UUID NOT NULL,
    "event_key" TEXT NOT NULL,
    "event_name" TEXT,
    "page_path" TEXT,
    "page_title" TEXT,
    "referrer" TEXT,
    "locale" TEXT DEFAULT 'zh',
    "session_id" TEXT,
    "anonymous_id" TEXT,
    "product_id" UUID,
    "plan_id" UUID,
    "country_id" UUID,
    "article_id" UUID,
    "button_key" TEXT,
    "placement" TEXT,
    "source" TEXT,
    "device_type" TEXT,
    "user_agent" TEXT,
    "ip_country" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stats" (
    "id" UUID NOT NULL,
    "stat_date" DATE NOT NULL,
    "metric_key" TEXT NOT NULL,
    "metric_value" INTEGER NOT NULL DEFAULT 0,
    "dimension_type" TEXT NOT NULL DEFAULT 'global',
    "dimension_key" TEXT NOT NULL DEFAULT 'global',
    "label" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_logs_event_key_created_at_idx" ON "event_logs"("event_key", "created_at");

-- CreateIndex
CREATE INDEX "event_logs_page_path_idx" ON "event_logs"("page_path");

-- CreateIndex
CREATE INDEX "event_logs_product_id_idx" ON "event_logs"("product_id");

-- CreateIndex
CREATE INDEX "event_logs_plan_id_idx" ON "event_logs"("plan_id");

-- CreateIndex
CREATE INDEX "event_logs_country_id_idx" ON "event_logs"("country_id");

-- CreateIndex
CREATE INDEX "event_logs_article_id_idx" ON "event_logs"("article_id");

-- CreateIndex
CREATE INDEX "event_logs_created_at_idx" ON "event_logs"("created_at");

-- CreateIndex
CREATE INDEX "daily_stats_stat_date_idx" ON "daily_stats"("stat_date");

-- CreateIndex
CREATE INDEX "daily_stats_metric_key_idx" ON "daily_stats"("metric_key");

-- CreateIndex
CREATE INDEX "daily_stats_dimension_type_dimension_key_idx" ON "daily_stats"("dimension_type", "dimension_key");

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_stat_date_metric_key_dimension_type_dimension_k_key" ON "daily_stats"("stat_date", "metric_key", "dimension_type", "dimension_key");
