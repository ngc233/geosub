# Duplicate index cleanup plan

## Current finding

Run this read-only audit from `ai-price-site`:

```text
npm run audit:indexes
```

The 2026-08-04 local audit inspected 259 indexes and found 35 exact duplicate
groups. No indexes were changed.

The duplicate pairs come from two schema authorities:

- `geosub-backend/schema.sql` creates legacy `idx_*` indexes.
- Prisma migrations create equivalent model-derived indexes.

Removing names without resolving that ownership would allow duplicates to return
on a new database or a future migration.

## Safe cleanup order

1. Take and verify the normal PostgreSQL backup.
2. Run `npm run audit:indexes -- --json` and retain the report with the release.
3. Confirm each candidate group has one valid and ready index that will remain.
4. Keep the Prisma model-derived index name where the Prisma schema owns the
   table. Keep the newest explicitly mapped index where Prisma does not own it.
5. Remove only the redundant legacy `idx_*` copy with one
   `DROP INDEX CONCURRENTLY IF EXISTS` statement at a time.
6. Run the audit again. The target is zero exact duplicate groups.
7. Run the admin dashboard, collection pipeline, article list, and event trend
   smoke checks before completing the release.

## Release boundary

Do not add the drop statements to an automatic production upgrade until the
single migration authority work is complete. That work must prevent
`schema.sql` and Prisma from creating the same index again.

If a cleanup needs to be rolled back, recreate the removed index from the
retained pre-cleanup JSON report. Index removal must never remove the final copy
of a unique, primary, partial, expression, or differently ordered index.
