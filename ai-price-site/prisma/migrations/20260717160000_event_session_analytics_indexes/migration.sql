CREATE INDEX "event_logs_session_id_created_at_idx"
ON "event_logs"("session_id", "created_at");

CREATE INDEX "event_logs_anonymous_id_created_at_idx"
ON "event_logs"("anonymous_id", "created_at");
