# GeoSub Web price collector

This collector records official web pricing observations into `price_observations`.

## Current scope

The first version is intentionally conservative:

- Product: ChatGPT
- Source: official ChatGPT pricing page
- Platform: `web`
- Country: `US`
- Plans:
  - Plus: `USD 20.00 / month`
  - Pro: `USD 200.00 / month`

The official public pricing page is dynamically rendered, so this collector stores configured official USD web prices and also checks whether the pricing page is reachable. It does not pretend to know localized Web prices for non-US countries.

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

This collector adds a second source next to App Store.

Auto-review still requires 3 sources by default:

1. App Store
2. Web official pricing
3. Google Play

Once all three are available and the converted prices agree within tolerance, `run_price_auto_review(...)` can auto-approve them into `region_prices`.
