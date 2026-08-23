CREATE TABLE "country_consumer_benchmarks" (
    "id" BIGSERIAL NOT NULL,
    "benchmark_type" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "country_iso3" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "local_price" DECIMAL(14,4) NOT NULL,
    "price_usd" DECIMAL(14,4) NOT NULL,
    "observed_on" DATE NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "source_updated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_consumer_benchmarks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "country_consumer_benchmarks_positive_prices" CHECK ("local_price" > 0 AND "price_usd" > 0),
    CONSTRAINT "country_consumer_benchmarks_type_check" CHECK ("benchmark_type" IN ('BIG_MAC')),
    CONSTRAINT "country_consumer_benchmarks_unique" UNIQUE ("benchmark_type", "country_iso3", "observed_on")
);

CREATE INDEX "idx_country_consumer_benchmarks_latest"
ON "country_consumer_benchmarks" ("benchmark_type", "country_iso3", "observed_on" DESC);

CREATE OR REPLACE VIEW "latest_big_mac_prices" AS
SELECT
    "country_code",
    "country_iso3",
    "currency",
    "local_price",
    "price_usd",
    "observed_on",
    "source_name",
    "source_url",
    "license",
    "source_updated_at"
FROM (
    SELECT
        benchmark.*,
        ROW_NUMBER() OVER (
            PARTITION BY benchmark."country_iso3"
            ORDER BY benchmark."observed_on" DESC, benchmark."updated_at" DESC
        ) AS benchmark_rank
    FROM "country_consumer_benchmarks" benchmark
    WHERE benchmark."benchmark_type" = 'BIG_MAC'
) ranked
WHERE benchmark_rank = 1;

