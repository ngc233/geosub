# GeoSub Web price collector

This file documents two web collection layers:

1. `run-collector-jobs.ps1` is the generic scheduler-driven collector entrypoint.
2. `collect-web-prices.ps1` is a legacy configured-price helper for known official web prices.

New products should be added through collector jobs and `job_config`, not through product-specific branches in the scheduler.

## Generic scheduler behavior

`run-collector-jobs.ps1` chooses behavior by `job_config.collector_kind`:

- `app_store`: runs the App Store collector using `app_store_id`.
- `google_play`: runs the Google Play collector using `google_play_package`.
- `pricing_page`: fetches the configured `url` or source `base_url`, snapshots the page, and extracts price hints.
- `official_site`: fetches the configured `url` or source `base_url` as an official site snapshot.

The generic `pricing_page` and `official_site` collectors intentionally do not publish prices directly. They record the fetched page title, final URL, text snippet, and price hints into `collector_job_runs.raw_payload`. A later parser/review step should decide whether the hints are trustworthy enough to become `price_observations`.

`pricing_page` jobs may opt into a maintained source-specific parser through
`job_config.official_web_source_key`. The source definition lives in
`data/official-web-price-sources.json`; the scheduler still has no product-specific
branch. A parser-complete result writes only `pending` Web observations and source
evidence. It never updates `region_prices` and does not use App Store auto-review.

This avoids a separate collector implementation for every product such as ChatGPT, Gemini, Claude, or DeepSeek.

### Browser rendering fallback

For `pricing_page` jobs, the scheduler first tries a lightweight HTTP fetch. If the result looks blocked or incomplete (`login_required` or `no_price_hints`), it automatically runs `scripts/render-web-snapshot.mjs` through Playwright Core and a local Chromium-compatible browser.

This fallback still runs inside the offline collector process. It is never executed inside the public website request path, so it does not slow down page loads.

The browser snapshot writes nested details to `collector_job_runs.raw_payload.browser_snapshot`, including:

- `render_mode`
- `final_url`
- `http_status`
- `diagnosis`
- `price_hints`
- `text_snippet`

If a page still redirects to a login wall after browser rendering, the final diagnosis remains `login_required`.

On Linux deployment, install Chromium or Microsoft Edge and set `CHROME_PATH` when the executable is not in a standard location.

## Legacy configured web helper

`collect-web-prices.ps1` records official web pricing observations into `price_observations`.

### Current scope

This helper is intentionally conservative:

- Product: ChatGPT
- Source: official ChatGPT pricing page
- Platform: `web`
- Country: `US`
- Plans:
  - Plus: `USD 20.00 / month`
  - Pro: `USD 200.00 / month`

The official public pricing page is dynamically rendered, so this helper stores configured official USD web prices and also checks whether the pricing page is reachable. It does not pretend to know localized Web prices for non-US countries.

## Dry run

```powershell
.\scripts\collect-web-prices.ps1 -DryRun
```

## Insert observations

```powershell
.\scripts\collect-web-prices.ps1
```

By default, duplicate pending rows for the same product, plan, country, platform, price, currency, and day are skipped.

Use `-Force` only when you intentionally want another observation on the same day.

## Pipeline position

Web collection is not part of the V1 official publishing path by default.

The V1 public price ranking uses App Store observations as the primary formal
source. Web collection is kept as a diagnostic and future evidence layer because
many pricing pages are dynamically rendered, account-gated, geo-dependent, or
marketing-oriented.

Use it explicitly when you want to collect evidence:

```powershell
.\scripts\run-price-pipeline.ps1 -IncludeWeb
```

Do not mix Web observations into the public ranking unless the source-specific
parser and review rules are stable.

### Spotify US automatic source

`spotify` is an explicitly approved exception to the pending-only default. It
fetches the official public HTML without a browser and reads the server's
structured country, canonical plan IDs and regular monthly renewal prices.
Only existing Individual/Family plans and US/USD are supported. Introductory
zeroes, annual prices, login/geo redirects and ambiguous evidence cannot publish.

`node scripts/collect-official-web-prices.mjs --source-key spotify --dry-run`
performs a live read without database writes. `configure-official-web-job.mjs
--source-key spotify` previews onboarding; add `--execute` only in an authorized,
backed-up production data window. It creates one low-priority task on the existing
scheduler, every 12 hours, and does not rewrite other jobs or timers. Repeating
configuration preserves the existing job and its counters/schedule.

Automatic review requires three independent same-price samples spanning at least
24 hours, at least six hours apart. Large changes over 30% need five samples over
72 hours. Evidence is at most seven days old and latest at most 48 hours old.
All target plans must pass. Only exact Web keys are updated; iOS prices are never
fallback targets. The decision audit stores the supporting observation IDs.
Invalid evidence remains isolated, followed by ordinary automatic sampling and
recovery. `--force` cannot bypass independence; `--skip-auto-review` is honored.

After successful Spotify collection the scheduler requests scoped pricing-cache
invalidation from the current website over loopback, then refreshes reports.
The request uses a job-bound HMAC derived from the current private build preview
key, cannot follow redirects, and is accepted only for the Spotify source job.
Secrets never appear in logs or external requests. The existing admin-only random
token route remains supported. A cache failure is a bounded system-task failure
and retries on the next successful collection. No new persistent timer is added.

## Apple Music five-market pilot

The first maintained source-specific parser is `apple-music`. It covers US, BR,
TR, JP and DE and accepts only the Individual, Family and Student monthly list
prices. Apple One and trial text are excluded by the parser boundary.

Run a live parse without a database write:

```powershell
node .\scripts\collect-official-web-prices.mjs --source-key apple-music --dry-run
```

Write parser-complete observations to a local database only after the draft
`apple-music` product, the three canonical plan slugs and all five countries
exist:

```powershell
node .\scripts\collect-official-web-prices.mjs --source-key apple-music
```

The write path leaves `converted_usd` null until an approved FX/review step and
stores `status=pending`, `billing_platform=web`, page hash and evidence metadata.
