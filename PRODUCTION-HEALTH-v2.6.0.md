# GeoSub v2.6.0 production health baseline

Baseline captured on 2026-08-02 after deployment of commit `69ffd69`.

## Executive result

The public website, database-backed price reads, exchange rates and scheduled
services are healthy. The release is serving normally and has not restarted.
The baseline is marked **attention**, not **unhealthy**, because collection
history exposed a concurrency defect in the shared automatic-review phase.

## Delivery baseline

Five sequential requests were sampled for each endpoint.

| Endpoint | HTTP | Average TTFB | Average total | Slowest sample |
| --- | ---: | ---: | ---: | ---: |
| Local Next.js origin | 200 | 55 ms | 63 ms | 117 ms |
| Public site | 200 | 132 ms | 154 ms | 213 ms |

These are server response samples, not browser Core Web Vitals. v2.6.0 now
caches shared public pricing read models, but the cache does not yet publish a
hit/miss counter. Endpoint latency is therefore the current operational
baseline; cache-hit ratio must wait for explicit telemetry.

## Runtime and data

- Release: `2.6.0` / `69ffd69`; production repository clean.
- Web service: active, zero restarts, zero error-priority journal entries in 24 hours.
- Memory at sampling: 471 MiB.
- Scheduled services: 7/7 active and enabled.
- Storage: 8% used with 221 GiB available.
- Published products: 10.
- Published regional prices: 940.
- Pending observations: 103.
- Published App Store prices older than 14 days: 0.
- Published App Store prices below USD 1: 0.
- Exchange-rate currencies: 36; none older than the 18-hour freshness limit.
- Post-deploy check: passed with zero failures and zero warnings.

## Collection finding

There were 40 successful and 17 failed collector runs in the sampled 24-hour
window. Sixteen failures shared one database error: concurrent automatic-review
runs attempted to approve an observation that another run had already
approved. The collection itself had completed; the shared review handoff made
the whole product run appear failed and scheduled unnecessary retries.

One separate Gemini run reported two temporary storefront failures and is a
normal retryable external-source condition.

## Local corrective work

Migration `075_serialize_app_store_auto_review.sql` wraps the shared App Store
automatic-review function in a transaction-scoped advisory lock. Collection
workers can continue fetching in parallel, while publication review executes
in sequence. The migration is included in deployment and post-deploy gates,
and regression coverage requires the lock to remain present.

This correction is local only until the next explicitly approved patch
deployment. Production v2.6.0 was not changed while creating this report.

## Next measurement

After the patch is deployed, wait for a complete scheduled collection cycle and
run `production-health-report.sh` again. Success means:

- no automatic-review `is not pending` failures;
- no stale running collectors or system tasks;
- zero stale or sub-dollar published prices;
- all deployment gates remain green;
- origin and public response latency remain near this baseline.
