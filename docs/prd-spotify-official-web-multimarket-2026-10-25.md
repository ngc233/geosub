# Spotify official Web market expansion

Type: Feature. Risk: L2 for collector and public data behavior; production data publication remains a separate L3 operation.

## User problem

Spotify currently has verified US Web prices only, so the public comparison cannot show regional differences. Spotify's own country pages provide recurring Individual and Family monthly prices.

## Scope and invariants

- Add explicitly allowlisted official Spotify markets with verified page structure, currency, country metadata, and recurring prices.
- Keep Web and App Store scopes separate. Promotions, taxes, and purchase eligibility are excluded from the recurring list price.
- Do not attach country App Store tax or account-risk profiles to Spotify Web rows.
- Preserve the existing US published prices on a failed or incomplete regional collection.
- A market becomes public only after the existing independent observation stability gate, valid local currency, current exchange rate, and a published US baseline.
- No new routes, locale pages, or automatic production backfill are included.

## Acceptance

- A dry run returns both canonical plans for each configured market from Spotify's country page and rejects wrong market, currency, plan identity, billing cycle, and unclear renewal prices.
- Review never combines observations from different countries and never publishes without current FX evidence.
- Public Spotify copy describes regional Web prices and does not claim all markets are US.
- Focused collector tests, site tests, typecheck, lint, and build pass. Production collection and publication are verified separately after explicit authorization.

## Rollback and observation

Collector rollback restores the previous configuration and parser while retaining existing published rows. After release, inspect per-market collector summaries, observation quality, FX dates, and public coverage before considering the expansion complete.
