# GeoSub Project Handoff

Updated: 2026-07-24

## Current Stage

The v2.3.1 SEO patch is running in production at commit `289cde0`, including
the permanent redirect from the legacy `www.geosub.org` host to the canonical
origin. Google Search Console accepted the production sitemap with 487 public
URLs, and its live test confirmed that the representative ChatGPT Plus plan
URL is indexable with valid Dataset structured data. The deployment itself
exposed a false health-check failure: a verified-backup pipeline returned 141
under Bash `pipefail` after `head` closed early. The local v2.3.2 patch replaces
that pipeline in both deployment scripts and adds regression coverage. The
subscription currency converter remains local work in progress and is
intentionally excluded from v2.3.2.

## V2.2 Local Roadmap

1. Traditional Chinese is the twelfth active public locale and follows the
   shared locale registry, translated public components and SEO route rules.
2. Seventeen display currencies are available: USD, CNY, TWD, HKD, SGD, EUR,
   JPY, KRW, AUD, CAD, MYR, IDR, THB, PHP, VND, TRY and SAR.
3. The production exchange-rate contract requires 36 fresh USD quote
   currencies. HKD is enforced by local checks, scheduled sync, Linux
   deployment validation and Windows maintenance scripts.
4. Both scheduled and HTTP sync paths merge the central-bank source with the
   fallback provider when Asian quote currencies are omitted.
5. Local acceptance passed source encoding, TypeScript, ESLint, all 209 tests,
   the 115-route production build and browser interaction checks for HKD, SGD,
   AUD, CAD, MYR, IDR, THB, PHP and VND.

The operating pipeline is:

```text
discovery lead
  -> product library
  -> product-level App Store collection
  -> stability and anomaly review
  -> published regional prices
  -> freshness, coverage and anomaly repair cycles
  -> public price and purchasing-power views
```

## V2.1 Local Roadmap

1. Eleven public locales are active locally:
   - Chinese, English, Japanese, Korean, Spanish, Turkish, Arabic, French,
     Italian, German and Portuguese.
   - Arabic uses an RTL document shell; the other ten locales use LTR.
   - Navigation, home pages, AI and streaming lists, product details, regional
     price tables, purchasing-power views, tax and risk notes, sharing,
     trust pages and public footer copy use typed locale dictionaries.
2. Localization is enforced as a platform contract:
   - Active locales are registered once in `lib/site-locale.ts`.
   - Pricing list and detail `hreflang` links are generated from that registry
     instead of duplicated language lists.
   - Official product and plan names remain unchanged across locales while
     explanatory UI and SEO copy are localized.
   - Unknown public locales cannot silently inherit Chinese content.
3. Browser acceptance completed locally on 2026-07-23:
   - 66 desktop routes: 11 locales across home, AI list, ChatGPT detail,
     streaming list, Netflix detail and methodology.
   - 33 mobile routes at 390 by 844: 11 locales across AI list, ChatGPT detail
     and Netflix detail.
   - No 404 pages, replacement characters, horizontal overflow, clipped
     headings or foreign-script leakage were found in the audited routes.
4. V2.1 release-candidate status:
   - The final full preflight passed on 2026-07-23 with database health,
     10/10 migration checks, all eight canonical products, 35/35 fresh
     exchange rates, 8/8 persistent product logos, full-product price quality,
     source encoding, TypeScript, ESLint, all 207 tests and the 114-route
     production build.
   - HBO Max has 102 pending anomaly records after canonical-plan
     normalization. They remain isolated from published prices; the quality
     gate found no published sub-dollar prices, peer outliers or duplicate
     plans.
   - A live French ChatGPT detail page exposes all 11 locale alternates plus
     the English `x-default` URL from the shared locale registry.
   - Root, frontend, backend and npm lockfile versions are synchronized at
     2.1.0, with dated release notes in `CHANGELOG.md`.
   - `scripts/release-check.ps1` passes version, script syntax, repository
     hygiene, secret scanning, frontend validation and production build gates.
   - Commit, GitHub synchronization and production deployment remain pending
     explicit approval.

## V2.0 Local Roadmap

1. Automatic task monitoring: complete locally.
   - Seven Linux scheduled jobs write start, success and failure heartbeats.
   - `/admin/system` shows cadence, latest success, backlog and stale runs.
2. Data-quality automatic closure: complete locally.
   - Stale prices and coverage gaps keep their focused recheck lifecycle.
   - Anomaly rechecks are product-level, deduplicated, delayed by 12 hours and
     capped at three successful rounds.
   - Exhausted untrusted evidence is isolated automatically instead of staying
     in the manual review queue forever.
   - Repair cycles record queued and quarantined totals for the admin summary.
