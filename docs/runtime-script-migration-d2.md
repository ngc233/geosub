# Runtime script migration (D2)

GeoSub currently runs production maintenance through Linux shell wrappers that invoke PowerShell scripts. D2 replaces runtime logic with cross-platform Node.js modules while keeping Windows Task Scheduler installers as PowerShell.

This phase does not switch production. The source of truth is `geosub-backend/scripts/runtime-script-manifest.json`, enforced by `npm run check:runtime-scripts`.

## Current boundary

- 20 project-owned PowerShell scripts are classified.
- 4 `install-*-task.ps1` files remain Windows-specific by design.
- 16 runtime, collector, report, and orchestration scripts receive `.mjs` targets.
- Exchange-rate sync is `shadow-ready`; its Linux production wrapper still runs PowerShell.
- 3 other Linux production entrypoints remain `legacy-active`: discovery scanning, collector jobs, and the price pipeline.
- Existing `.ps1` files remain available for one full release after each production cutover.

## Migration order

1. Exchange-rate synchronization and its local task runner.
2. Discovery scanning and the read-only discovery verifier.
3. App Store collection and automatic review.
4. Collector-job and price-pipeline orchestration.
5. Diagnostic Web and Google Play evidence collectors.
6. Tax synchronization, maintenance runners, and reports.

Each production task advances independently:

1. `legacy-active`: the wrapper still runs PowerShell.
2. `shadow-ready`: the `.mjs` file exists and has passed deterministic and dry-run comparison, but production still runs PowerShell.
3. `active-mjs`: the wrapper runs Node.js; the old PowerShell script remains for rollback for one release.

## Equivalence evidence

Before changing a task to `shadow-ready`, compare old and new implementations with the same sanitized fixture and arguments:

- exit code and failure category;
- normalized summary counters;
- selected products, plans, countries, and queue order;
- database row deltas grouped by table and status;
- anomaly and review reason codes;
- dry-run writes: both implementations must write zero rows;
- UTF-8 output and JSON payload shape.

Network responses must be recorded once and replayed for parser comparisons. A live provider response is not acceptable equivalence evidence because it can change between runs.

Before changing a task to `active-mjs`:

- run the new implementation in shadow mode for at least three scheduled cycles;
- confirm matching outcome counters and no stale `running` rows;
- keep the wrapper change in its own reversible commit;
- verify the systemd service, timer, journal output, and affected database timestamps;
- retain the legacy script until the next successful release.

## Safety rules

- Never run both implementations with writes enabled against the same production task.
- Never infer success only from exit code; verify database effects and freshness timestamps.
- Do not change timer frequency during D2.
- Do not delete a PowerShell runtime until its manifest entry has completed the retention period.
- Windows task installers remain PowerShell even after their runner targets move to Node.js.

## D2-2 exchange-rate evidence

The exchange-rate replacement is split into a pure provider-selection core and thin runtime adapters:

- `exchange-rate-sync-core.mjs` normalizes currencies, selects primary and fallback rows, preserves each row's real provider and rate date, and produces a deterministic plan.
- `sync-exchange-rates.mjs` owns provider I/O, audited sync-run records, database writes, dry-run mode, and fixture replay.
- `run-exchange-rate-sync.mjs` provides cross-platform scheduled logging without shell-specific argument quoting.
- fixed fixtures cover a complete primary response, partial primary response, primary-provider failure, and total provider failure.

The offline command below performs no network request and no database write:

```bash
node geosub-backend/scripts/sync-exchange-rates.mjs \
  --dry-run --json --quotes CNY,EUR,JPY \
  --fixture geosub-backend/scripts/fixtures/exchange-rates-full.json
```

Production remains on `sync-exchange-rates.ps1`. Moving from `shadow-ready` to `active-mjs` still requires three successful scheduled shadow comparisons on the server.

### D2-3 server shadow observation

`run-exchange-rate-sync.sh` keeps PowerShell as the only writer. A default-off bridge runs
`verify-exchange-rate-shadow.mjs` only when `GEOSUB_EXCHANGE_RATE_SHADOW_VERIFY=1`.
The verifier reads the completed legacy run and its stored provider payloads, replays the
Node.js parser without network access or database writes, and compares:

- run status and row count;
- every quote currency and rate;
- provider source and rate date;
- missing or unexpected currencies.

Each attempt appends one versioned JSON object to
`logs/exchange-rate-shadow/YYYY-MM-DD.jsonl`. Shadow failure emits a warning but leaves the
successful legacy task authoritative. Three separate scheduled cycles must pass before a
production wrapper cutover is considered.

`check-exchange-rate-shadow-evidence.mjs` enforces that observation rule. It deduplicates
repeated checks by legacy sync-run ID, counts only consecutive passing runs, and resets the
count when the newest distinct run fails. The checker never changes the wrapper or database;
even a ready result still requires a separate reviewed cutover commit.
