# GeoSub price auto-review

This step decides whether pending price observations can be promoted automatically.

## Rule

The current production rule is conservative:

- A product + plan + country + price type group needs at least 3 different sources.
- The sources should normally be App Store, Web, and Google Play.
- Prices must be close enough after USD conversion.
- Low-confidence observations stay pending.
- Large changes against an existing published price stay pending.

If a group passes the rule, the script calls `approve_price_observation(...)` and writes the approved price into `region_prices`.

If it does not pass, the observations stay pending and receive a `review_note` explaining why.

## Dry run

```powershell
.\scripts\run-price-auto-review.ps1
```

Dry run shows the decision without changing review status.

## Execute

```powershell
.\scripts\run-price-auto-review.ps1 -Execute
```

Execute mode approves only groups that satisfy the rule. Manual-review groups remain pending.

## Defaults

- Minimum sources: `3`
- Absolute USD tolerance: `$0.50`
- Percent tolerance: `1%`
- Maximum change against existing published price: `15%`

The database function is `run_price_auto_review(...)`, created by:

```text
sql/013_price_auto_review_rules.sql
```
