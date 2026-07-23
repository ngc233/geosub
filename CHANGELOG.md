# Changelog

## 2.3.1 - 2026-07-24

- Added a permanent host redirect from `www.geosub.org` to the canonical
  `https://geosub.org` origin while preserving the requested path.
- Submitted the production sitemap to Google Search Console; Google accepted
  487 public URLs and confirmed the representative ChatGPT Plus plan page is
  eligible for indexing with valid Dataset structured data.
- Added regression coverage for the canonical host redirect so legacy `www`
  URLs cannot return duplicate or soft-404 pages again.

## 2.3.0 - 2026-07-24

- Added stable, indexable plan URLs for every published AI and streaming
  subscription across all twelve public locales.
- Added permanent redirects from legacy product and `?plan=` URLs so existing
  links consolidate into one canonical plan page without losing traffic.
- Expanded canonical, `hreflang`, Open Graph, Twitter and structured-data URLs
  to identify the selected subscription plan rather than only its parent
  product.
- Rebuilt the dynamic sitemap around published plans and their real data
  modification dates, removing query-string and duplicate product URLs.
- Added localized search-intent titles and descriptions that use each plan's
  live region count, lowest reviewed price and lowest-price region.
- Standardized public paths without trailing slashes and made the site root a
  permanent redirect to the canonical Chinese homepage.
- Added regression coverage for stable plan routing, locale alternates,
  dynamic SEO copy and sitemap behavior.

## 2.2.1 - 2026-07-24

- Fixed the admin Google Analytics settings flow so malformed input returns a
  clear inline error instead of crashing the Next.js page.
- Added automatic extraction of GA4 Measurement IDs and Google Tag Manager
  Container IDs from pasted Google setup code while preserving strict ID
  validation before settings are stored.

## 2.2.0 - 2026-07-24

- Added Traditional Chinese as the twelfth public locale, including localized
  navigation, pricing lists, product details, regional tables, purchasing
  power, tax and risk notes, sharing, trust pages and locale-aware SEO routes.
- Expanded the public display-currency system from eight to seventeen
  currencies, adding HKD, SGD, AUD, CAD, MYR, IDR, THB, PHP and VND alongside
  unambiguous regional symbols and appropriate decimal formatting.
- Reworked the currency selector into a compact responsive layout with a
  two-column desktop menu and a bounded, scrollable narrow-screen menu.
- Expanded the production exchange-rate contract from 35 to 36 required quote
  currencies by adding HKD across local checks, Linux timers, deployment
  validation and Windows maintenance scripts.
- Unified scheduled and HTTP exchange-rate synchronization so currencies
  omitted by the primary central-bank source are filled from the configured
  fallback provider rather than remaining unavailable.
- Completed source-encoding, TypeScript, ESLint, 209-test and 115-route
  production-build validation, plus browser verification of all newly exposed
  currencies and symbols.

## 2.1.0 - 2026-07-23

- Expanded GeoSub from Chinese and English to eleven active public locales:
  Chinese, English, Japanese, Korean, Spanish, Turkish, Arabic, French,
  Italian, German and Portuguese, including a complete RTL document shell for
  Arabic.
- Consolidated AI and streaming list and detail routes onto shared,
  database-backed components with typed locale dictionaries for navigation,
  pricing conclusions, regional tables, purchasing-power views, tax and risk
  notes, share cards, empty states and public footer content.
- Added localized home, trust, methodology and pricing pages with native
  number, currency, date and country formatting while preserving official
  product and subscription plan names.
- Expanded localized SEO metadata, canonical URLs, structured data, sitemap
  coverage and analytics route recognition; pricing `hreflang` links now derive
  automatically from the active locale registry.
- Added the active application version to the authenticated admin navigation
  so operators can confirm which release is running without server access.
- Added compile-time localization contracts, source-encoding checks and
  regression coverage that reject missing locale copy, Chinese leakage,
  malformed RTL behavior and partial language-route registration.
- Completed browser acceptance across 66 desktop and 33 mobile localized
  routes without 404 pages, replacement characters, horizontal overflow,
  clipped headings or foreign-script leakage.
