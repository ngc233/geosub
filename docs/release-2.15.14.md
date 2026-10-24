# 2.15.14 — Spotify named storefront parser compatibility

## Scope

- The production Spotify NG page sometimes supplies `pageProps.components` as a named object instead of an array. Read `components.storefront.plans` in that form, while retaining the existing country, identity, billing-cycle, recurring-price and purchase-market checks.
- Ignore `components.benefitsComparison.plans` as price evidence.

## Invariants and rollout

- No website code, public copy, job configuration, database schema, or published price is changed by this patch.
- The website remains at 2.15.12. Release only the collector component from the exact CI-verified 2.15.14 commit.
- Run an official Web dry run from the deployed component and verify both array and named-object NG responses parse. Natural scheduling supplies the next production observation; existing US, GB and AU observations remain pending until the stability gate is met.

## Risk and rollback

- A new Spotify schema can still make a market fail closed. The collector records a failed market without publishing an incomplete price.
- Roll back the collector with its retained component if the new parser causes unexpected failures; the four-market job configuration and published rows remain unchanged.
