# English YouTube Premium Family decision guidance

Type: Improvement, L2; approved production rollout follows the L3 standard web release runbook.

## Evidence and scope

Latest available Search Console browser export checked on 2026-10-23: 2026-09-23–2026-10-20, 28 consecutive days. The exact English Family URL has 13 clicks, 1,020 impressions, 1.27% CTR and position 7.87. Daily totals reconcile with the page export. The query table contains zero visible rows: no specific query intent can be inferred from it, and this does not mean no search demand. API-final status was not inspected. Raw export, hashes and calculations stay in task-private evidence. This baseline cannot establish the outcome of the new content.

User problem: prices alone do not explain whether a household qualifies or whether Individual/Lite is sufficient. Keep the regional price table first, add a same-country US monthly App Store comparison and supported household/purchase guidance. The full Family amount is a household bill, never a per-person quote or an assumed six-way saving. Names, amounts, coverage and dates reuse the canonical published comparison selector; missing prices remain unavailable. Never substitute Web prices, another country's minimum, trial discounts or annual amounts.

Reuse PublishedPlanComparison and PurchaseEligibilityNote. Generalize the existing Gemini decision composer to PlanDecisionGuidance so this does not introduce a duplicate price table or layout. Preserve the existing Gemini output; only the narrow English YouTube Family branch adds content. Contextual overview/Individual/Lite links lead to Family's comparison; Family links back to the overview, comparison plan routes and Gemini's existing Individual-benefit explanation. No new routes or index promotion.

## Official guidance

Checked 2026-10-23, with a separate guidance date from collection dates:

- [Family requirements](https://support.google.com/youtube/answer/7507349?hl=en): manager purchase, local manager age, regular Google Account, up to five additional household members, same residential address, family-group membership/switching rules.
- [Availability and travel](https://support.google.com/youtube/answer/6307365?hl=en): predominant subscription-country use, electronic household check every 30 days, accurate location; no cross-border purchase promise.
- [Premium Lite](https://support.google.com/youtube/answer/15968883?hl=en): most non-music videos support ad-free/background/downloads; music/Shorts exclusions and no Music Premium.
- [Premium benefits](https://support.google.com/youtube/answer/6308116?hl=en): full Premium and Music benefits; device/content exceptions still apply.
- [Trial and renewal](https://support.google.com/youtube/answer/10324204?hl=en): account-dependent offer, recurring monthly renewal after trial unless canceled.

Confirm account availability, full renewal bill, taxes and payment method in checkout. The collected iOS regional listing does not establish purchase success.

## Invariants and acceptance

Preserve titles, descriptions, H1, URL, canonical, robots, hreflang, structured-data policy, indexing and the Chinese Plus experiment's fixed text/link structure. No shared editorial record, dependency, cache policy, schema, migration, price record, collector code/job/timer/configuration change. Spotify's existing observation stays active and quiet on normal results.

Verify focused scope/data-boundary tests, full related tests, types, lint, SEO, sitemap and production build. Chrome and WebKit: 1280×720 and 390×844 in light/dark, semantic comparison, focus/keyboard, touch links, anchors, overflow and reduced motion; missing comparable price and empty states must remain honest. Compare locked metadata/content with the unchanged build against the same local fixture; fixture prices are rendering evidence only. Production READ ONLY prices provide final truth.

After push require exact-SHA successful CI. Use scripts/geosub_ops.py and the installed verified controller for a detached web-only rolling release. Compare database inputs and skip unchanged migrations, retaining the collector component and 189 job configurations. Register the precise 2.15.2 → 2.15.1 content compatibility pair after reviewing contract files; rollback uses the retained website build, not a database restore. Release observations must retain start/sample/complete and raw failures; normal Spotify observation is not a reason to restart or force a collection.

## Local verification and rollout preparation

Standard release-check passed: 749 frontend tests, types, lint, encoding/catalog/SEO/content/sitemap checks, production build, both dependency audits (zero vulnerabilities), rolling/transport tests (one existing platform-specific skip). Eight focused comparison/scope tests are included. Production country-page gate under READ ONLY passes: all three index-approved pages ready, four preview pages remain blocked; the isolated fixture is not used as country source/demand evidence.

Chrome and WebKit each pass 32 page/viewport/theme cases across eight representative routes, including keyboard activation, touch links, comparison anchors, no overflow and reduced motion. Missing comparable prices, wrong channel/currency/cycle, stale/unverified/pending records are covered by selector tests; the existing shared empty comparison layout is structurally preserved, not separately visually exercised. Eight rendered routes retain SEO/JSON-LD; Chinese Plus, English ChatGPT, Chinese Family and Gemini Ultra retain main text and links against the same-data unchanged-build baseline. Production price/date verification remains a separate rollout gate.

Candidate 2.15.2 has no dependency, schema or migration-input change. The exact content compatibility pair is recorded for rollback to 2.15.1 after reviewing the unchanged contract and narrow renderer composition. Push, exact-SHA CI and production acceptance follow; this preparation record alone does not assert a live release or SEO improvement.
