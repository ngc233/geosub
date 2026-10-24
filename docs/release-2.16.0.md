# 2.16.0 — Spotify worldwide official Web pricing

Expand the existing four-country Spotify collector to 179 of the 184 regions listed on Spotify's official selector, covering 353 Individual / six-account Family country-plan combinations. Five distinct Standard / Platinum catalogs are explicitly excluded; five countries support Individual only.

Strict localized monthly-price grammars, exact market/currency checks, regional plan sets and six-account Family selection replace the four-country English-only assumptions. Actual source currency is independent of the country's default currency. Bounded four-page HTTP batches keep database writes sequential and isolate per-country failures.

## Deployment and data

Collector-only release from the exact pushed CI-passing commit; no website build/deploy, schema migration, dependencies, indexing-policy change or production backfill. The reviewed Spotify configurator fills 21 missing country rows without rewriting existing rows and updates the existing job's country scope in one transaction. First run dry-run, verify a standard database backup/checksum, execute configuration, then read back idempotently.

The existing independent observation / 24-hour gate, extended change window, current FX requirement and published US baseline remain mandatory. New prices will be collected before they can become public. Public page, report and sitemap output continue to derive from published canonical data.

## Verification and rollback

Reduced real official fixtures cover all 179 accepted regions and expected prices, currencies and plan sets; regression cases reject annual/introductory prices, currency/market errors, malformed separators and Family 4 substitutions. Actual PostgreSQL tests cover catalog dry-run/idempotency, USD pricing in a country with another default currency, Individual-only Korea, time gates, isolation and recovery. Standard release-check and CI are required before deployment; record their actual results in the delivery report.

Rollback: before selecting the retained 2.15.14 component, restore the same Spotify job's four-country config using that release's configurator, then use the standard collector rollback. Keep country catalog rows and observation evidence; no database restore. Validate component identity, timer states, website health and collection after deployment.

Sources: [Spotify official regions](https://www.spotify.com/select-your-country-region/), [ISO 4217 maintenance agency](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html), [Curaçao currency amendment](https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/amendments/dl-currency-iso-amendment-176.pdf).