- Completed the full local release gate with 10/10 registered migrations,
  35/35 fresh exchange rates, persistent logos for all eight published
  products, full-product price-quality checks, 207 tests and a 114-route
  production build.
- Normalized HBO Max to three canonical monthly plans and persisted its
  official artwork; ambiguous legacy observations remain isolated from
  published prices for automatic re-evaluation.

## 2.0.0 - 2026-07-22

- Rebuilt GeoSub around one database-driven catalog for AI and streaming subscriptions, with seven reviewed launch products, canonical plan definitions, category-correct navigation, and synchronized Chinese and English public pages.
- Reworked App Store collection into a product-level automated pipeline with durable progress, scheduled refresh layers, stability review, regional availability checks, bounded retries, stale-run recovery, and automatic isolation of hard anomalies.
- Unified price freshness semantics across collection dates, exchange-rate dates, plan review dates, and page update dates; added full-catalog gates for stale prices, sub-dollar conversions, peer outliers, duplicate plans, tax coverage, and superseded evidence.
- Added operational admin views for product data quality, collection diagnosis, review outcomes, system task health, article lifecycle, navigation, event analytics, Google Analytics configuration, and single-administrator password management.
- Completed public mobile and desktop UI consistency, official cached product artwork, category-specific sidebars, localized purchasing-power and tax/risk content, interactive maps, share cards, and accessible dropdown behavior.
- Expanded SEO and publishing support with localized guides, metadata, canonical and alternate URLs, structured data, dynamic sitemap coverage, robots policy, and production guards for unfinished sections.
- Hardened ARM64 deployment with verified database backups, immutable migration tracking, service health checks, persistent logo synchronization, deployment evidence, failure recovery, and explicit rollback without implicit database restoration.

## 1.0.6 - 2026-07-18

- Automatically ignored legacy Manus Pro non-primary tier observations that predated plan-level price selection, retaining their evidence while preventing stability approval.
- Added deployment and regression guards for the legacy tier cleanup migration.

## 1.0.5 - 2026-07-18

- Added a default 3% exchange-rate tolerance around App Store plan sanity ranges so legitimate local prices are not blocked by small FX movements.
- Added a declarative lowest-valid-tier selection strategy for subscriptions advertised with a starting price, while preserving ambiguity blocking for ordinary plans.
- Reclassified existing Manus tier and Netflix Switzerland false positives back into the normal stability-review flow without publishing them directly.
- Repaired corrupted Disney+ Japanese, Korean, Simplified Chinese, and Traditional Chinese plan aliases so the shared product-plan rules remain valid UTF-8 JSON.

## 1.0.4 - 2026-07-18

- Prevented collector dry runs, including post-deploy startup checks, from changing job status, retry timing, counters, or run history.
- Added a regression guard so stale-price rechecks remain immediately due after a deployment dry run and can be consumed by the real collector service.

## 1.0.3 - 2026-07-18

- Added a 14-day App Store published-price freshness lifecycle that automatically queues focused country rechecks instead of leaving old prices live indefinitely.
- Required three successful focused refresh rounds before an unconfirmed price is moved from the public catalog into the review queue, while immediately hiding regions that App Store reports as unavailable.
- Added admin visibility, deployment migrations, quality gates, and regression coverage for queued freshness checks, retry progress, and stale-price quarantine.

## 1.0.2 - 2026-07-18

- Fixed the production collector runner lock so systemd jobs use a service-owned runtime directory instead of colliding with a root-owned file in `/tmp`.
- Added collector failure-state and dry-run startup checks to deployment validation, preventing an active timer from masking a broken runner.
- Marked analytics aggregation, event retention, and database backup maintenance scripts executable in Git release metadata.

## 1.0.1 - 2026-07-18

- Added a visible admin navigation entry for Google Analytics settings, including GA4/GTM configuration status and explicit save confirmation.
- Kept analytics configuration ID-only, authenticated, and automatically injected on public pages without allowing arbitrary script input.
- Centralized public locale registration and client-side locale synchronization so header, footer, plan controls, metadata language, and document language update correctly during Chinese/English route changes.
- Completed runtime translation audits for the English AI listing, ChatGPT detail, Netflix streaming detail, purchasing-power section, and footer.

