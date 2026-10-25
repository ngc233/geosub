# Price evidence, change records and country hubs

Type: Feature / L2. The separately requested 39/49 mismatch is Bug / L1.

## Approved problem and scope

The user approved original snapshots, price-change records, priority country aggregation and correction of the 39/49 country count. Reuse existing `price_observations` and its stored App Store `raw_snapshot.inAppPurchases`; no migration, backfill, review-policy change, production write, push or deployment is part of this local task.

First release: Chinese and English country hubs for Turkey, India, Philippines and Japan; App Store monthly published, verified, fresh prices only. Compare each plan against its own US price, never another tier. Show all eligible plans, but do not call a multi-plan list a national price index. Missing US comparisons remain unknown. No automatic sitemap promotion; new routes are noindex/follow pending quality acceptance.

Original-record pages expose an allowlisted projection of approved observations, not raw payloads, administrative notes, credentials or stored HTML. Preserve source, timestamp, observed plan identity, item names and price text. Missing snapshots remain unavailable. Future App Store observations capture billing-cycle identity explicitly; older observations without period identity can still be cited as observations, but cannot substantiate a same-plan price-change claim.

Change records compare local amounts only within an identical product, plan, country, source, currency, period, platform and list-price identity. Approved, non-anomalous evidence only; interruptions and identity uncertainty break the comparison sequence. Retried samples are not independent history. Exchange-rate-only movement is never called a price rise/fall. Every event links to both observations. No invented history or purchase-success claims.

The existing reviewer marks routine same-price reads `ignored/superseded_by_published_price`. Such a record can preserve continuity of an already-approved identical baseline when source, currency, captured period and identity agree. It cannot create a new baseline, support a different price, or become a public snapshot. Other ignored/pending/anomalous records still break the sequence.

## Invariants and experiment exception

Preserve existing default App Store scope, automatic review rules, currencies, tax policy, route identities, SEO promotion lists, active experiment metadata and existing product content. The user's explicit 39/49 bug request authorizes only making the price-position chart consume the same default-platform rows as its table; it does not settle or unlock the Chinese Plus experiment. Keep new product-page links off that frozen page. Snapshot access is added to existing evidence on other pages; frozen Plus records remain accessible from country/history pages.

## Acceptance

- Mixed 39 iOS + 10 Web fixtures yield 39 in the chart; original experiment inputs and metadata remain unchanged.
- Stored snapshots retain duplicate names and original price text; no fabricated exclusions or billing cycles.
- Same-price/FX-only samples produce no price-change event; currency, source, billing identity, review gaps and anomalies cannot create false events.
- Four country hubs link to exact plans, expose dates and scope, filter out stale/pending/estimated/non-monthly/non-iOS rows, and render honest empty/error states.
- Typecheck, lint, relevant automated tests, production build, SEO checks and desktop/mobile light/dark UI verification. Tests use isolated local PostgreSQL only; no production credentials or data mutation.

## Rollback and observation

Changes are additive and reuse the schema. Revert feature commits to remove routes/UI; retained observations remain intact. Newly added snapshot identity fields are ignored safely by old readers. Observe query latency and valid snapshot/event coverage before any approved production rollout or indexing expansion.

## Local acceptance, 2026-10-25

Verified: 858 frontend/unit/static tests and 10 collector reliability tests; actual PowerShell snapshot-period identity tests; typecheck; production build; lint (one pre-existing admin navigation warning, no new warnings); encoding, SEO policy, runtime manifest and sitemap-budget checks. The existing indexing gates remain enforced.

Verified against a task-owned local PostgreSQL database: original observations, approved price changes with both source links, UTF-8 duplicate plan items, UTC timestamps under a non-UTC database session, pending-observation 404s and no private payload marker in HTML. A 39 iOS + 10 Web fixture renders the chart's exact 39-region scope. Twenty-one HTTP route/status checks pass; the sitemap is HTTP 200 XML and contains no new country-hub/history/record URLs. Synthetic Netflix sentinel fixtures satisfy the existing complete-sitemap gate; no policy bypass was used.

Verified: 32 browser combinations (two locales, four page templates, 1280×720 and 390×844, light and dark), screenshots inspected, no page overflow. Snapshot keyboard expansion/focus, mobile navigation, detail evidence → source snapshot, stale-country empty state, database-outage status and recovery were exercised. No new motion is introduced; reduced-motion behavior was structurally checked rather than independently emulated.

