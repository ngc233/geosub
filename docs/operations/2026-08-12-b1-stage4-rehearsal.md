# B1 stage 4 database migration rehearsal

Date: 2026-08-12

Result: failed closed. Production was not modified and B1 is not approved for
release.

## Scope and safety

- Used the verified B0 production backup in independently named temporary
  PostgreSQL databases.
- Ran the candidate B1 code from an isolated filesystem checkout.
- Refused production database names in both verification scripts.
- Did not run schema migrations, Prisma migrations or backfills against the
  production database.
- The shadow verifier hashes complete schema and data dumps before and after
  migration and accepts only identical hashes.

The first rehearsal exposed an environment precedence bug: values sourced from
`/etc/geosub/geosub.env` could override the explicitly supplied isolated
workspace and evidence directories. Both verifiers now preserve explicit
operator overrides. Results obtained before that correction are not counted as
B1 evidence.

The B1.1 rerun also corrected the migration classification before repeating the
rehearsal. Directus helper functions were removed from the canonical schema,
the article trash migration gained a structural compatibility check, and
`product_source_profiles` was restored to the canonical application baseline.
The production Directus container reports version `12.1.1`, while its Compose
configuration still references `directus/directus:latest`.

## Empty database result

The corrected isolated run passed:

- 53 canonical schema migrations applied.
- The first two overlapping Prisma migrations were guarded and baselined only
  after their required tables existed.
- The remaining 12 Prisma migrations applied.
- Migration audit passed with 53 schema and 14 Prisma migrations.
- A second full pass applied zero SQL migrations and Prisma reported no pending
  migrations.

This proves that the candidate toolchain can build a database and is
idempotent. It does not prove parity with production.

## Production-backup shadow result

The B1.1 isolated shadow run failed the required zero-change gate. It reported
53 schema migrations checked, 4 applied and 49 recognized through legacy or
structural compatibility.

The four attempted migrations were:

1. `sql/schema/049_event_rate_limits.sql`
2. `sql/schema/050_content_system_tables.sql`
3. `sql/schema/051_content_system_navigation_index.sql`
4. `sql/schema/053_product_source_profiles.sql`

Read-only production diagnostics confirm that all four represent real schema
differences:

- `event_rate_limits` is absent.
- `idx_article_relations_product` and `idx_redirects_source_path` are absent.
- `uniq_navigation_locale_position_href_label` is absent.
- `product_source_profiles` exists with the expected columns, checks and
  indexes, but `trg_product_source_profiles_updated_at` is absent.

`sql/schema/052_article_soft_delete_trash.sql` is now correctly recognized as
structurally compatible. No Directus label helper function remains in the
fresh schema, and production and the rebuilt database now both contain 65
public functions.

## Full schema comparison

The B1.1 normalized `pg_dump --schema-only` diff contained 3,550 lines and 115,133
bytes, so the required empty diff was not achieved.

Catalog-level facts:

| Object | Production | Rebuilt empty DB | Material difference |
| --- | ---: | ---: | --- |
| public tables | 91 | 59 | Production has 33 Directus tables; rebuilt DB has `event_rate_limits` |
| public views | 9 | 9 | Names match |
| public functions | 65 | 65 | Counts and names match |
| public indexes | 315 | 224 | Directus accounts for part; application index and constraint drift also remains |

Shared application tables also differ in defaults, foreign-key update actions,
ordinary indexes and constraints. Examples include `audit_logs.actor` versus
`actor_id`, localized `articles.author_name` defaults and constraints that are
present in the fresh SQL build but not in production. These are not formatting
noise and cannot be waived under the B1 acceptance criteria.

## Root causes

1. Directus owns system tables in the same `public` schema, but the GeoSub empty
   database toolchain does not bootstrap Directus.
2. The production Directus image is configured as `latest`, so an empty rebuild
   cannot reproduce its system schema without pinning and bootstrapping the
   observed `12.1.1` lifecycle.
3. The handwritten SQL baseline and Prisma baseline do not recreate identical
   defaults, constraints and indexes.
4. Four application-owned schema changes are genuinely absent from production:
   the rate-limit table, three content indexes and one profile update trigger.

## Required decision before further implementation

B1 cannot be completed by adding compatibility rows or weakening the verifier.
One schema ownership policy must be approved:

- Recommended: define Directus as an external schema owner, require an exact
  diff for GeoSub-owned objects, pin the observed Directus version, and treat
  the four genuinely undeployed application objects as explicit post-cutover
  migrations.
- Strict full-public-schema alternative: bootstrap the exact Directus version
  in the empty database and include its schema lifecycle in the release gate.

After that decision, rebuild both temporary databases from the same verified
backup and rerun all three B1 acceptance checks. Until all pass, do not merge or
deploy the B1 migration reorganization.

## B1.2 follow-up control plane

The recommended ownership policy was implemented locally after this rehearsal:

- `directus/directus` is pinned to `12.1.1`;
- `directus_*` objects are externally owned and receive a separate unchanged
  hash during shadow verification;
- the 49 production-baseline schema migrations remain the default path;
- schemas 049, 050, 051 and 053 require the explicit `post-cutover` mode;
- three historical B1 rehearsal registry names are accepted only with their
  recorded checksums;
- generated catalog migrations are immutable after application.

This removes the known control-plane causes of the failed rehearsal. It does
not retroactively turn the 2026-08-12 run into passing evidence. A new isolated
production-backup rehearsal is still mandatory before B1 release approval.