3. Self-healing and operational alerts: complete locally.
   - Every collector pass closes stale running rows before selecting due work.
   - Transient failures retry after 30 minutes, 2 hours and 6 hours, then stop.
   - Missing or unsupported collector configuration is isolated immediately.
   - A unique partial index prevents duplicate in-flight rows for one job.
   - Validated shared plan rules automatically reactivate jobs previously
     stopped by a rule-file parse failure.
   - `/admin/system` groups retrying and isolated work by product instead of
     dumping raw run records.
   - Single-admin account security is complete locally: the settings page can
     verify and change the owner password, rotate the current session, revoke
     other sessions and write a password-change audit entry without storing
     password material.
   - The login page explains the server-side recovery path instead of exposing
     an unfinished email reset flow.
4. Public freshness and provenance hardening: complete locally.
   - Every published plan now carries its own source, latest collection, FX
     basis, review date, page update date and public trust state.
   - Page dates are calculated from the selected plan only; another plan in the
     same product can no longer replace or advance that date.
   - AI and streaming detail pages share the same provenance model and public
     labels, while internal rule codes stay in the admin diagnosis surfaces.
   - The product health overview now summarizes coverage, stale prices,
     published outliers, duplicate plans, tax gaps, update reasons and queue
     state in one product-level row.
   - The full price gate discovers every product with published App Store
     prices instead of relying on a hard-coded product list.
5. Product and plan lifecycle consolidation: complete locally.
   - Public list, sidebar and detail visibility now requires a published product,
     published plan and at least one published regional price.
   - Migration 066 promotes eligible plan and product states when a reviewed
     price becomes public, while archived records remain untouched.
   - Default plans now follow database sort order without brand-specific code.
   - Public detail components now use the clean shared pricing model and no
     longer import the legacy static product and price catalog at runtime.
   - Public availability depends on real published prices and product state,
     without static product lists or stale fallback records.
   - AI and streaming share canonical plan specifications; the release gate now
     rejects alias collisions, malformed ranges, database drift, unexpected
     active variants and App Store collectors without a maintained spec.
   - Public product navigation, categories, logos and plan availability are
     derived from maintained database records.
6. Fully automatic collection and review closure.
   - Product-level manual collection now selects one canonical App Store job
     per product, matching the scheduled runner instead of spawning every
     historical job for that product.
   - Collection completion invalidates the actual product's localized AI and
     streaming routes instead of a hard-coded ChatGPT page.
   - App Store runs remain in progress until stability review and downstream
     repair steps finish; an automatic-review failure now marks the run failed
     and schedules the existing bounded retry instead of recording false
     success.
   - Static App Store fallback responses are decoded from their original bytes
     with strict UTF-8, preventing localized plan names from becoming question
     marks and silently missing canonical plan matching.
   - Storefront availability now distinguishes a confirmed subscription-free
     region from visible App Store items that do not yet match the maintained
     plan specification. Unmatched items remain retryable and diagnostic
     instead of being permanently excluded as unsupported.
   - Successful collections now track availability per plan and country.
     Regional plan differences require three consecutive successful absences
     before coverage retries stop, and automatically return to available when
     the plan appears again.
   - Netflix plan matching now covers maintained Japanese, Korean and
     Traditional Chinese storefront labels through the shared plan
     specification rather than collector code exceptions.
   - Every successful App Store run now persists a product-scoped outcome only
     after automatic review completes: collected observations, auto-approved
     evidence, pending stability samples, isolated evidence, refreshed public
     prices and checked storefronts. The admin reads this immutable snapshot
     instead of reconstructing overlapping runs from a loose time window.
   - Product rows show the latest structured outcome and distinguish an overdue
     queue from a future schedule. Legacy runs without a snapshot no longer
     display a misleading row of zero results.
   - Keep one product-level collection entry that discovers, collects, validates
     and publishes stable prices without requiring row-by-row intervention.
   - Complete repair-queue consumption, unsupported-region handling, coverage
     semantics and actionable product-level progress feedback.
   - Apply shared collection, anomaly and freshness rules to every supported
     product instead of adding product-specific exceptions.