## 1.0.0 - 2026-07-18

- Established the first production release baseline for bilingual AI and streaming subscription price comparison, backed by reviewed App Store regional prices, current exchange rates, tax notes, risk signals, maps, purchasing-power views, and share cards.
- Completed the product-level collection and automatic review workflow with durable run progress, stale-run recovery, product identity checks, anomaly quarantine, freshness gates, and database-backed price refreshes.
- Added operational admin coverage for data quality, collection diagnosis, articles, navigation, analytics, event retention, login throttling, backups, deployment health, and Google Analytics settings.
- Synchronized Chinese and English public navigation, product detail behavior, official cached product artwork, dynamic sitemap entries, metadata, canonical URLs, and production security headers.
- Defined one shared launch-scope policy so unfinished rankings, software, gaming, gift-card, VPN, CMS-test, and tracking-test pages remain available for local development but return 404 and stay out of search indexes in production.
- Verified the release with source-encoding, type, lint, automated test, price-quality, database-function, and production-build gates before publication.

## 0.3.0-beta.23 - 2026-07-17

- Changed cached official product images from inset logos to full-bleed, cover-fitted artwork inside the shared rounded icon frame.
- Preserved the built-in fallback mark only while the official image is pending or unavailable, giving product navigation an App Store-style icon treatment.

## 0.3.0-beta.22 - 2026-07-16

- Removed the product-logo opacity transition so loaded official logos appear immediately and cannot remain visually suspended at zero opacity in background or cached-page states.
- Added a regression guard that keeps logo visibility independent from CSS transition scheduling.

## 0.3.0-beta.21 - 2026-07-16

- Made cached official logos visible as soon as their decoded dimensions are available, even while the browser completion flag is still settling after hydration.
- Strengthened the regression test so successful cached-image dimensions take precedence over completion-state failure handling.

## 0.3.0-beta.20 - 2026-07-16

- Fixed official product logos remaining invisible when the browser loaded a cached image before React hydration attached its load handler.
- Added a regression guard for cached-image readiness while preserving the built-in fallback during pending or failed downloads.

## 0.3.0-beta.19 - 2026-07-16

- Preserved database-only streaming categories on product detail pages so Disney+, Netflix, and future streaming products receive the streaming product overview and URLs.
- Replaced browser-side third-party logo hotlinks with a GeoSub API that discovers high-confidence official-site icons and stores validated image files in persistent server storage.
- Kept built-in brand marks visible while a cached logo loads or when an official download fails, eliminating broken-image placeholders.
- Added deployment and post-deploy checks for the persistent product-logo directory.

## 0.3.0-beta.18 - 2026-07-16

- Normalized Disney+ App Store prices into Standard with Ads, Standard, and Premium monthly tiers across localized storefront labels.
- Preserved non-Latin plan names during matching and folded accented Latin labels before alias comparison.
- Excluded explicit annual, one-time Premier Access, and non-US US-only purchases before they can create public plans.
- Added a data migration that consolidates valid Disney+ evidence and archives the fallback-generated duplicate plans.
- Fixed unified-repository upgrades so backend and frontend symlink directories no longer need their own `.git` folders.
- Registered the Disney+ repair as a required core migration and post-deploy health check.

## 0.3.0-beta.17 - 2026-07-16

- Replaced hard-coded price-quality product lists with automatic discovery of every active App Store collector product.
- Added global release and post-deploy gates for product collection freshness, published coverage, sub-dollar prices, median outliers, stale prices, and unrefreshed exact-local observations.
- Automatically quarantined legacy published App Store prices that are extreme against the same plan's peer-region median.
- Completed a full App Store collection and auto-review pass for ChatGPT, Claude, Disney+, Gemini, Grok, Manus, and Netflix.

## 0.3.0-beta.16 - 2026-07-16

- Allowed an exact, non-anomalous App Store local price to refresh its USD conversion and review date without being blocked by normal exchange-rate movement.
- Kept genuine local-price changes and known decimal parsing anomalies on the normal stability-review path.

## 0.3.0-beta.15 - 2026-07-16

