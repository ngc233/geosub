# App Store Price Collector

App Store is the V1 primary formal price source for public rankings.

This collector reads public App Store product pages, parses the in-app purchase
price list, and writes observations into `price_observations`.

It first tries a lightweight HTML request. If Apple blocks that request or the
HTML does not contain the in-app purchase list, it falls back to a headless
Chrome render through `scripts/render-app-store-prices.mjs`.

Observations are not published directly on first sight. They enter the review
center first, then the V1 auto-review can promote them after repeated stability:

```text
App Store page -> price_observations pending -> 3 stable App Store samples -> region_prices
```

The collector marks suspicious observations before review. Examples include a
converted USD price below `$1`, App Store text that explicitly says USD while
the parsed currency is different, or a non-USD storefront where a local `$`
price was parsed as USD. These rows stay pending with `anomaly_flag` and a
review note so they are visible in the admin review center.

For products listed in `geosub-backend/data/product-plan-specs.json`, the
collector also checks broad expected monthly USD ranges. These ranges are not
used to decide the exact correct price; they only catch obvious parser mistakes,
wrong billing-cycle captures, or currency conversion failures.

## Run manually

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-app-store-prices.ps1 -ProductSlug chatgpt
```

Default scope:

- Product: `chatgpt`
- App Store app id: read from the product's active `app_store` collector job,
  or pass `-AppId` / `-AppStoreUrl` explicitly.
- Countries: `DEFAULT`, a curated common-storefront set. Mainland China (`CN`)
  and Hong Kong (`HK`) are excluded by default.
- Plans are matched through `geosub-backend/data/product-plan-specs.json` when
  the product has a spec. Unknown products still fall back to App Store
  in-app purchase names and price-ascending sort order.

## Dry run

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-app-store-prices.ps1 -ProductSlug chatgpt -DryRun
```

If matching pending observations already exist today, the collector skips them
unless `-Force` is passed.

Dry run always prints the prices it would collect and does not insert rows.

## Quality report

After a collection run, inspect the local price quality summary:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\report-app-store-price-quality.ps1 -ProductSlug chatgpt
```

The report shows configured plan order, recent observation coverage, pending
review reasons, collector anomalies, and published coverage. It is read-only and
safe to run repeatedly.

## Availability status

Every App Store country check also upserts one row into
`app_store_availability_checks`. This is separate from prices, so the system can
explain missing regions without treating them as collector failure.

Statuses:

- `available_with_prices`: App Store page is reachable and subscription prices
  were parsed.
- `available_no_iap`: App Store page is reachable, but no subscription-like
  in-app purchase price was found.
- `not_available`: the app appears unavailable in that country storefront.
- `blocked`: Apple or the network blocked the check.
- `unknown_error`: the check failed in a way that needs inspection.

The admin collector page shows the latest availability rows. This is the first
place to check when a country such as Turkey has no public price yet.

## Browser rendering fallback

The fallback uses the local Chrome executable by default:

```text
C:\Program Files\Google\Chrome\Application\chrome.exe
```

Override it when needed:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-app-store-prices.ps1 -ChromePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

This rendering step runs only in the offline collector. It is never part of a
visitor page request, so it does not slow down the public website. The website
continues to read cached prices from the database.

## Country coverage

By default the App Store collector runs in `DEFAULT` mode: it samples a curated
set of common storefronts across North America, Europe, Asia-Pacific, Latin
America, the Middle East, and Africa. Mainland China (`CN`) and Hong Kong
(`HK`) are excluded by default.

Use `ALL` only for occasional full-coverage sweeps. It reads every App Store
country from the `countries` table and still skips the excluded storefronts:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-app-store-prices.ps1 -CountryCodes ALL
```

Use `-CountryCodes` only when you want to limit a run to a small test set:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-app-store-prices.ps1 -CountryCodes US,CA,JP,PH,GB,DE,AU
```

Each country must exist in the `countries` table, and the currency must be
supported by the FX providers used for USD conversion. The collector tries
Frankfurter first and falls back to a broader public USD rate endpoint for
currencies that Frankfurter does not cover, such as some emerging-market
storefronts. To exclude more storefronts in an `ALL` run, pass
`-ExcludedCountryCodes CN,HK,XX`.

## Review flow

Open:

```text
http://localhost:3000/admin/review
```

Approve writes the observation into `region_prices`. Ignore/reject keeps it out
of the public price table.

The default automatic path is App Store stability review: the latest 3
observations for the same product, plan, country, platform, and price type must
have the same local `raw_price + currency`. USD conversion is not used for this
stability check because exchange rates can move while the product price has not
changed.

## V1 daily pipeline

The default pipeline is intentionally narrow:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-price-pipeline.ps1
```

