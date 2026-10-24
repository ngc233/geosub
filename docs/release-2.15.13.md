# 2.15.13 — Spotify regional official Web prices

## Scope

- Deploy the Spotify official Web collector for US, NG, GB and AU, with Individual and Family regular monthly prices.
- Update the Spotify public copy and read model to show the Web billing scope consistently.
- After the website and collector releases, update the existing Spotify collector job to the four-country configuration in a separate, backed-up production data window.

## Unchanged

- No schema migration, bulk backfill, new routes, locale pages, or App Store price changes.
- Existing US published prices remain in place until new observations pass the normal review gate.

## Verification and rollout

- Require successful exact-commit CI before production release.
- Release website and collector through their standard component procedures; confirm both exact commits and runtime versions.
- Preview the current Spotify job configuration, preserve its ID, status, schedule and counters, then execute the scoped configuration update and read it back.
- New markets require three independent stable observations across at least 24 hours, current FX, and a published US baseline before publication. Check collector runs, evidence, FX dates and public pricing after the gate matures.

## Risk and rollback

- Market page markup or country redirects can block collection; failed or incomplete markets must not publish.
- If collection misbehaves, restore the previous collector component and return the Spotify job country list to US in a separately reviewed data change. The website can use its retained prior build. Published rows are not automatically deleted.