7. Public product experience and localization closure: complete locally.
   - Keep AI and streaming as distinct public sections with a consistent detail
     experience, mobile controls and locally cached official product icons.
   - Move all public copy into locale dictionaries so English, Chinese and
     future languages cannot silently fall back to mixed-language UI.
   - Pricing conclusions, currency and source controls, regional table labels,
     tax and risk explanations, empty states, desktop product navigation and
     the mobile product switcher now use one typed Chinese/English dictionary.
     Adding a new active site locale must satisfy that dictionary at compile
     time instead of silently inheriting Chinese copy.
   - The active English AI and streaming detail pages no longer leak Chinese
     body copy. The Chinese streaming detail page remains free of replacement
     characters, and the 390 px product switcher has no horizontal overflow.
   - Purchasing-power copy, expandable affordability rows and share-card copy
     now accept only active `SiteLocale` values and require complete locale
     coverage. English and Chinese no longer use implicit opposite-language
     fallbacks for these modules.
   - The share card now describes the highest-to-lowest value as a price gap.
     It no longer renders mathematically impossible phrases such as a region
     being 148 percent cheaper than another region.
   - Detail-page copy now distinguishes active `SiteLocale` values from
     prepared future translations. Spanish, Japanese, Korean, German, French
     and Arabic assets remain valid UTF-8 preparation, but public runtime and
     database formatting accept only languages that are formally enabled by
     the site. Unknown locales can no longer silently fall back to Chinese.
   - Public AI and streaming listing copy, category descriptions, product
     counts, card labels, billing suffixes and tax-confidence labels now use the
     same typed locale contract. The list adapter accepts only active site
     locales, and product-card update dates now show the exact latest published
     observation date instead of only the year and month.
   - The dormant static catalog, duplicate list card/client and obsolete detail
     adapter/view have been removed. The active public route graph now has one
     database-backed product model and one localization path.
   - Desktop AI and streaming lists plus the 390 px AI list and English detail
     page pass visual acceptance without horizontal overflow, broken images,
     replacement characters or clipped headings. Country labels now use the
     active locale for every ISO region instead of a partial hand-written map.
   - Public logo requests read only the persistent server cache. Missing cache
     entries fail fast into the maintained brand-vector fallback; remote site
     discovery and downloads remain an explicit admin synchronization action,
     so a slow official site cannot block public page rendering.
8. Content, SEO, analytics and operations completion.
   - SEO truthfulness first pass is complete locally. Static sitemap routes no
     longer claim the current request time as `lastModified`; product and
     article routes continue to publish dates derived from their actual data.
   - Localized AI and streaming details now publish page-specific Open Graph
     and Twitter metadata plus shared `Dataset` and `FAQPage` structured data.
     The FAQ schema is generated from the same questions rendered on the page,
     and dataset modification dates follow the selected plan's freshness.
   - Localized AI and streaming listing routes now use the same typed copy
     source as their cards and publish canonical, hreflang, Open Graph and
     Twitter metadata without duplicating language-specific SEO definitions.
   - Article draft, unpublish, trash, restore and permanent-delete workflows
     are complete. English now has real guide index, detail, category and tag
     routes instead of a placeholder; article lists, related AI/streaming
     links, social metadata, JSON-LD, sitemap entries and cache invalidation all
     follow the article locale.
   - Article creation, editing, taxonomy management and SEO-draft generation
     now load and preserve language-specific categories, tags, related content,
     public links and canonical URLs. The admin exposes explicit Chinese and
     English entry points so new content cannot silently inherit Chinese
     taxonomy.
   - Validate canonical URLs, hreflang, sitemap, robots, structured data and
     analytics configuration against the actual public routes.
   - Give the single administrator concise operational summaries and alerts
     instead of exposing raw implementation details.
9. Release and rollback automation: complete locally.
   - The ARM64 upgrade now records an owner-only deployment attempt manifest
     before runtime changes, including the previous commit, target commit,
     verified database backup, active step, final status and failure location.
   - Any trapped upgrade failure performs a best-effort restart of the Web
     service and all production timers, then prints the exact evidence path and
     backup needed for diagnosis. Database and Git state are not destructively
     rolled back without an explicit operator confirmation.
   - The explicit rollback command requires the exact deployment attempt ID,
     root-owned mode-0600 evidence, valid recorded Git commits and the verified
     backup checksum. It restores code in detached mode, rebuilds, restarts,
     runs the normal health gate and records `rollback.env` plus the restored
     `current.env` revision.
   - Application rollback never restores the database implicitly. The verified
     backup is preserved for the separately confirmed destructive restore
     procedure, avoiding accidental loss of writes made after deployment.
