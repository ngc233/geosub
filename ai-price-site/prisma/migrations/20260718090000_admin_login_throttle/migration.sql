CREATE TABLE "admin_login_attempts" (
    "key_hash" CHAR(64) NOT NULL,
    "scope" VARCHAR(20) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL,
    "blocked_until" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_attempts_pkey" PRIMARY KEY ("key_hash")
);

CREATE INDEX "admin_login_attempts_blocked_until_idx"
ON "admin_login_attempts"("blocked_until");

CREATE INDEX "admin_login_attempts_updated_at_idx"
ON "admin_login_attempts"("updated_at");