- Refreshed published App Store rows when a newer trusted observation confirms the same local price, keeping review dates and FX conversions current without creating duplicate prices.
- Scoped public freshness labels to the active plan and included trusted matching observations when resolving the displayed FX date.
- Serialized collector launches and added App Store product identity checks to prevent concurrent jobs from crossing product arguments.

## 0.3.0-beta.14 - 2026-07-16

- Made public AI and streaming pricing pages dynamically read current database prices and exchange-rate metadata instead of retaining build-time snapshots.
- Hardened product-level collection progress, queued/running reconciliation, review diagnosis, and stale-price guidance so operators can follow automatic collection without reviewing every observation manually.
- Expanded release gates for published-price outliers, stale App Store data, tax coverage, source encoding, SEO, locale consistency, and public interaction regressions.
- Synchronized Chinese and English public pages, category-specific navigation, plan labels, sharing cards, mobile dropdown behavior, expandable region tables, and compact UI radius rules.
- Tightened official-logo synchronization, article archive/trash workflows, analytics settings validation, affordability refresh scope, and App Store-only public pricing policy.

## 0.3.0-beta.13 - 2026-07-10

- Added a product-level action panel to the data diagnosis page with direct actions for one-product collection, review filtering, collector task filtering, and product source editing.
- Added source-edit access from the diagnosis conclusion area so missing App Store task issues can be resolved without leaving the product context.

## 0.3.0-beta.12 - 2026-07-09

- Added data-diagnosis shortcuts from the review queue, review run history, collector product list, collector run history, and App Store availability table.
- Included product slugs in collector-run rows so failed or running collection records can link directly to the product diagnosis page.

## 0.3.0-beta.11 - 2026-07-09

- Added product-level data quality diagnosis pages at `/admin/data-quality/[slug]`.
- Connected data-quality overview rows to the diagnosis page so operators can inspect plan coverage, common-country gaps, pending review reasons, availability, and recent collector outcomes per product.
- Reused existing review reason copy and collector run timeline summaries to keep product diagnosis aligned with the review center and collector center.

## 0.3.0-beta.10 - 2026-07-09

- Added collector-run outcome summaries that attribute each run to newly written price observations, pending/approved/rejected/ignored outcomes, anomalies, and published prices.
- Displayed the outcome summary beside collector timelines in the review center and collector center so operators can see what a manual collection actually produced.
- Kept run attribution migration-free by using product, source, and a bounded run-time window compatible with existing server data.

## 0.3.0-beta.9 - 2026-07-09

- Added a four-step collector run timeline covering run record creation, script startup, collection result writeback, and review handoff.
- Displayed the collector timeline in the review center and collector center so operators can see whether a manual collection actually started, is still waiting, succeeded, skipped, or failed.
- Added unit coverage for queued, spawned, succeeded, and spawn-failed collector run timeline states.

## 0.3.0-beta.8 - 2026-07-09

- Tightened admin collection queue detection so product-level App Store collection is not blocked by unrelated official-page or pricing-page jobs.
- Reused the manual collection progress button on the collector center product action, giving operators immediate progress feedback before redirecting to run history.
- Scoped data-quality queue, running, and latest-run signals to App Store jobs so product health reflects the pricing collector instead of unrelated sources.
- Added unit coverage for App Store queued/running state classification.

## 0.3.0-beta.7 - 2026-07-09

- Added Prisma coverage for collector job run history so admin collection pages no longer depend on fragile raw SQL for that table.
- Switched the admin collector-run history query to typed Prisma reads while preserving product filtering, source labels, runner state, and elapsed-time display.
- Added a source encoding gate to prevent replacement characters or mojibake from entering release builds.

## 0.3.0-beta.6 - 2026-07-09

- Added an explicit compatibility entry for the previously applied affordability migration whose stored checksum differed only by historical line-ending bytes.

## 0.3.0-beta.5 - 2026-07-09

- Normalized SQL migration checksums in the Linux deployment script so CRLF/LF line-ending drift does not block safe upgrades.
- Kept compatibility with existing migration rows that were recorded with legacy raw or CRLF checksums.

