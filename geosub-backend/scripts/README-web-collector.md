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
