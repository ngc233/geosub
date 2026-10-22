# English ChatGPT Pro 100 decision guidance

Improvement / L2; explicitly authorized web-only rolling release follows RELEASE.md and operator-release-observation.md.

## Problem, scope and evidence

The last complete observed GSC window is 2026-09-23–2026-10-20: the historical `/en/ai-pricing/chatgpt/pro-5x` route has 753 impressions, with visible historical 5x, USD and Canada queries. Query impression coverage is only 8.90%; this is a content priority, not an uplift estimate. Current title/H1 already use the published Pro 100 identity and existing lower-page copy already explains 5x. Improve discoverability and decision support rather than claim those facts were missing.

Reuse PurchaseEligibilityNote for a first-screen qualification limited to English ChatGPT, one monthly iOS plan, slug `pro-5x`, plan-page context. Keep the URL, title and metadata. Reuse PlanDecisionGuidance and PublishedPlanComparison for a single three-row comparison of `plus`, `pro-5x`, `pro`, using each canonical plan's name, verified US monthly iOS quote, date and coverage. No Web/annual/minimum fallback. Existing regional table provides the target plan's own lowest price. Explain Canada/CAD versus USD conversion without copying a numeric Canadian price into prose. Link the three canonical plan pages and full overview; no new routes or duplicated country table.

## Official guidance

Checked 2026-10-23: https://learn.chatgpt.com/docs/pricing . Current Pro lineup has multiple paid tiers including a higher tier beyond this focused comparison. Work/Codex usage is shared, workload affects consumption, weekly limits can apply, credits can supplement eligible subscriptions, and API billing is separate. Avoid fixed historical 5x/20x entitlement promises, model-specific counts, universal purchase eligibility or claims of equivalent Web/iOS bills. Eligibility is an instruction to check one's own offered tier/channel/region/payment/tax, not a manually verified purchase-success label. No checkout screenshots or human price-approval queue.

## Invariants and acceptance

Do not change shared editorial records, English/Chinese Plus content, the Chinese Plus experiment lock, titles, descriptions, H1, canonical/robots/hreflang/JSON-LD, SEO promotion, data reader/schema, dependencies, cache policy, migrations, collector code/configuration or timers. The additions render on the server and reuse existing semantic tokens. Other PlanDecisionGuidance branches must remain identical under the same fixture.

Verify qualification scope, data/name drift, wrong platform/period/currency and missing US through focused/shared selector tests; run the standard release gate, full related tests and production build. Same-fixture old-build comparison protects fixed metadata and unrelated main content/links. Chrome/WebKit desktop/mobile light/dark, reduced motion, keyboard focus/Enter and touch links, overflow, regional currency controls and console errors. Empty/error/missing data retain existing shared behavior; distinguish selector tests/structural checks from browser interactions actually exercised.

After exact-SHA CI success, verify/install that controller and dispatch the standard website upgrade once. Query the same receipt on uncertain transport. Unchanged database inputs skip migration and migration backup; existing scheduled backup remains. Keep collector 2.15.0 and 189 tasks, compare pre-dispatch/post-release configuration hashes and timer states; distinguish natural scheduler state changes from deployment mutations. Preserve bounded before/during/after raw observations and check public cache output before completion. Exact content contract is unchanged apart from VERSION, allowing reviewed rollback to web 2.15.4. Spotify's existing quiet automation continues; old public observation stays paused. No IndexNow submission or traffic-growth claim.

## Browser observation

WebKit emitted access-control messages for RSC prefetch requests during the harness's repeated cross-page navigation. Waiting for network idle did not resolve them. A scoped native-navigation experiment also did not resolve them and was reverted completely. Do not ship that ineffective shared-component change. Isolate page-state checks from each individual navigation, preserve original diagnostics, and verify the actual destination and its usable content. Unknown application exceptions remain failures.

The same RSC access-control message class was reproduced against the current public 2.15.4 using its existing Plus/Pro tabs; both actual destinations loaded correctly. Preserve this baseline separately. Final navigation checks allow only that exact WebKit same-origin RSC-prefetch message shape, retain every warning, and still fail unknown exceptions or unusable destinations. Report this known observation rather than claim a clean WebKit console or fix the global router in this content release.

## Verified candidate

Final standard release-check passed: 758 frontend tests, types/lint, production build, both dependency audits with zero vulnerabilities, encoding/catalog/SEO/content/sitemap/migration guards and transport/rolling tests (one existing platform skip). Production READ ONLY country gate preserves the same three ready and four blocked preview pages.

Chrome and WebKit each completed 40 route/viewport/theme cases. Actual keyboard Enter and touch links to Plus/Pro200, focus, CAD selection, Escape, responsive overflow and reduced motion passed. Four-state screenshots were visually reviewed with the analytics banner dismissed. Known WebKit RSC prefetch warnings are retained and reported separately; no unknown application exception was accepted. Same-fixture title/description/H1/canonical/robots/JSON-LD checks pass for all ten routes, with exact fixed main content and links for the nine unchanged pages including Chinese Plus. Missing/empty/invalid selector states are unit tested and shared fallback layout is structurally checked, not separately visually exercised.

Exact-SHA CI and production origin/public acceptance remain required before declaring deployment.
