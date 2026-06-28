# App Store Price Collector

This collector reads public App Store product pages, parses the in-app purchase
price list, and writes observations into `price_observations`.

It first tries a lightweight HTML request. If Apple blocks that request or the
HTML does not contain the in-app purchase list, it falls back to a headless
Chrome render through `scripts/render-app-store-prices.mjs`.

Observations are not published directly. They enter the review center first:

```text
App Store page -> price_observations pending -> admin review -> region_prices
```

## Run manually

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-app-store-prices.ps1
```

Default scope:

- Product: `chatgpt`
- App Store app id: `6448311069`
- Countries: `US`, `CA`, `JP`, `PH`
- Plans parsed:
  - `plus` from `ChatGPT Plus`
  - `pro` from `ChatGPT Pro 20x`

## Dry run

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-app-store-prices.ps1 -DryRun
```

If matching pending observations already exist today, the collector skips them
unless `-Force` is passed.

Dry run always prints the prices it would collect and does not insert rows.

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

## Add more countries

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-app-store-prices.ps1 -CountryCodes US,CA,JP,PH,GB,DE,AU
```

The country must already exist in the `countries` table, and the currency must
be supported by the FX provider used for USD conversion.

## Review flow

Open:

```text
http://localhost:3000/admin/review
```

Approve writes the observation into `region_prices`. Ignore/reject keeps it out
of the public price table.
