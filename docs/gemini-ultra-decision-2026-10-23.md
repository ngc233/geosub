# English Gemini Ultra decision guidance

Type: Improvement, L2 (shared comparison presenter and three English pages).

## Evidence and scope

The latest available Search Console browser 28-day export covers 2026-09-23–2026-10-20. The exact English Ultra page has 46 clicks, 579 impressions, 7.94% CTR and position 6.16. Daily totals reconcile with the page export. The three visible query rows cover only three impressions (0.52%): currency conversion, cheapest country and PHP price. They do not establish demand for a Pro comparison, and this window cannot measure the effect of this change. API-final status was not inspected. Original exports, file hashes and reproducible calculations remain in private task evidence.

Keep the regional price table first. Add a US monthly App Store comparison of Pro and Ultra, followed by tier identity, family benefits and purchase guidance. The comparison reuses the existing canonical published-data selector. Extract its existing responsive presenter from ProductPlanOverview so ChatGPT retains identical output; a second page-specific price table would risk different eligibility and fallback rules. Missing or unverified comparable prices remain unavailable; no website quote, country minimum or annual amount substitutes for them.

Plan names, amounts, regional coverage and collection dates come from the same product read model as the price pages. The fit advice and Google benefit evidence are separate from price records. Keep the official guidance review date separate from collection dates. Add contextual overview/Pro → Ultra comparison links and Ultra → overview/Pro/YouTube Family paths. No new route or sitemap promotion.

## Purchase evidence

Official Google pages checked on 2026-10-23:

- [iPhone/iPad membership and eligibility](https://support.google.com/googleone/answer/16476748?hl=en&co=GENIE.Platform%3DiOS): personal account, supported country, feature-specific ages, Apple subscription upgrade path.
- [Ultra benefits](https://support.google.com/googleone/answer/16286513?hl=en): different Ultra quota tiers, feature-dependent limits, limited-availability YouTube Individual benefit.
- [Pro benefits](https://support.google.com/googleone/answer/14534406?hl=en): higher AI access; check the exact current limits.
- [Family sharing](https://support.google.com/googleone/answer/9004015?hl=en): selected AI benefits, some shared quotas, same-country requirement.

Production's current US App Store evidence labels Ultra as “Google AI Ultra (30 TB)” and Pro as “Google AI Pro (5 TB)”. The published plan identity does not include 5x/20x. Do not assign a quota variant based on its price or storage label. No collector mapping or business data is changed by this task.

## Invariants and acceptance

Preserve English titles, descriptions, H1, canonical, robots, structured-data policy and URLs. Chinese Plus remains locked: content, metadata and links must compare equal to the baseline. No shared editorial record changes, collector restart, job/timer/configuration change, schema, migration, dependency, caching or publication-policy change.

Run focused data/scope tests, related full frontend tests, typecheck, lint, SEO/sitemap checks and a production build against the isolated local fixture. Verify desktop/mobile light/dark, keyboard focus, touch links, overflow, reduced motion, source links, empty comparison and missing-price states. Compare rendered SEO and the locked page to the unchanged-build baseline. Fixture prices verify rendering only and are not production price evidence.

GitHub push and production deployment remain separate from local verification under AGENTS.md and RELEASE.md. If approved for rollout, use exact-SHA successful CI and the standard detached rolling web release; skip unchanged database inputs and retain collector identity/timers. Roll back using the retained web build with the required exact content compatibility policy; never redeploy or restart a collector to publish this page. Spotify's existing observation continues unchanged and stays quiet on normal results.

## Local verification

- Verified: 745 frontend tests, 70 runtime-script tests, six focused comparison/scope tests (included in the frontend total), typecheck, lint, encoding, catalog, SEO, content uniqueness, sitemap budget and production build. An initial runtime-test attempt lacked `pwsh` on PATH; all 70 passed with the configured runtime. No collector was run against production.
- Verified: Chrome and WebKit, each with six representative pages at 1280×720 and 390×844, light and dark (24 cases per browser). Reduced motion, visible focus, keyboard activation, comparison prices/names, internal link round trips and overflow passed. WebKit uses Option+Tab for links on macOS. The Pro → Ultra anchor and family-plan link were also exercised through the in-app browser; official source pages were opened separately for the evidence review.
- Verified: seven rendered routes retain title, description, H1, canonical, robots and JSON-LD. Chinese Plus, English ChatGPT overview, Chinese Gemini Ultra and YouTube Family retain their main text and links. The comparison uses a freshly built unchanged HEAD against the same isolated database; an older cached build was rejected as an invalid baseline.
- Verified: missing US, wrong channel/currency/period, stale/unverified and pending selection cases never substitute another price. The shared empty presenter is structurally preserved; its empty layout was not separately visually exercised.
- WebKit recorded RSC prefetch access-control messages during rapid cross-page navigation. The unchanged HEAD build reproduced the same warning category (23 messages), with all target pages returning 200. Initial ready-page checks and the requested user paths passed. Raw warnings remain in private evidence; this is not evidence of a new production timeout.
- Local implementation only: no GitHub push, CI run, production deployment, migration, production data write, collector restart or timer/configuration change. Release version remains unchanged until a rollout is approved. This content batch has no measured SEO outcome yet.

## Approved release preparation — 2.15.1

The user subsequently approved push, exact-SHA CI and a zero-downtime website rollout. The first standard release check stopped at dependency audit. The user explicitly expanded scope to the required security updates: Next.js and matching ESLint 16.4.2, sanitize-html 2.18.1. No broad automatic audit fix or unrelated dependency upgrade was used. The [Next.js advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw) and [sanitizer advisory](https://github.com/advisories/GHSA-x3q4-9hxx-gx8m) were checked against the npm registry. This identifies affected installed dependencies, not evidence of exploitation.

Standard release-check passed on the prepared code: both dependency audits report zero vulnerabilities, 747 frontend tests pass, typecheck/lint/build pass, and rolling/transport safety tests pass (one existing platform-specific test skipped). The two added security regressions cover malformed noscript discard handling and the article allowlist against refresh/SVG payloads. Managed-content HTML readback tests pass.

The upgraded build also passed 24 Chrome and 24 WebKit page/viewport/theme checks. Seven representative routes preserve SEO and JSON-LD compared with the same-data pre-upgrade build; Chinese Plus main text and links are unchanged. The full local database preflight reaches the country-page gate but does not pass it because the fixture lacks real source, tax and demand evidence. The same production READ ONLY gate passes: all three index-approved pages are ready, while four preview pages remain blocked. This is recorded as a local fixture limitation, not a full-preflight success.

Version manifests are synchronized at 2.15.1. Database migration inputs are unchanged. The exact 2.15.1 → 2.15.0 managed-content compatibility pair is registered after reviewing unchanged reader/store/validator/schema files and the narrowly scoped renderer addition. The runtime dependency update is covered by the readback and rendered-output checks above. Retain the 2.15.0 website build for application rollback; no database restore is part of this release. No migration backup is required for unchanged database inputs; routine backups continue unchanged.

Only the website and the verified controller policy are rollout targets. The deployed collector must stay at 2.15.0 / 8a8a7db; all 189 production job configuration hashes, timer enablement and migration ledger hashes were captured before rollout. Spotify's existing natural observation remains active and silent. CI, native rollout receipt and live acceptance are still pending at this preparation stage.
