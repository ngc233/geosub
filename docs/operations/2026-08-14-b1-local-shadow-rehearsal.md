# B1.2 local shadow rehearsal

Date: 2026-08-14

Result: passed for the local development database clone. This is not production
backup evidence and does not authorize a production migration.

## Controls exercised

- Created an isolated database named `geosub_b1_shadow_20260814_codex` from the
  local `geosub_app` database.
- Ran the production-safe `schema` phase through the real migration command.
- Confirmed 49 SQL migrations checked, 0 applied and 1 structurally compatible.
- Confirmed Prisma reported no pending migrations.
- Compared normalized GeoSub-owned schema, separately owned Directus schema and
  complete data hashes before and after migration.
- Deleted the temporary database after verification; retained local ignored
  evidence under `ai-price-site/logs/b1-shadow/`.

## Result

All three hashes were unchanged. The ownership policy was recorded as
`geosub_strict_directus_external`.

The rehearsal proves that the B1.2 control plane is zero-change against the
current local database. Before production release approval, repeat the same
gate against a fresh verified production-backup shadow database and retain the
server-side evidence.
