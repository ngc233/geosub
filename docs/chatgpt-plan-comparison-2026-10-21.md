# English ChatGPT plan comparison

Type: Improvement, L2; authorized production rollout follows existing L3 runbooks.

## Scope

The English overview receives a compact monthly App Store comparison with a common US baseline. Names, local USD amounts, regional coverage and collection dates come from the published product read model. Existing editorial plan-fit and difference records supply decision guidance. Other-country minima, web prices, annual prices and unverified rows never substitute for absent comparable prices. Unknown values remain unavailable.

The existing ProductPlanOverview component gains a narrowly scoped presentation: its generic cards cannot align the requested common-country comparison. It reuses the existing component, canonical decision-plan selection, routing and editorial records. Mobile uses stacked table rows; desktop aligns columns. Existing English ChatGPT related-plan sections link to the overview comparison in context, without duplicating each plan's action link.

## Invariants

English title, description, H1, canonical, index policy and URLs are unchanged. No database/schema, collector, dependency or deployment-tool changes. No new routes or sitemap entries. Chinese Plus remains locked; the comparison and backlinks require locale=en and product=chatgpt. No shared editorial fields are edited.

## Acceptance and rollout

Focused checks cover channel, period, country, quality, missing data, names and locale scope. Run the repository release check and real local database preflight, then desktop/mobile light/dark browser acceptance with keyboard, overflow and core regressions. Compare the locked page's content and SEO to the baseline. After push, require successful CI for the exact SHA before the standard detached web-upgrade. Verify migration skipped, collector identity/timer state unchanged, native receipt, health, page content, sitemap and bounded public observations. Use the previous retained web build for application rollback; no data rollback.

Baseline: GSC 2026-09-21–2026-10-18: overview 30 clicks / 4,898 impressions, 0.61% CTR, position 14.81. The three observed queries price plans / pro price / compare plans total 319 impressions, zero clicks. Visible queries under-cover page totals. This is one content/internal-link batch, not a title experiment. Evaluate after recrawl and at least seven complete reporting days, with a 28-day follow-up; the earlier 2.14.1 release is a separate confounder. No outcome is claimed before observation.

## Pre-push verification

- Standard `release-check.ps1`: passed on the final code, including typecheck, lint, 736 frontend tests, production build, dependency/security checks and release tooling tests (one existing platform-dependent rolling test skipped). Four focused comparison tests passed.
- Full local database preflight: not fully passed. The synthetic fixture lacks country-page source/demand evidence. After refreshing only local FX fixture data, it reached the country readiness gate. The equivalent production read-only country gate passed: 3 approved pages, 0 approved blocked; 4 preview pages remain intentionally blocked. No production data was modified.
- Chrome: 1280px desktop and 390px mobile, light and dark; no horizontal overflow. Fixed and rechecked dark heading contrast. Plan links and overview backlink work by mouse and keyboard, with visible focus. Eleven core routes passed scope/overflow regression checks; Chinese Plus receives no comparison or backlink.
- Safari/WebKit: comparison renders and Plus → overview anchor round trip passed. Local fixture prices are synthetic, not production price evidence.
- Production baseline captured before rollout: website 2.14.1, collector 2.14.0, existing controller verified, healthy public routes, locked-page metadata/content and both migration ledger hashes retained privately. Exact-SHA CI, live price consistency, lock comparison and native rollout receipt remain required after push.

Detailed logs and screenshots are retained outside the repository under the task's private evidence directory.
