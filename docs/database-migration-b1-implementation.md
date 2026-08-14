# GeoSub B1 database migration implementation

Status: stages 1-3 implemented. The B1.2 control plane now separates the
production baseline from post-cutover schema and treats Directus as an external
schema owner. A new production-backup shadow rehearsal is still required, so
B1 is not approved for release.

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

The 49 production-baseline schema migrations are the safe default. Four genuine
schema additions found during the 2026-08-12 rehearsal are retained in an
explicit `post-cutover` phase: schemas 049, 050, 051 and 053. They are not
applied by a normal B1 deployment. A fresh empty database uses
`complete-schema`; a later production rollout must invoke `post-cutover`
explicitly after its own backup and change approval.

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
db-apply-sql.sh complete-schema fresh-database schema, including deferred additions
db-apply-sql.sh post-cutover     explicit deferred schema rollout
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

Directus is now explicitly treated as the external owner of `directus_*`
objects and Compose is pinned to the observed `directus/directus:12.1.1` image.
The shadow verifier excludes Directus from the GeoSub-owned hash, then computes
a separate Directus hash and fails if either side changes. It does not synthesize
or ignore third-party system tables. The remaining release gate is a fresh
production-backup rehearsal with zero SQL applications, no pending Prisma
migrations and identical before/after hashes.
