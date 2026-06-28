# GeoSub Google Play evidence collector

This collector reads the public Google Play product page for ChatGPT.

## Current public-page limitation

The public Google Play page currently exposes an in-app purchase range such as:

```text
$8.00 - $200.00 per item
```

It does not expose plan-specific subscription prices such as:

- ChatGPT Plus
- ChatGPT Pro

Because of this, the collector stores the page result as evidence only.

## Behavior

- Platform: `android`
- Parser: `google-play-iap-range-v1`
- Observation status: `ignored`
- Plan: empty / unmapped
- Evidence table: `source_evidence`

The observation is intentionally not eligible for auto-approval.

## Dry run

```powershell
.\scripts\collect-google-play-prices.ps1 -DryRun
```

## Insert evidence

```powershell
.\scripts\collect-google-play-prices.ps1
```

Duplicate same-day evidence rows are skipped unless `-Force` is used.

## Upgrade path

To turn Google Play into a true third approval source, the collector must capture plan-specific SKU prices. Possible future approaches:

- browser-rendered purchase flow with a controlled test account,
- Play Billing / internal publisher data if available,
- trusted third-party mobile intelligence feed with SKU-level pricing.

Until then, Google Play evidence should help source verification, but should not auto-promote prices into `region_prices`.