Adjacent issue: the pre-existing English plan table's client-side `getLocalizedRegionName` can disagree with server ICU (`Hong Kong` versus `Hong Kong SAR China`) in the in-app browser and log React hydration error 418. Development-mode diagnostics located it in unchanged baseline row-name formatting, not the new snapshot link. New page templates had no such error. It is recorded separately and is not claimed fixed or included in console-clean acceptance of the old plan page.

Not verified: production data coverage, natural collection of the newly retained period field, production query latency and online rollout. No push, deployment, production SQL, backfill or indexing submission was performed. The code remains based on application version 2.18.0; a release version is assigned only for an approved rollout.

## Visual alignment follow-up

Improvement / L1, requested after the first preview: align the four new page templates with the existing public pricing pages. Reuse the same max-w-6xl content width, pricing-list title hierarchy, BrandIcon, PublicSection, PublicSectionHeader, MetricStrip, MetricItem and DataNote. Replace the independent transparent cards and underlined link collection with the site's surfaced sections, divided data rows and neutral navigation. Scoped semantic aliases reference the existing Zinc/Lime theme tokens. MetricStrip gains an optional two-column mobile layout; its default remains one column, with no behavior change to existing consumers. Data readers, price rules, routes, metadata, indexing, cache and collection remain unchanged.

Verified on the final styling revision: 22 focused existing regression tests, typecheck, lint (the same pre-existing admin warning), production build and 21 HTTP route/status checks. Captured 32 browser combinations across both languages, all four templates, desktop/mobile and light/dark; checked single H1 and no horizontal overflow, with representative screenshots visually inspected against the live pricing list. Verified Enter/Space expansion, visible focus, product selection, no-event empty state, read-error status and database recovery. New components introduce no animation; reduced-motion behavior is structurally checked. The local synthetic-data and production-verification limitations above still apply.

## Country flag follow-up

Improvement / L1: replace country-code identity tiles on the new directory and country hubs with four reviewed local flag-icons v7.3.2 SVG assets (4:3 icon renditions, MIT). Original files and LICENSE are retained in public/country-flags; data/priority-country-flag-assets.json records source URLs and SHA-256. Display at 32×24 inside the existing 48px identity container using object-contain, retaining full-color artwork in both themes. A visible country name remains next to each decorative flag; a failed image falls back to its ISO code without changing the container size. No runtime CDN or package dependency is introduced.

The old private table flag component uses simplified artwork and a cropped 28×20 presentation; adapting it would also change existing/frozen plan pages. The new CountryIdentity component therefore serves only the additive country templates and leaves that table unchanged. Existing data, navigation, cache, metadata and indexing policies are unchanged.

Verified: production build, typecheck and lint (same existing warning); eight browser combinations covering the two affected templates at desktop/mobile in light/dark, with all SVGs loaded at 32×24, decorative accessibility semantics and no page overflow. Also verified English names and an actual missing-Japan-SVG fallback, then restored the original file and verified all four flags loaded again. Source/asset HTTP and checksum verification are recorded in the delivery evidence. No new motion is introduced; reduced-motion remains structurally checked. This remains local-only work.

## Production-data acceptance follow-up

User approved read-only production verification and a complete real-data preview. Improvement / L2: correct the new country reader's treatment of routine same-price confirmations, display actual per-country coverage and provide a clearly scoped local copy. No production mutation, publication, collection run, migration or backfill is authorized by this verification request.

Source: a repeatable-read, READ ONLY production transaction captured 2026-10-25 03:30:52 UTC. Export is limited to TR, IN, PH, JP and the necessary US baseline, with public product/plan identity, price fields, allowlisted source records and relevant FX. No accounts, IP addresses, administrative notes, SEO, FAQ or tax tables were exported. The initial broader export proposal was rejected by automatic review and not executed; the narrowed query was approved. The local copy has 37 published products (20 AI, 17 streaming), 88 plans, 357 price rows including the US baseline and 53,844 bounded observation records. Schema/data inspection found no duplicate price grain, duplicate IDs, observation orphans or unexpected payload fields.

The initial reader incorrectly required the original approved observation to be at most 14 days old. The existing reviewer marks routine identical rechecks ignored/superseded_by_published_price while refreshing the formal price. The corrected reader requires BOTH an approved, non-anomalous, exact-identity baseline (never future-dated) AND a fresh, non-anomalous exact-price/currency/source/country/platform/type confirmation. Only approved confirmations or the specific same-price ignored reason qualify, with confidence >=80 and an official Apple URL for that country. Formal prices must still be published, verified, monthly iOS list prices, recently checked, positive and valid. Ignored observations never become public snapshots. Querying old and new readers against the same isolated copy changed country counts from 4/4/3/4 to 65/58/64/68.

