CREATE TABLE "operations_notification_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brief_fingerprint" TEXT NOT NULL,
    "brief_level" VARCHAR(20) NOT NULL,
    "delivery_status" VARCHAR(20) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "intervention_count" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "response_status" INTEGER,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_notification_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "operations_notification_deliveries_status_check"
      CHECK ("delivery_status" IN (
        'disabled',
        'no_action',
        'misconfigured',
        'suppressed',
        'sent',
        'failed'
      )),
    CONSTRAINT "operations_notification_deliveries_level_check"
      CHECK ("brief_level" IN ('critical', 'attention', 'progress', 'healthy')),
    CONSTRAINT "operations_notification_deliveries_count_check"
      CHECK ("intervention_count" >= 0)
);

CREATE INDEX "operations_notification_deliveries_created_idx"
ON "operations_notification_deliveries"("created_at" DESC);

CREATE INDEX "operations_notification_deliveries_fingerprint_idx"
ON "operations_notification_deliveries"("brief_fingerprint", "created_at" DESC);
