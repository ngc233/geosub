# Frontend trust corrections — local candidate

Type: Bug, L2. Baseline: 092aefe (2.23.0). Branch: fix/frontend-trust-20261031.

Scope: preserve real billing periods in separate listing groups; align search
with overview current-plan scope; read the existing 120-day history window with
stable timestamp/UUID keyset pages inside a read-only repeatable-read transaction;
show retrieved raw coverage without claiming continuity; remove repeated empty
Big Mac references on non-frozen pages.

Invariants: no production data changes, migrations, source syncs, event detection
relaxation, URL/index policy changes or deployment. Keep review failures in history
as sequence boundaries. Keep full snapshot evidence and its checksum compatible.

The 50,000-record safety cap and 30-second transaction deadline remain explicit;
exceeding the cap yields an incomplete state, and query failure yields unavailable.
This does not promise a complete history outside 120 days or prove monitoring
continuity. Query latency and production root cause still need real evidence.

The shared price-position component retains a compatibility option for the active
Chinese ChatGPT Plus experiment. It preserves that page's original empty rows and
footnote. Other pages use the same component with honest module-level missingness.
Do not unlock the experiment or infer approval to change its frozen variables.

Acceptance: >5,000 rows, cap boundaries and failures; existing false-event and
privacy regressions; monthly/weekly/annual groups; empty/partial/full Big Mac
references; frozen-render equivalence; desktop/mobile light/dark, overflow and
console checks. Local fixture checks are not production data acceptance.

Rollback: discard/revert only this branch's changes; no database rollback needed.

## Verification evidence

- Typecheck, lint, full unit suite and production build passed locally.
- Real component fixtures passed 1280x720 and 390x844, light/dark: cycle
  separation, all-missing/partial/full references, no horizontal overflow or
  page errors. Frozen empty-reference HTML exactly equals the baseline component.
- A new task-only PostgreSQL 16 container on loopback port 55439 was migrated
  from repository schema. A read-only CTE generated 6,103 timestamp/UUID records,
  including microsecond boundaries; pagination returned 6,103 distinct IDs.
  The actual product query executed successfully against the empty test schema.
- During the initial fixture run the original local DB on port 55433 was
  unavailable and was not started. The follow-up below uses it read-only. Neither tests nor isolated fixtures diagnose production data gaps.
- Browser scripts and redacted command logs are saved under D:/geosub with the
  frontend-trust prefix. Temporary preview routes are removed; no QA routes ship.
- Production SQL latency, data synchronization and remote CI/deployment remain
  unverified; restored-snapshot coverage is verified in the follow-up below. No production data was altered.

## Restored-data review — 2026-10-31

Scope: local read-only verification of the first batch; no production connection,
source sync, data backfill, version bump, commit, push or deployment.

The existing migration-labelled PostgreSQL 16 container was verified to bind only
127.0.0.1:55433 and started for the review. The restored admin-preview database
contains 357,021 observations, 3,744 prices and 43 products; latest observation is
2026-10-28 00:02:36 UTC. All review connections enforce default_transaction_read_only.
These are restored snapshot findings, not a statement about current production.

### History correctness and performance

| Product | Retrieved rows | Sampled days | Days in old 5,000-row slice | 1,000/page warm ms | 5,000/page warm ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| chatgpt | 34,185 | 116 | 14 | 2950 | 891 |
| netflix | 10,111 | 114 | 78 | 800 | 292 |
| claude | 16,623 | 116 | 38 | 1114 | 382 |
| manus | 23,280 | 115 | 59 | 3946 | 1098 |
| kimi | 23,278 | 87 | 21 | 3264 | 938 |

No reviewed product hit the 50,000-row safety cap. Increasing page size retained
the same rows, coverage and event count. This reduces repeated query overhead;
it changes neither indexes, the 120-day window nor the existing 30-minute cache.
Cold/first queries still cost more (ChatGPT first 5,000/page run: 3,847 ms).
The old truncated ChatGPT query was ~192 ms median but returned only 5,000 rows;
its time cannot be presented as a same-workload comparison. Measurements are
three sequential local samples per product, not production p50/p95 or RUM.

The five reviewed histories still contain no confirmed change events. Critically,
none of the approved ChatGPT (95), Netflix (301) or Claude (38) observations in
the snapshot retain raw_snapshot.billingCycle. Some ignored/pending observations
do retain it, but they cannot establish an approved baseline. Do not infer or
backfill historical period identity from the current plan catalogue. Future
identity-complete approved baselines require a separate evidence/data task.

Thirty-six approved snapshots were compared against their original full raw
payloads and the detail reader: all public fields and content checksums matched.

### Plan scope and affordability

Netflix has two current monthly plans (Standard/Premium, 39 iOS prices each),
plus Basic legacy renewal evidence (27 iOS prices). Review found an edge case
in the first search patch: it hid every offer for a legacy-only product while
overview still fell back to them. Search and overview now share the exact same
current-or-legacy selection helper; two regression cases cover the mixed and
legacy-only situations. Existing overview/frozen-page results remain unchanged.

ChatGPT Plus, Claude Pro and Netflix Standard each pass the existing income
gate with 38/39 regions and 2024–2025 income years. latest_big_mac_prices is empty
in this snapshot; its source is country_consumer_benchmarks filtered to BIG_MAC.
This confirms an unavailable consumption reference, not a missing income model.
No source was synchronized and no gate was relaxed to fill that gap.

### Final verification and remaining release work

- 1,018 tests, typecheck, lint, production build and check:seo passed.
- Actual restored-data pages passed 1280x720 / 390x844 light and dark: full
  history coverage/empty state, Pollo weekly grouping, one missing-reference
  message, income-tab activation, Netflix current-plan search, no overflow or
  page errors. Third-party browser traffic was blocked during verification.
- Existing consent-banner obstruction and nested main landmarks were observed
  as adjacent follow-up issues; these were not redesigned in this batch.
- Synthetic component verification from the first pass remains relevant for
  partial/full reference states and frozen Plus HTML equivalence.
- Before an actual release: approve a release scope, prepare a patch version,
  run the standard release gates against fresh evidence, obtain remote CI and
  use the normal release/rollback entry point. Restored data does not prove
  current production freshness or query performance.
- Test scripts, JSON measurements, screenshots and logs are local under
  D:/geosub/frontend-trust-*.json, *.log and *.png. No private payloads or DB
  connection strings are copied into this document or the Git patch.

The read-only preview rejected existing DailyStat upserts from the site's
statistics endpoint (SQLSTATE 25006); no writes were permitted. Public page
checks and browser pageerror checks passed, but the analytics write path was
not accepted or tested. This is distinct from claiming all server logs are clean.
The preview is stopped and the original DB container returned to exited state;
its database, volume, observations and audit history are retained.
