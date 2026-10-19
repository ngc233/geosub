# GeoSub price auto-review

This step decides whether pending price observations can be promoted automatically.

## V1 default rule

V1 uses App Store as the primary official price source. The default
auto-review rule is App Store stability:

- Group by product + plan + country + billing platform + price type.
- Look at the latest 3 App Store observations.
- Compare the original local `raw_price + currency`, not USD conversion,
  because exchange rates move independently from the product price.
- If all 3 samples match, and the minimum confidence is at least 80, pending
  observations in that group are approved automatically.
- If there are fewer than 3 samples, mixed prices, low confidence, incomplete
  fields, or samples older than 14 days, the group remains pending for further automated evidence.

If a group passes the rule, the script calls `approve_price_observation(...)`
and writes the approved price into `region_prices`.

The database function is:

```text
run_app_store_stability_auto_review(...)
```

## Strict multi-source rule

The strict multi-source rule is conservative and is kept for later:

- A product + plan + country + price type group needs at least 3 different sources.
- The sources should normally be App Store, Web, and Google Play.
- Prices must be close enough after USD conversion.
- Low-confidence observations stay pending.
- Large changes against an existing published price stay pending.

## Dry run

```powershell
.\scripts\run-price-auto-review.ps1
```

Dry run shows the decision without changing review status.

## Execute

```powershell
.\scripts\run-price-auto-review.ps1 -Execute
```

Execute mode approves only groups that satisfy the rule. The legacy `manual_review` decision means that automatic evidence is not sufficient yet; it does not require an operator or payment screenshot.

Run the old strict multi-source rule explicitly:

```powershell
.\scripts\run-price-auto-review.ps1 -Rule StrictMultiSource -Execute
```

## Defaults

- App Store required samples: `3`
- App Store minimum confidence: `80`
- App Store maximum sample age: `14 days`
- Strict minimum sources: `3`
- Absolute USD tolerance: `$0.50`
- Percent tolerance: `1%`
- Maximum change against existing published price: `15%`

The strict database function is `run_price_auto_review(...)`, created by:

```text
sql/schema/010_price_auto_review_rules.sql
```

## Automatic identity lifecycle (schema:058)

After the existing auto-review, a successfully collected product is checked for
recurring identity ambiguity. Three successive official iOS observations after
its last verified price, within 14 days and spanning at least 24 hours, must all
carry the collector's explicit same-plan/multiple-price ambiguity. Samples with
the same observation timestamp count once. A network failure, one anomaly,
short retry burst, different platform/source, or a newer clean sample cannot
quarantine a published price. Exhausted/ignored anomalies remain evidence.

A qualifying price moves to `review / pending_review`, retaining its historical
amount/date. The audit records the three observation IDs; derived affordability
is refreshed. Only products completed in this batch are changed, matching the
existing cache invalidation scope. No new timer or permanent manual hold is added.
Regular collection and existing stability approval restore clean prices
automatically. Identity tracking tickets close only on fresh matching automatic
approval; unrelated review tickets stay untouched. The read-only function
`recurring_app_store_identity_ambiguities(product_slug)` previews the exact scope.
Migration installation performs no data writes. Approval thresholds and canonical
plan matching are unchanged; this automates exception handling, not proof of every
subscription's final checkout price.