Accepted coverage (AI / streaming): TR 49/16, IN 48/10, PH 49/15, JP 52/16: 255 country-plan entries. There are 254 working approved snapshot links; JP Disney+ Premium retains an official-source fallback because its source record cannot form a public snapshot. Of 273 target-country price rows, 18 remain excluded: nine pending/unverified, five non-monthly, three outside App Store scope and one lacking a matching approved baseline (IN Grok SuperGrok). No threshold or production state was relaxed to include them. There are zero retained billing-cycle identities in these historical observations, so no confirmed price-change events are invented.

Preview: an isolated new local database contains only this public copy, separated from synthetic fixtures. GEOSUB_PRICE_EVIDENCE_PREVIEW=country-readonly-copy plus a valid GEOSUB_PRICE_EVIDENCE_PREVIEW_AT enables a visible capture-time/scope notice and sends global-plan comparisons to https://geosub.org rather than presenting a five-country subset as a global table. These settings are unset in production. Cache identities include the copy capture time, and the corrected country query uses v2; TTL/tags remain unchanged. The country directory now shows exact product/plan/category counts from the same reader; country hubs provide AI/streaming anchor navigation.

Verified on the final implementation: 860 unit/static tests; 12 actual SQL regression scenarios in a separate synthetic fixture database, including old-approved/fresh-repeat inclusion and rejection of pending, mismatched price/currency/source/country URL, low-confidence, anomalous, other ignored reason, stale/future and no-approved-baseline cases; typecheck, production build, lint (same existing warning) and SEO checks. All 254 snapshot IDs were resolved through the actual reader. Seventeen HTTP checks cover both languages, all country pages, directory/history, AI/streaming snapshots, all expected plan/source links and removal of the old synthetic record. Public-site UI checks independently matched Turkey Netflix Premium TRY 379.99 and Claude Pro TRY 999.99 to the local copy.

Browser verification for this data-copy revision: 16 desktop/mobile light-mode combinations across both languages and all four templates passed single-H1, capture-note and overflow checks; the Turkey page contains all 49 AI plus 16 streaming cards, and its category anchor lands below the sticky header. Existing dark-mode template evidence is retained above. Chrome UI operations were interrupted during this follow-up, so dark mode was not independently reverified for this data-copy revision; the new notice's semantic colors and unchanged dark tokens are structurally checked. Do not claim complete release-candidate visual acceptance on this basis. A production rollout, production query-latency measurement and global historical completeness remain unverified.

## Final dark acceptance and release authorization — 2026-10-25

The user authorized push/deployment once dark acceptance passes. The final real-data revision passed 16 Chrome cases (zh/en × directory/country/history/snapshot × 1280×720/390×844): actual prefers-color-scheme dark, background rgb(9,9,11), text rgb(244,244,245), one H1, no document overflow and intact full-color flag assets. Snapshot checksum details support Space/Enter, visible SUMMARY focus and expanded mobile output. Full-page screenshots and measured viewports are retained in task outputs. The prior follow-up dark evidence gap is closed.

Fresh origin/main and production both identify 2.19.0 / 39147da527de3d59e2fda4014414a61b8acb1bf7; merged without conflict and preserve Apple Music automation. Prepare 2.20.0, run standard release/CI gates and independently release website/collector; no backfills or production data edits.

## History cache limit fix before deployment

Safari/public-copy follow-up exposed Next.js rejecting the raw history cache value (>2 MiB). Classified Bug L2 in this feature: keep the 120-day/5,000-observation sequence and all identity/review rules, compute the same events before caching, and retain only the existing 100 event cards / 12 recent-summary fields plus the full event count. Cache key v2; revalidation tags/TTL and snapshot-detail reader remain unchanged. A large-input regression verifies 127 events, 100 cached cards, 12 summaries, preserved detail IDs and <150 kB, with no original/private item payload. Actual 5,000-row public copy measured 2,809,917 bytes before versus 60 bytes after (zero confirmed events/recent approved snapshots in that bounded window), with identical event count. No candidate had been deployed; 2.20.0 remains the forthcoming production version. Final CI must reference the corrective commit.
