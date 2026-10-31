# GeoSub 2.23.1 — frontend price evidence corrections

Local website candidate on release/frontend-trust-2.23.1, based on the exact
main/production 2.23.0 commit 1af0d95f3eb52886b178cc90ed20b425d85f18c8.
The main tree equals the previously verified 092aefe tree. The signed main
commit was obtained through the connected GitHub API and imported only after
its complete Git object hash matched the original SHA. Ordinary Git HTTPS
fetch did not complete; this is not recorded as a successful network fetch.

## User-visible changes

- Group representative prices by actual billing period, without converting
  weekly or annual charges into purchasable monthly offers.
- Share current/legacy-only plan selection between overview and search.
- Read the existing 120-day observation window using a read-only repeatable
  snapshot and 5,000-row keyset pages, capped explicitly at 50,000 rows.
- Show raw observation coverage and honest incomplete/unavailable states.
- Collapse empty Big Mac references on non-frozen pages; preserve the active
  Chinese Plus experiment's existing renderer output.

The collector is not part of this rollout. SQL/Prisma inputs, data sources,
review thresholds, sync jobs, URLs, robots, sitemap budgets and SEO experiment
locks are unchanged. No production mutations have been performed.

## Verification

See frontend-trust-2026-10-31.md for 357,021-row restored-snapshot findings,
query measurements, 36 snapshot compatibility comparisons and actual-page
desktop/mobile light/dark acceptance. Those findings apply to the equivalent
source tree, not to current production data freshness.

The standard release check and exact PostgreSQL rollback replay passed. Full
data gates were executed and remain blocked for the reasons recorded below. A synthetic CI fixture is not used as
evidence that every active production product meets its data gates.

## Exact rollback

The retained target is the 2.23.0 commit above. Of the 28 contract files, only
VERSION and PricingDetailPage differ. Removing the isolated price-position
function and its frozen-page option yields byte-identical renderer skeletons;
the managed editorial reader path, validators, store and schemas are unchanged.
The exact forward fingerprint is
2f1e0ffdc9d0cd88b9e0dd8f0e35a414f1cd318d2a99d12f4ab419609d84f1c2,
and retained fingerprint is
3b3e2b8724b63e36f792df6b945559eb9faeb3f962528ffbd208a551f510fd11.
The new production pair permits only overview:en:chatgpt with facts:false.
Existing exact older-reader fixture scopes are carried forward without adding
targets or admitting facts. Unknown, reversed and changed contracts stay closed.
Use standard rolling rollback to the retained 2.23.0 website; no database restore
or collector rollback belongs to this change.

## Pending external work

This document does not authorize push, a PR, deployment, production SQL or an
IndexNow submission. After local readiness is recorded, obtain explicit push
and deployment authorization, verify candidate remote CI, verify current data
gates and the actual retained website, then use the standard geosub_ops entry.
No migrated data or missing historical period identities may be fabricated to
turn a restored-data gate green.

## Recorded local readiness result

- Standard scripts/release-check.ps1 against origin/main: PASSED (97 seconds).
  This includes synchronized/incremented versions, script syntax, hygiene and
  secrets, migration manifest, both dependency audits, SEO/content checks,
  typecheck, lint, 1,018 frontend tests, production build and rolling safety.
- Content-store integration PASSED, including 51 content release scenarios and
  the existing exact retained-reader fixtures. Transactions/history remained
  isolated; production was not accessed.
- Exact 2.23.1 -> 2.23.0 PostgreSQL rollback replay PASSED with a read-only reader,
  actual advisory lock, unchanged test revisions, and unknown/reverse/changed
  contracts rejected. This is local verification, not a production rollback.
- The standard public observation completed with 3 samples, 0 failures. The
  previously recorded production receipt identifies 2.23.0 / 1af0d95; current
  observation confirms public health, not a new authenticated release receipt.

Full preflight: NOT PASSED. The isolated CI fixture has ChatGPT only, so the
unscoped catalogue gate reports 37 absent active products. The restored real
snapshot stops earlier at sql/schema/059_audit_actor_compatibility.sql checksum
mismatch. The exact 2.23.0 baseline fails identically against that snapshot;
the candidate's SQL and Prisma migration bytes are unchanged. Neither migration
records nor schema/data were modified to suppress this mismatch. Current
production migration and freshness gates must be checked before deployment.

Disposition: ready for review and remote CI after push authorization; NOT yet
approved or fully verified for production deployment. Push/CI does not authorize
repairing the restored database, bypassing release gates or deploying the site.

Local evidence: frontend-trust-release/checks.json, formal-release-check.log,
current-reader-rollback.json, preflight-restored.log and baseline-comparison.json
under the task output directory. Existing local data and unrelated worktrees
remain intact. The release test container is disposable and will be removed.
