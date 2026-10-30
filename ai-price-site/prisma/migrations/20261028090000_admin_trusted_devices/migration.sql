-- Additive: browsers that completed a successful admin login. Only a SHA-256 of the
-- random device token is stored; rows cascade with their admin user.
CREATE TABLE "admin_trusted_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_trusted_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_trusted_devices_token_hash_key" ON "admin_trusted_devices"("token_hash");
CREATE INDEX "admin_trusted_devices_user_id_last_used_at_idx" ON "admin_trusted_devices"("user_id", "last_used_at" DESC);
CREATE INDEX "admin_trusted_devices_expires_at_idx" ON "admin_trusted_devices"("expires_at");

ALTER TABLE "admin_trusted_devices" ADD CONSTRAINT "admin_trusted_devices_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
