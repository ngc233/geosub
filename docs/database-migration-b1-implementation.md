# GeoSub B1 database migration implementation

Status: implemented and locally verified on 2026-08-11.

## Result

The former handwritten SQL collection is now split by execution intent:

- `geosub-backend/sql/schema/`: 53 deterministic schema migrations.
- `geosub-backend/sql/backfill/`: 47 explicit data backfills.
- `geosub-backend/sql/backfill/retired/`: 11 retained historical or manual files.
- `geosub-backend/sql/migration-layout.json`: canonical IDs, legacy paths,
  checksums, split relationships and automatic-execution policy.

Normal local and production migration paths apply schema migrations and Prisma
migrations only. Backfills require an explicit command. Retired files cannot be
selected by an automatic migration mode.

## Compatibility

- Existing `geosub_schema_migrations` rows keep working through legacy-path and
  legacy-checksum aliases.
- The previous baseline cutoff remains recognized.
- Existing databases register canonical aliases without replaying historical
  data changes.
- A new database receives the handwritten schema first. The two overlapping
  initial Prisma migrations are then marked as an audited baseline only after
  their required tables exist; the remaining Prisma migrations run normally.
- Schema and backfill histories use separate registries, so an applied schema
  migration cannot accidentally mark its data backfill as complete.

## Commands

```text
npm run db:migrate             schema plus Prisma, safe default
npm run db:migrate:status      schema and Prisma audit
npm run db:backfill            explicit data backfills
npm run db:backfill:status     schema, Prisma and backfill audit
```

The Linux deployment helper mirrors the same contract:

```text
db-apply-sql.sh schema          normal deployment path
db-apply-sql.sh backfill        explicit operator action
db-apply-sql.sh all             explicit combined action
```

## Verification evidence

- Manifest validation: 53 schema, 47 backfill, 11 retired, 90 legacy SQL and
  14 Prisma migrations.
- Existing local database: migrated successfully using legacy compatibility;
  historical data backfills were not replayed.
- Empty temporary PostgreSQL database: all schema and Prisma migrations applied
  successfully.
- Idempotency: a second full migration pass applied zero schema and zero Prisma
  migrations.
- The temporary verification database was deleted after the test.
- ESLint passed.
- Node test suite passed: 325 tests, 0 failures.

## Explicit boundary

The final Directus metadata backfills require Directus to bootstrap its
`directus_*` system tables first. This prerequisite is documented and those
backfills remain outside the default migration and upgrade path. Their pending
state is visible in the backfill audit rather than being silently skipped or
automatically executed.
