# Apple Music official Web automation

Feature / L3. User explicitly authorized automatic collection, review, publication and production deployment after verification on 2026-10-25. This supersedes the pending-only pilot scope for this source only.

## Scope and invariant

Reuse the existing Apple Music product, Individual / Family / Student monthly plans and paused job for US, BR, TR, JP, DE. Fetch bounded official HTML directly; validate exact final URL, HTML locale, canonical plan tile ID, localized heading, currency and explicit monthly amount. Exclude Apple One, FAQ and trial offers. New parser v2 evidence cannot reuse expired v1 pilot samples. No schema/migration changes, country additions, iOS changes, unrelated task changes or SEO promotion-list changes.

Reuse Spotify stability gates with Apple-specific allowlist and rule: three independent equal samples separated by at least 6 hours across at least 24 hours, latest within 48 hours and all within 7 days; changes above 30% require five samples across 72 hours. All three market plans must pass atomically. Non-USD requires current FX within two days and a published same-plan US Web baseline. Invalid evidence isolates the sequence; subsequent stable samples recover without manual approval, preserving last published prices.

## Deployment and acceptance

Focused parser/stability/security tests, real isolated PostgreSQL activation/publication/isolation/recovery and iOS/source invariants; standard release-check and full preflight, CI, production build, affected public/admin browser states. Website first extends product-bound cache invalidation and pipeline status; collector second. Verify both exact commits, database-input equality and runtime health. Before the separate idempotent production job-activation transaction, take and verify the standard database backup. Reuse the paused job ID, set active and 12-hour interval, retain unrelated config and old evidence (resolve old pending v1 as ignored only after its same plan/market has a verified v2 price), never synthesize production samples or approve old records. Verify a genuine scheduled collection and pending samples; verify published pages and reports after the natural stability window. Until then product remains review and no public-page completion is claimed.

## Recovery

If needed pause only the Apple Music task and retain evidence. Collector rollback uses the standard retained component. Website rollback uses the retained build; before rollback after first publication, keep Apple Music review if the old website cannot authorize its cache refresh. Never restore the whole database. Preserve all original failed operation receipts; unknown dispatch results require status lookup.
