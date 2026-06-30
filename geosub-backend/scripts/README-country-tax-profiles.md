# GeoSub country tax profiles

Country tax profiles are separate from product price collection.

## Why this is separate

- Price collection is product-specific and can run often.
- Tax profiles are country-specific and change slowly.
- App Store list prices are collected as displayed; GeoSub does not recalculate a tax-exclusive or tax-inclusive price unless a verified rule exists.
- Unknown or unverified tax notes should remain `needs_review` instead of being presented as confirmed facts.

## Data flow

1. App Store collector writes observed product prices.
2. Country tax profile sync updates `country_tax_profiles` by country code.
3. Frontend joins prices with tax profiles and displays:
   - `high` confidence as verified context.
   - `medium` confidence as useful but still contextual.
   - `low` or `needs_review` as checkout-dependent or pending verification.

## Run locally

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-country-tax-profile-sync.ps1
```

The default source file is:

```text
data\country-tax-profiles.json
```

The file is intentionally empty until a verified source set is added.

## Suggested frequency

- Production: weekly or monthly.
- Manual refresh: after adding a verified tax source, or when a country changes digital-service tax rules.
- Do not run it on every price collection. That would add complexity without improving price freshness.

## Record keeping

Migration `sql/035_country_tax_profile_sync_system.sql` adds:

- Source metadata on each country profile.
- Next review timing.
- Raw payload storage.
- `country_tax_profile_sync_runs` for audit logs.

This makes tax data explainable and deployable without mixing it into product collectors.
