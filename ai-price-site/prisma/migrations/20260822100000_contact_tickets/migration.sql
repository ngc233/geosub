CREATE TABLE "contact_tickets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category" VARCHAR(30) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'new',
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "organization" VARCHAR(160),
  "subject" VARCHAR(200) NOT NULL,
  "message" TEXT NOT NULL,
  "page_url" VARCHAR(1000),
  "source_path" VARCHAR(500),
  "rate_key_hash" CHAR(64) NOT NULL,
  "admin_note" TEXT,
  "replied_at" TIMESTAMPTZ(6),
  "closed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_tickets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_tickets_status_created_at_idx" ON "contact_tickets"("status", "created_at" DESC);
CREATE INDEX "contact_tickets_category_created_at_idx" ON "contact_tickets"("category", "created_at" DESC);
CREATE INDEX "contact_tickets_rate_key_hash_created_at_idx" ON "contact_tickets"("rate_key_hash", "created_at" DESC);
