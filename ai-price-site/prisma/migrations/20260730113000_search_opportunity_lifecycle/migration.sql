CREATE TABLE "search_opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query" TEXT NOT NULL,
    "normalized_query" TEXT NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "note" TEXT,
    "linked_candidate_id" UUID,
    "linked_article_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_opportunities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "search_opportunities_status_check"
      CHECK ("status" IN ('open', 'in_progress', 'resolved', 'ignored')),
    CONSTRAINT "search_opportunities_kind_check"
      CHECK ("kind" IN ('product', 'plan', 'content')),
    CONSTRAINT "search_opportunities_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "search_opportunities_updated_by_id_fkey"
      FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "search_opportunities_linked_article_id_fkey"
      FOREIGN KEY ("linked_article_id") REFERENCES "articles"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "search_opportunities_normalized_query_key"
ON "search_opportunities"("normalized_query");

CREATE INDEX "search_opportunities_status_updated_at_idx"
ON "search_opportunities"("status", "updated_at" DESC);

CREATE INDEX "search_opportunities_linked_candidate_id_idx"
ON "search_opportunities"("linked_candidate_id");

CREATE INDEX "search_opportunities_linked_article_id_idx"
ON "search_opportunities"("linked_article_id");
