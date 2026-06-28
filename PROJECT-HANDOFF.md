# GeoSub Project Handoff

Updated: 2026-06-28

## Current Stage

The project is currently in framework integration and stability hardening.

The intended pipeline is:

```text
discovery source / manual lead
  -> candidate pool
  -> manual review
  -> product library
  -> collector jobs
  -> collector runner
  -> review center / run history
```

## Completed Foundations

- Public AI pricing pages and detail views.
- Admin console with product, plan, price, review, discovery, and collector job sections.
- Price observation review flow.
- App Store, web, and Google Play collector scripts.
- Exchange rate sync foundation.
- Discovery candidate and discovery source database tables.
- Discovery scanner base script.
- Collector job handoff from approved discovery candidates.
- Collector job runner and run log table.
- Linux ARM deployment files under `geosub-backend/deploy/linux-arm64/`.

## Recently Changed

- Discovery center UI was reorganized into one "Add lead" entry with two modes:
  - concrete product lead
  - long-term monitored source
- Collector jobs page was added.
- Admin sidebar includes discovery and collector jobs.
- Several PostgreSQL raw-query type issues were fixed in discovery actions.

## Current Risks

- Discovery center is not fully product-grade yet.
- Server action errors still need friendly UI handling.
- Generic webpage pricing extraction is not complete.
- End-to-end verification scripts are still needed.
- Database dump is separate from Git and must be backed up privately.

## Recommended Next Step

Prioritize discovery center hardening:

1. Add a concrete product lead.
2. Add a monitored source.
3. Promote a candidate to the product library.
4. Confirm collector jobs are generated.
5. Trigger "run now" for a collector job.
6. Confirm collector run logs are written.

The goal is to make this full admin path stable without relying on framework error pages.