## 0.3.0-beta.4 - 2026-07-09

- Added an admin data-quality overview that groups collection, review, anomaly, freshness, and published-price health by product.
- Added per-product collection actions from the data-quality page so operators can collect one service without scanning the full review backlog.
- Refined collection queue interpretation so stale priority flags do not appear as active progress after a later run has already completed.
- Added the data-quality entry to the admin sidebar and tightened manual collection progress copy.
- Verified locally with typecheck, lint, tests, production build, and a browser load of `/admin/data-quality`.

## 0.3.0-beta.3 - 2026-07-08

- Reworked the admin collection center around product-level actions, clearer queue states, and grouped collection/review feedback.
- Added durable collection run polling so manual collection progress remains visible after a request is queued or running.
- Hardened collection execution by reconciling stale running jobs, tightening queued-count semantics, and reducing repeated work for recently collected products.
- Added collection-run history API/query helpers and supporting admin indexes for faster review and collection pages.
- Added price-quality preflight checks for exchange-rate freshness, published price anomalies, pending review backlog, and stuck collector jobs.
- Improved Linux ARM deployment scripts with exchange-rate sync installation, post-deploy checks, SQL migration coverage, and safer collector execution.
- Migrated Next.js middleware to proxy, removed tracked local scan artifacts, and added repository hygiene checks for release publishing.

## 0.3.0-beta.2 - 2026-07-07

- Added admin system health checks for database, exchange rates, collector status, review backlog, content, and runtime configuration.
- Added product-level collection pipeline view with system recommendations, per-product collection actions, pending anomaly summaries, and database-down fallback messaging.
- Optimized admin product and price pages with aggregate queries, focused pagination, and supporting database indexes for large price datasets.
- Added local preflight tooling for code checks, database checks, Docker/PostgreSQL status, and clearer release-check coverage.
- Improved sitemap fallback logging so local builds without a database generate static routes cleanly.
- Ignored stale pnpm workspace files because this project currently uses npm and package-lock for release builds.

## 0.3.0-beta.1 - 2026-07-02

- Added release preparation workflow with synchronized VERSION/package versions, release checks, GitHub publishing helper, and Linux ARM64 upgrade script.
- Added server upgrade safeguards: database backup, SQL migration application, web build, systemd refresh, smoke check, service restart, and deployed version history.
- Upgraded App Store collection with common-country coverage, CN/HK exclusion, daily light patrol, weekly full scan, anomaly rechecks, and manual progress visibility.
- Hardened price quality checks for minor-unit, currency, repeated modal-price, plan identity, and external price-difference evidence.
- Added automated price-review improvements for App Store stability, Gemini collection, Gemini Advanced-to-Pro handling, and Claude Max range handling.
- Expanded country tax profiles, tax confidence labels, tax sync tooling, and frontend tax/risk explanations for common App Store markets.
- Improved admin pricing review with package-column grouping, clearer pending/review history views, and collector status feedback.
- Added SEO and content publishing foundations, including guide/article surfaces, metadata, sitemap/robots entries, and admin article workflows.
- Upgraded navigation management for header/footer menus, language/location/status controls, display reconciliation, and published footer navigation.
- Added AI tool rankings with GeoSub Quality Score v0.1, benchmark-informed scoring pillars, model/tool coverage, and ranking visualization pages.
- Split AI subscription pricing and streaming subscription pricing into separate public pages and navigation entries.
- Hid early-stage ranking, software, gaming, gift-card, and VPN links from launch navigation until content/data coverage is ready.
- Added Google Analytics / Google Tag Manager settings in the admin panel with frontend script injection.
- Expanded AI ranking coverage backlog and brand icon fallbacks for additional mainstream AI, image, video, audio, and open-model tools while keeping the ranking page noindex and under review.

## 0.2.0 - 2026-07-02

- Added price evidence scoring and review-center quality overview.
- Added App Store modal-price consensus handling for repeated in-page prices.
- Added layered price collection scheduling: daily light patrol, weekly full scan, and anomaly rechecks.
- Added exchange-rate-first price accuracy maintenance entrypoint.
- Added OpenTheRank external difference probe as alert-only evidence.