By default it collects App Store observations and then runs App Store stability
auto-review. Web, Google Play, and strict multi-source auto-review remain
optional evidence paths and must be enabled explicitly with `-IncludeWeb`,
`-IncludeGooglePlay`, or `-RunStrictAutoReview`.

## Queued collector jobs

The admin review center uses a combined "collect and review" flow. The button
marks relevant App Store `collector_jobs` as due now. The independent collector
runner then processes those jobs:

```text
admin button -> collector_jobs due now -> run-collector-jobs.ps1 -> App Store collection -> stability auto-review
```

`run-collector-jobs.ps1` automatically runs `run_app_store_stability_auto_review`
after at least one App Store job succeeds. Use `-SkipAutoReview` only when you
intentionally want to collect observations without promotion checks.

## Product onboarding automation

The admin product creation flow now attempts to find the App Store app
automatically from the product name:

```text
product name + official site
  -> Apple Search API
  -> product App Store source
  -> collector_jobs
  -> collect-app-store-prices.ps1
  -> auto-created plans from in-app purchase names
  -> price_observations
  -> App Store stability auto-review
  -> region_prices
```

For known products, the collector uses `product-plan-specs.json` to normalize
plan slugs, display names, sort order, aliases, and broad expected monthly USD
ranges. It still parses the App Store in-app purchase list, keeps
subscription-like plan names such as `Go`, `Plus`, `Pro 5x`, and `Pro 20x`, and
filters obvious non-subscription purchases such as credits/coins/tokens.

For unknown products, generated plans use price ascending as the default
`sort_order`, which gives the frontend a sensible first display order until a
human chooses a custom order.

Existing common names still map cleanly:

- `Plus` -> `plus`
- `Pro 20x` -> `pro-20x` for new products, while the existing ChatGPT `pro`
  slug is kept as a backward-compatible alias
- `Pro 5x` -> `pro-5x`

If automatic App Store matching fails, the admin can still paste an App Store
URL or App ID in the product edit page; the rest of the pipeline is the same.

## Evidence-first price quality

The pricing pipeline treats official sources as evidence, not as a single blind
scrape. Each App Store observation now carries enough context for review:

- parser and collector version
- source URL and collection time
- original local price and USD conversion
- FX rate date
- page-level price variants when the App Store exposes multiple prices for the
  same plan
- auto-review decision and reason code
- comparison against the current published price

`sql/042_price_observation_evidence_view.sql` exposes this as
`price_observation_evidence_view`. Admin pages should read this view instead of
re-parsing `raw_payload` ad hoc.

When a rendered App Store page shows several prices for the same known plan, the
collector records the price distribution. The auto-review rule may approve the
latest rendered observation when the selected price has page consensus, for
example `INR 1950 x4` versus `INR 1649 x1`. Older conflicting pending samples are
ignored instead of remaining in the review queue.

External sites are useful probes, but not truth sources. Use
`probe-opentherank-price-diffs.mjs` to detect differences against OpenTheRank:

```powershell
node .\scripts\probe-opentherank-price-diffs.mjs
node .\scripts\probe-opentherank-price-diffs.mjs --product gemini
```

The probe never writes data. A difference should trigger official-source
re-collection or manual source inspection; it must not directly overwrite
`region_prices`.

## Collection cadence

Published prices are maintained with layered scheduling:

- `daily_light`: daily patrol for core countries and popular products.
- `weekly_full`: weekly collection for the curated common-country set.
- `anomaly_watch`: short-interval rechecks for recent anomalies, price changes,
  plan-order conflicts, currency mismatches, or published-price conflicts.

This avoids treating noisy daily full-page scrapes as truth while still catching
real price changes quickly.

`sql/043_app_store_collection_schedule_policy.sql` configures existing App Store
jobs into this cadence and creates `queue_app_store_anomaly_rechecks(...)`.
`run-collector-jobs.ps1` calls that function before selecting due jobs, then
sets the next run time by schedule:

- failed job: 6 hours
- anomaly watch: 6 hours
- daily light: 24 hours
- weekly full: 7 days
- monthly audit: 30 days

The recommended scheduled entrypoint is:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-price-accuracy-maintenance.ps1
```

That script performs the daily maintenance sequence:

1. sync exchange rates,
2. queue anomaly rechecks,
3. run due collector jobs,
4. optionally run the external OpenTheRank probe as an alert-only report.

Use `-SkipExternalProbe` if the scheduled environment should not make external
competitor-page requests.
