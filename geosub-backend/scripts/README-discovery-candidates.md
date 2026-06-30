# GeoSub discovery candidates

Discovery candidates are the staging area between automatic discovery and the
formal product library.

They are intentionally separate from `products`.

## Purpose

The system should help find new products, models, plans, and pricing pages, but
it should not publish them automatically.

Discovery flow:

```text
automatic discovery / manual tip
  -> product_discovery_candidates
  -> admin discovery center
  -> promote / watch / ignore
  -> products only after review
```

## Database

Migration:

```text
sql/014_product_discovery_candidates.sql
sql/015_discovery_sources.sql
sql/016_discovery_source_checks.sql
sql/017_discovery_change_classification.sql
sql/018_discovery_feed_trigger_fields.sql
sql/019_discovery_source_strategy.sql
sql/020_discovery_collection_handoff.sql
```

Main tables:

```text
product_discovery_candidates
discovery_sources
discovery_source_checks
```

Important fields:

- `name`
- `suggested_slug`
- `suggested_category`
- `official_url`
- `pricing_url`
- `app_store_url`
- `google_play_url`
- `source_type`
- `discovery_reason`
- `confidence_score`
- `status`
- `raw_payload`

Statuses:

- `new`
- `watching`
- `promoted`
- `ignored`
- `merged`

## Admin UI

Page:

```text
/admin/discovery
```

Actions:

- `create manual candidate`: lets an admin add a candidate lead directly.
- `create discovery source`: configures a source that future proactive scanners
  can read.
- `promote`: creates a formal product in `review` status, or marks the candidate
  as merged if the slug already exists.
- `watch`: keeps the candidate visible without creating a product.
- `ignore`: closes the candidate without creating a product.

Promotion does not publish the product directly. It creates a service library
entry that still needs normal product, plan, and price completion.

Promotion also creates collector handoff records when URLs are available:

- official URL -> official-site collector job,
- pricing URL -> pricing-page collector job,
- App Store URL -> App Store collector job,
- Google Play URL -> Google Play evidence collector job.

These jobs are stored in `collector_jobs` with `discovery_candidate_id` and
structured `job_config`, so later collectors can pick them up and the admin can
trace them back to the discovery candidate.

Collector execution:

```powershell
.\scripts\run-collector-jobs.ps1
```

The runner reads due `collector_jobs`, dispatches supported jobs to the existing
App Store, Google Play, or ChatGPT web pricing collectors, updates the job's
run counters and next run time, and writes one row into `collector_job_runs`.
Unsupported generic pricing pages are skipped with an explicit run record until
a product-specific parser exists.

Admin UI:

```text
/admin/collector-jobs
```

This page shows active, due, failed, and paused collector jobs, recent run
records, and basic actions for requeueing or pausing a job.

The page also shows the latest 30 source checks from
`discovery_source_checks`, including check time, source, result, classification,
importance score, trigger URL, and whether a candidate was created.

## Current seed

The first migration seeds one candidate:

```text
DeepSeek
```

It is kept as a reviewable candidate so the discovery center has a real item
for acceptance testing.

The source migration seeds:

```text
DeepSeek official pricing
Product Hunt AI products
```

`Product Hunt AI products` is paused until parser rules are implemented.

## Current completion

Implemented:

- candidate storage,
- manual candidate entry,
- source configuration,
- admin review actions,
- promotion into formal products as `review` status.

Not implemented yet:

- RSS/search-specific parsers,
- deep page-change interpretation beyond content hash changes,
- dedupe scoring against external search results,
- deep automatic candidate extraction from source scans.

## Proactive scanner

Script:

```text
scripts/scan-discovery-sources.ps1
```

First version behavior:

- reads active rows from `discovery_sources`,
- respects `scan_interval_hours` unless `-Force` is passed,
- fetches the source URL,
- extracts page title, meta description or text summary,
- computes a SHA-256 content hash,
- parses RSS/Atom sources when `source_type = rss`,
- records the concrete feed item that triggered the check when available,
- applies source-specific strategies such as `pricing_page`,
  `announcement_feed`, `marketplace`, `competitor_page`, and `search_result`,
- writes one row into `discovery_source_checks`,
- classifies changes as `price_change`, `new_model_or_plan`,
  `product_launch`, `content_update`, `no_change`, or `unknown`,
- stores an `importance_score` from 0 to 100 and matched keywords,
- updates `discovery_sources.last_checked_at`, `last_success_at`,
  `last_content_hash`, and `last_title`,
- creates or updates a candidate only when the page is first scanned or its hash
  changes and the importance score is high enough.
- uses two thresholds: `promote_threshold` creates a `new` candidate for manual
  review, while `watch_threshold` keeps a lower-confidence candidate in
  `watching` status so the lead is not lost.

For RSS/Atom sources, the candidate URL points to the triggering feed item, not
only the feed URL. This keeps the admin review trail readable.

`discovery_sources.strategy` controls how changes are classified. For example,
official pricing pages prioritize price and plan terms, announcement feeds
prioritize model, product, and launch terms, and marketplace sources prioritize
in-app purchase and subscription signals. The scanner records matched keywords
in `discovery_source_checks.matched_keywords` so the admin page can explain why
a check was classified a certain way.

`promote_threshold` controls the minimum importance score required before the
scanner writes a `new` candidate. `watch_threshold` controls the lower score
where the scanner writes a `watching` candidate.

Dry run:

```powershell
.\scripts\scan-discovery-sources.ps1 -DryRun -Force
```

Execute:

```powershell
.\scripts\scan-discovery-sources.ps1
```

Without `-Force`, the scanner respects each source's `scan_interval_hours`.
If nothing is due, it exits with `No discovery sources are due.`

Scan one exact source, useful after clicking "加入下一轮检查" in the admin
discovery center or when debugging one URL:

```powershell
.\scripts\scan-discovery-sources.ps1 -SourceId "<discovery_source_id>" -Force
```

The admin button does not run browser/network collection inside the web process.
It marks the source as due by clearing `last_checked_at`; the independent
scanner then picks it up on the next run. This keeps the public/admin website
fast and keeps heavy collection work in the background worker layer.

Linux timer:

```text
deploy/linux-arm64/systemd/geosub-discovery-scan.timer
```
