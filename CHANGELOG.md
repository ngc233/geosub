# Changelog

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

