# B0 Database Restore Drill Evidence

Date: 2026-08-12 UTC

## Scope

- Generated a fresh backup from the production PostgreSQL database.
- Restored the backup into a new, isolated database named with the
  `geosub_restore_drill_` prefix.
- Ran read-only schema, constraint, view, function, and key-table count checks.
- Did not run migrations or modify production schemas or rows.
- Removed the temporary drill database, uploaded tools, and temporary SSH key
  after validation.

## Backup Evidence

- Backup file: `geosub_app_20260812T055240Z.dump`
- Backup directory: `/opt/geosub/backups`
- Retention: 14 days
- Dump checksum: verified before restore
- Dump catalog: verified before restore
- Key-table count snapshot: generated and verified during restore
- Off-host mirror: not configured

The fresh backup remains in the normal backup directory and is governed by the
14-day retention policy. The missing off-host mirror is an open resilience item;
it does not invalidate the local restore result, but B0 is not considered fully
redundant until an independent mirror is configured and monitored.

## Restore Evidence

- Temporary database: `geosub_restore_drill_20260812_055257`
- Restore result: passed
- Public tables: 91
- Validated foreign keys: 140
- Readable public views: 9
- Public functions: 65
- Key-table counts: matched the backup-time snapshot

## Cleanup Evidence

- Temporary drill database: removed and absence verified
- Temporary restore tools: removed
- Temporary SSH authorization: removed and absence verified
- Local temporary private keys: removed

## Gate Decision

B0 restore capability is accepted for the current production database. B1 may
proceed only through the reviewed migration path. Configuring and testing an
off-host backup mirror remains a follow-up operations requirement.
