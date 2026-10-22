# English Grok Super subscription identity and purchase guidance

Type: Improvement, L2. Production rollout uses the already authorized standard L3 web-only release procedure.

## Evidence, user problem and scope

Search Console's latest visible complete 28-day window checked on 2026-10-23 remains 2026-09-23–2026-10-20: this exact page has 37 clicks, 2,279 impressions, 1.62% CTR and position 7.97. Visible queries include `super grok price` (22 impressions), `supergrok price` (19), and `grok cheapest country` (13 impressions, 2 clicks). Visible queries cover only 252/2,279 impressions (11.06%); unknown queries are not zero demand. Broader pricing queries rank differently, and the changing impression/ranking mix does not establish a title defect. No uplift is claimed.

Users need to know whether a collected App Store SuperGrok price describes the plan they can buy or renew. xAI's October 12 announcement distinguishes The X Subscription for website newcomers from existing SuperGrok subscriptions that may be retained or switched. Do not map app listings onto new website tiers, imply all app listings are renewal-only, or infer country/account/payment eligibility.

Reuse PurchaseEligibilityNote and PlanDecisionGuidance/PublishedPlanComparison: first-screen scope and qualification, same-country US monthly App Store comparison, source-linked guidance and practical overview/plan navigation. Canonical published names, local USD amounts, coverage and collection dates flow through the existing selector; missing comparable data stays unavailable. No website quote replaces an app price. The regional table remains before the extended comparison. Narrow English overview/Lite/Heavy backlinks and the English Super plan-fit text prevent nearby contradictions; Chinese editorial content is unchanged.

Official guidance checked 2026-10-23, separately from price collection dates:

- [Announcement](https://x.ai/news/x-subscription): website new-customer offering and existing-plan retain/switch options.
- [Current website pricing](https://x.ai/pricing): current website tiers; linked for user confirmation, not imported as regional prices.
- [Subscription FAQ](https://docs.x.ai/x-subscription/faq): existing plan continues unless changed/canceled.
- [Grok billing FAQ](https://docs.x.ai/grok/faq): original account and channel determine subscription management; Apple handles App Store transactions.

## Invariants, acceptance and rollout

Preserve all existing titles, H1, URLs, canonical, robots and hreflang. The English Super description and the affected English Super/overview FAQ answers follow the qualified plan-fit copy; Dataset description follows that same description. Structured-data types, price facts and all other metadata remain unchanged. Chinese Plus's fixed content and internal links remain locked. No schema, migration, business data, cache policy, dependency, collector code/job/timer/configuration or indexing promotion changes. Spotify's existing observation remains quiet on normal results.

Required verification: scoped identity/channel/period/data-drift tests, standard release-check, full related tests, types/lint/build/SEO/sitemap; Chrome and WebKit desktop/mobile light/dark, keyboard focus/Enter, touch access, anchors, overflow and reduced motion. Compare unchanged fixed content and metadata against the old build on the same isolated fixture; fixture amounts are rendering evidence only, production READ ONLY rows are price truth. Existing selector tests cover pending/stale/wrong currency/channel/yearly/missing US/empty data; no fallback is introduced.

After exact-SHA CI succeeds, install/verify that controller and use scripts/geosub_ops.py start/status for a detached web-only rolling upgrade. No database-input change means migration_skipped and no collector/timer restart. Preserve the old build as rollback target; register the reviewed exact 2.15.3 → 2.15.2 content compatibility pair. Retain raw start/sample/complete observations before/during/after. Verify origin and public output, canonical names/amounts/dates, Chinese Plus fixed content, runtime/ledgers and all job configurations. Unknown transport status means query the same receipt, never redispatch. No deployment success is asserted by this preparation record.

## Scoped RFC: native links for the new Grok comparison fragment

Problem reproduced in Chrome and WebKit on installed Next.js 16.4.2: navigate from Super's comparison to Lite, then follow the new contextual link back. The client router produces `#compare-plans#compare-plans`. A direct first visit works. Disabling prefetch was tested and did not correct the round trip.

Decision: use native anchors for only the two new Grok contextual fragment links (overview and related plan choices). This is a documented, line-scoped exception to the no-html-link-for-pages lint rule for a verified navigation defect, not a disabled check for unrelated code. It intentionally performs a document navigation, preserves the exact href, native keyboard/touch behavior and canonical URL, and adds no client component. Existing shared plan navigation, other products, routing and dependency/cache policies remain unchanged. A router-wide fix or dependency change is outside this task.

Acceptance: both engines must verify the exact single-fragment URL, scroll position and keyboard/touch round trips in the four viewport/theme states. Reversal is removal of these two exceptions and restoration of Link after a verified framework fix. Re-run the final standard release gate and browser matrix before push.

## Local candidate verified

Standard release-check passes: 752 frontend tests, types/lint, encoding, migration manifest, catalog/SEO/content/sitemap checks, production build, zero vulnerabilities in both dependency audits, transport and rolling tests (one existing platform-specific skip). The production READ ONLY country-page gate passes: all three approved pages remain ready; four preview pages remain blocked. No database inputs changed. The exact rollback content pair is registered; only VERSION differs among listed contract files.

Chrome and WebKit each pass 36 page/viewport/theme cases across nine routes, including exact single-fragment return URLs, keyboard focus/Enter, touch overview link, no page overflow and reduced motion. Four-state screenshots were visually inspected. Same-fixture comparison verifies unchanged titles/H1/canonical/robots and all fixed Chinese Plus content/links, plus unchanged English ChatGPT/Gemini Ultra/YouTube Family and Chinese Grok output. Only the expected English Grok description/FAQ identity text changes in metadata/JSON-LD; all price facts and structured-data types remain identical. Existing shared missing/empty comparison rendering is preserved structurally and its selector boundaries are tested; empty UI is not separately visually exercised.

Exact-SHA CI and production output still require rollout verification. This candidate record does not assert deployment or search gains.