10. V2.0 acceptance and synchronized deployment.
    - Run full data-quality, migration, security, SEO, localization, mobile,
      desktop and production-build gates against the local release candidate.
    - The local release candidate now enforces all seven canonical products,
      their App Store collectors and nine immutable v2 migrations. Disney+
      was collected through three complete 39-storefront runs and promoted by
      the shared stability review with 55 published prices across three plans.
    - Desktop and 375px mobile browser acceptance covers the AI and streaming
      lists plus ChatGPT and Disney+ detail pages. Disney+ uses a cached
      official 180x180 icon and the public logo URL changes with its source so
      a previous 404 cannot mask a newly synchronized asset.
    - The final full local preflight passed on 2026-07-22 with database health,
      9/9 migration checks, all seven canonical products, 35/35 fresh exchange
      rates, source encoding, TypeScript, ESLint, 180 tests and the 65-route
      production build.
    - The accepted local candidate is versioned as 2.0.0 with consolidated
      release notes. Commit, GitHub synchronization and deployment remain
      intentionally pending until the user approves the exact release scope.

## Local Unreleased Database Changes

- `063_system_task_runs.sql`
- `064_data_quality_repair_cycles.sql`
- `065_operational_self_healing.sql`
- `066_public_product_lifecycle.sql`
- `067_app_store_availability_semantics.sql`
- `068_plan_region_availability.sql`
- `069_required_catalog_products.sql`
- `070_disney_app_store_source.sql`
- `071_archive_superseded_app_store_ambiguities.sql`
- `072_normalize_hbo_max_app_store_plans.sql`

All ten migrations have been applied and exercised against the local PostgreSQL
database. The local migration registry contains their final checksums.

## Verification

- `scripts/release-check.ps1` passes.
- Frontend tests: 207 passed in the final full preflight.
- TypeScript, ESLint and the production Next.js build pass.
- The full preflight now runs local-environment, canonical-plan and full-product
  price-quality checks before code validation and the production build.
- The 2026-07-23 full preflight verified 35/35 fresh exchange rates, 8/8
  persistent product logos, 10/10 registered migrations and a 114-route
  production build.
- The single-admin password form was verified in the signed-in local browser;
  the final password-changing submit was intentionally left to the owner.
- Migrations 064 through 071 compile in PostgreSQL.
- Repeated repair cycles do not create duplicate product-level anomaly jobs.
- A real recovery drill requeued four legacy failed jobs, isolated one exhausted
  job, then reactivated it after the shared plan specification was validated.
- `/admin/system` was verified in the signed-in local browser on desktop and at
  a 390 px mobile viewport with no horizontal overflow.
- Public freshness was verified on the ChatGPT Plus detail page at desktop and
  mobile widths, with no horizontal overflow and no cross-plan date fallback.
- The local full-product quality gate passed for ChatGPT, Claude, Disney+,
  Gemini, Grok, Manus and Netflix after refreshing all 35 required
  exchange-rate quotes.
  No published sub-dollar prices, median outliers, duplicate plans, tax gaps,
  exact-local refresh gaps or stuck collector runs were found.
- Migration 066 reconciled Grok, Manus and Netflix from review to published
  because each already had published plans and regional prices. Their public
  detail routes and the AI/streaming listing routes return HTTP 200 locally.
- A networked Netflix Argentina dry run preserved the localized `Transmisión`
  plan labels and matched all three canonical plans without writing prices.
- Networked Netflix Japan, South Korea and Taiwan checks preserved their native
  labels. The shared specification matched two plans in Japan, two in South
  Korea and all three in Taiwan; plan-level evidence correctly recorded Basic
  as pending absence in Japan and South Korea after only one successful check.
- A real local Gemini anomaly recheck collected four observations across
  Thailand and Turkey, refreshed four published prices, isolated four
  non-primary evidence rows and persisted the exact product-level outcome. A
  deliberately encountered outcome-query failure remained a failed retry, then
  the corrected rerun completed successfully and cleared the job error count.
- `/admin/collector-jobs` was verified in the signed-in local browser: Gemini
  shows the persisted 4/0/0/4/4 outcome and two storefronts, legacy product runs
  hide absent snapshots, and overdue schedules are labeled as waiting for the
  runner instead of showing an unexplained old date.
- The local Windows collector runner is now installed as `GeoSub Collector
  Jobs`, runs every 30 minutes with overlap prevention and retries, and records
  the same `collector_runner` heartbeat used by the Linux operations monitor.
  Its first real scheduled batch consumed eight due task slots, reduced the due
  queue from 23 to 13, and completed in 14 minutes. Five App Store products
  reached shared automatic review and persisted product-scoped outcomes;
  ChatGPT's auxiliary official-page source returned HTTP 403 without blocking
  the App Store price path.
