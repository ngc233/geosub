# GeoSub B1 database migration implementation

Status: stages 1-3 implemented; stage 4 blocked by verified production schema
drift on 2026-08-12. B1 is not approved for release.

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
- Existing databases recognize compatible legacy rows without writing
  canonical alias rows or replaying historical data changes.
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
- Empty PostgreSQL database: all 53 schema migrations, the guarded two-migration
  Prisma baseline and the remaining 12 Prisma migrations completed.
- Empty-database idempotency: the second pass applied zero SQL migrations and
  Prisma reported no pending migrations.
- Production-backup shadow database: the B1.1 strict zero-change gate failed
  because four canonical schema migrations attempted to apply. Read-only
  diagnostics proved that these correspond to one absent table, three absent
  indexes and one absent update trigger. The gate did not accept or hide this
  result.
- Production versus rebuilt schema: the full schema diff is not empty. See
  `docs/operations/2026-08-12-b1-stage4-rehearsal.md`.
- Node test suite passed: 348 tests, 0 failures.

The previous statement that B1 was fully verified was based on local-only
checks. It is superseded by the production-backup evidence above.

## Explicit boundary

The final Directus metadata backfills require Directus to bootstrap its
`directus_*` system tables first. This prerequisite is documented and those
backfills remain outside the default migration and upgrade path. Their pending
state is visible in the backfill audit rather than being silently skipped or
automatically executed.

The production container currently reports Directus `12.1.1`, while the
Compose definition still uses `directus/directus:latest`. B1 remains blocked
until Directus ownership and version pinning are explicitly approved; the
verification tool must not synthesize or ignore third-party system tables.
