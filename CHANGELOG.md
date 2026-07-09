# Changelog

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

