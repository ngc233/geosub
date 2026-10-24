# 2.18.0 — Spotify regional Standard and Platinum

Add separate Standard (one account) and Platinum (up to three same-address accounts) Web plans for AE, ID, IN, SA and ZA. Spotify coverage reaches all 184 discovered regions / 363 country-plan pairs. Existing Individual / Family prices and mappings remain separate.

## Behavior and data

- Strict official IDs, headers, account benefits, recurring flags and market-specific regular-monthly number formats; exclude Student, trials and one-time offers.
- New plans require the existing independent 24-hour observation gate and fresh FX. Only Standard / Platinum store unavailable US baseline and difference as NULL because the US offers neither plan; other tiers retain the US baseline gate. Reports preserve unavailable comparisons.
- The reviewed source-specific canonical plan definitions are registered as review-only through `configure-official-web-job.mjs --source-key spotify --plans-only --execute`. It preserves existing identities and does not change job scope. Normal configuration then updates the same job to 184 regions. No schema migration or production backfill.
- Chinese/English product editorial explains both tiers, account counts and regional availability using the existing page templates. Existing page references label their actual country when the US is absent; no invented US comparison or indexing-policy change.

## Verification and deployment

Require focused parser / review regressions, all 184 official-page fixtures, real isolated PostgreSQL onboarding and publication, standard release-check, affected browser states and four CI jobs. Record actual production acceptance separately.

After a verified standard database backup, roll the website, stage the two review-only plans, upgrade the collector from the same CI-passing commit, configure and read back the original Spotify job, and run its first real collection. New public prices wait for natural samples. No new FX currencies are needed beyond the existing 49-currency configuration.

Rollback: restore the same task's 179-region scope with the retained 2.16.0 configurator before the standard collector rollback; keep review plans and evidence. Website rollback uses the retained 2.17.0 build (or audited 2.15.15 baseline) with unchanged data contracts. No database restore.

Official evidence: [India](https://www.spotify.com/in-en/premium/), [Indonesia](https://www.spotify.com/id-en/premium/), [UAE](https://www.spotify.com/ae-en/premium/), [Saudi Arabia](https://www.spotify.com/sa-en/premium/), [South Africa](https://www.spotify.com/za-en/premium/).

Local candidate verification: standard release-check passed before integration (836 frontend tests, typecheck, lint, production build and release safety) and passed again on the merged 2.18.0 candidate; 264 runtime tests passed; real isolated PostgreSQL onboarding/publication test passed. Live official dry-run returned 184 complete markets / 363 monthly prices / zero failures. Chinese/English Standard and Platinum pages passed 16 desktop/390px light/dark browser states with no page errors or horizontal overflow, visible exact account/no-US explanations, keyboard focus and reduced-motion checks. Visual fixtures remain strictly local. Registered content contract files were byte-compared with websites 2.17.0 and 2.15.15 (only VERSION differs); both exact 2.18.0 rollback pairs are recorded. Install that CI-verified controller before production release.
