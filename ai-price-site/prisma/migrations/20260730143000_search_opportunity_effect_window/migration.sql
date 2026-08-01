ALTER TABLE "search_opportunities"
ADD COLUMN "evaluation_started_at" TIMESTAMPTZ(6);

CREATE INDEX "search_opportunities_evaluation_started_at_idx"
ON "search_opportunities"("evaluation_started_at");