- App Store runs now have an explicit `collected_waiting_review` intermediate
  state so the admin timeline distinguishes active collection from the shared
  automatic-review handoff. Windows runner and wrapper output is forced to
  UTF-8 so future source errors remain readable instead of becoming question
  marks.
- `/admin/system` and `/admin/collector-jobs` were reverified after the real
  batch. The system monitor shows the successful Windows heartbeat, 30-minute
  cadence, 14-minute duration, next execution time and remaining due queue;
  product rows show collected, approved, pending-stability, isolated, published
  and storefront totals from the persisted run snapshot.
- Final local acceptance made pricing routes category-case-insensitive, so
  direct Prisma `STREAMING` values cannot silently fall back to AI URLs. The
  admin SEO audit and product SEO editor now show the same effective category
  canonical paths used by public metadata and the sitemap.
- Published product logos now have reusable `sync:logos` and `check:logos`
  commands. Missing cache entries are resolved from a confirmed product logo,
  a high-confidence official-site icon, or official App Store artwork, then
  persisted to the GeoSub logo directory and written back to the product.
  Local coverage is 7/7; Grok and Netflix were repaired during acceptance.
- The full local preflight now gates persistent logo coverage. ARM64 upgrades
  synchronize logos after database migrations, and the post-deploy check fails
  when a published product has no locally cached image, preventing local and
  production visual state from drifting.
- The final acceptance rerun refreshed all 35 required exchange rates and
  passed database health, nine migration checks, seven canonical product
  specifications, seven logo checks, full price quality, source encoding,
  TypeScript, ESLint, all 180 tests and the 65-route production build. The
  generic superseded-evidence rule archived 14 old Manus ambiguity records
  whose exact local price had already been confirmed by a newer published
  record. At final verification, only two hard anomalies (France and the United
  Kingdom) remained; routine stability samples may continue to enter the queue
  as scheduled collection runs. Hard anomalies remain isolated from the public
  price table, and no sub-dollar or extreme published prices are present.
- Public detail localization was verified in the browser on English ChatGPT,
  English Netflix and Chinese Netflix routes. English body content contains no
  Chinese text beyond the intentional language-switcher option; AI and
  streaming sidebars use their correct category, and the Chinese Netflix page
  has no replacement characters. A 390 x 844 mobile check confirmed the
  product switcher replaces the desktop sidebar without horizontal overflow.
- The localization increment passes source-encoding validation, TypeScript,
  ESLint, all 165 frontend tests and the optimized Next.js production build.
- English purchasing-power content and the English share dialog were verified
  without Chinese body text. The Chinese share dialog uses `/月`, contains no
  replacement characters and renders the corrected price-gap sentence; the
  English card uses `/mo` and the equivalent English price-gap wording.
- The active AI and streaming list components now require `SiteLocale` and the
  shared public-pricing dictionary. Static regressions reject a return to
  binary English/Chinese card-copy branches, and the production adapter emits
  exact `YYYY-MM-DD` update dates. The local server is listening on port 3000,
  but this turn's in-app browser connection was blocked from local addresses;
  the four list routes still require one final visual pass before Stage 7 is
  marked fully accepted.
- The first Stage 8 SEO pass added truthful sitemap modification semantics and
  shared product `Dataset` / `FAQPage` JSON-LD for both AI and streaming routes.
  Page-specific social metadata is present in both active languages. Encoding,
  TypeScript, ESLint, all 168 tests and the 65-route production build pass.
- The article localization pass replaced the English guide placeholder with
  database-backed index, detail, category and tag routes. Chinese and English
  articles now share locale-aware admin creation, editing, taxonomy, related
  links, SEO drafts, cache revalidation and dynamic sitemap coverage. Both
  article detail languages publish matching social metadata and organization
  JSON-LD. The full encoding, type, lint, 168-test and production-build gate
  passes after this change.
- ARM64 upgrade transaction, failure recovery and explicit rollback pass five
  dedicated regressions. The repository release check now parses every ARM64
  shell script and passes version sync, PowerShell/Node/Bash syntax, repository
  hygiene, TypeScript, ESLint and all 173 tests. A fresh production build was
  intentionally not repeated for this shell-only increment so the local preview
  could remain available.

## Release Boundary

The complete local v2.0 scope has passed acceptance, so `VERSION` and package
metadata may identify the local candidate as v2.0.0. Do not commit, push, tag or
deploy it until the user approves the synchronized release. The current local
preview remains available at `http://127.0.0.1:3000`.
