# English Claude overview comparison and purchase guidance

Improvement / L2; production rollout follows the explicitly approved standard web-only L3 release procedure.

## User problem and evidence

The latest complete visible GSC window checked on 2026-10-23 remains 2026-09-23–2026-10-20: this page has 13 clicks / 564 impressions, 2.30% CTR, position 7.68. `claude cheapest country` accounts for 147 impressions and 6 clicks; 21 visible cheapest-country/region queries total 284 impressions and 8 clicks. Visible query impressions cover 323/564 (57.27%); omitted queries are unknown. This establishes country-price intent, not projected uplift. Export hashes and calculations remain private.

Users need to choose Pro, Max 5x or Max 20x before comparing countries. Replace the existing English overview cards with the shared PublishedPlanComparison, adding an opt-in lowest-price section. Each plan keeps its own canonical published name, comparable US monthly App Store price, minimum country/local currency/USD conversion/date, regional coverage and freshness. Minima may be different countries and are not a same-country upgrade quote. No cross-plan minimum, Web quote, annual amount or missing-US fallback. Minimum facts require verified monthly iOS data with positive finite amounts, currency and valid collection date; other comparison outputs keep their existing rules.

Reuse PurchaseEligibilityNote with explicit overview context so only this English overview gains a first-screen note. An official-source section explains supported locations, original billing platform, checkout taxes/payment/region uncertainty, Pro monthly versus annual, Max monthly only, per-session ratios and continuing limits. Existing overview → three plan links now live in the comparison; the three English plan pages link back to its comparison. Preserve the existing South Korea region-page entry without duplicating it or introducing routes.

## Sources checked 2026-10-23

- [Pro](https://support.claude.com/en/articles/8325606-what-is-the-pro-plan): individual plan, supported locations, monthly/annual options, taxes and session/weekly limits.
- [Max](https://support.claude.com/en/articles/11049741-what-is-the-max-plan): monthly only, mobile prices may differ from Web, 5x/20x per-session allowances and continuing weekly/other limits.
- [Locations](https://support.claude.com/en/articles/8461763-where-can-i-access-claude): supported access locations, not proof of an account's App Store purchase eligibility.
- [Billing](https://support.claude.com/en/articles/8325618-paid-plan-billing-faqs): app-store billing and payment options are managed through the original platform. No claim that a foreign card, VPN or a listed country guarantees purchase.

Benefit-review date is separate from canonical collection dates; no standing manual price approval or checkout screenshots are introduced.

## Invariants and acceptance

Keep titles, description, H1, URL, canonical, robots, hreflang and existing structured data unchanged; the added body facts come from the same dataset. Chinese Plus fixed content, links and experiment lock remain unchanged. Shared editorial records, schema, migrations, cache policies, dependencies, jobs/timers/configuration, collector code and SEO promotion remain unchanged. Spotify stays under its existing quiet observation.

Verify scoped overview qualification and per-plan minimum/data-drift tests, shared comparison tests, full related tests, types/lint, production build, standard release-check, SEO/sitemap and production READ ONLY country gate. Chrome/WebKit: desktop/mobile light/dark, keyboard focus/Enter, touch, exact return anchor, overflow and reduced motion. Use same-fixture old-build baseline for all fixed metadata and protected pages. Include wrong currency/channel/period, missing US, stale/pending/invalid amounts/date, empty and partial-price cases; fixture prices are rendering evidence only.

After exact-SHA CI, install/verify that controller and dispatch the standard geosub_ops.py web-upgrade once. Query that receipt on disconnect. No database-input change means migration skipped, no migration backup and no collector/timer restart. Retain website 2.15.3 and register the reviewed exact 2.15.4 → 2.15.3 content compatibility pair. Verify live canonical prices/minima/dates, origin/public output and CF cache evidence, migration ledgers, 189 job configurations and bounded before/during/after observations. Preparation does not assert rollout or search gains.

## Scoped RFC: contextual fragment navigation

The preceding Grok rollout reproduced duplicate fragments on Next.js 16.4.2 when returning via client Link to a visited comparison. Disabling prefetch did not fix it. Reuse the verified native-anchor approach only for the new Claude plan → overview fragment link; document the line-scoped no-html-link-for-pages exception rather than add a client component or change router/dependency policy. Verify exact single-fragment return URLs in both engines. Existing shared plan links and other products remain unchanged. Reverse the exception only after a framework fix is actually verified.

## Verified local candidate

Standard release-check passed: 756 frontend tests, types/lint, production build, encoding/catalog/SEO/content/sitemap/migration-manifest checks, both dependency audits with zero vulnerabilities, transport/rolling tests (one existing platform-specific skip). Production country readiness under READ ONLY passes with the same three approved pages ready and four previews blocked. No database input changes.

Chrome/WebKit each passed 40 page/viewport/theme cases across ten routes. Checked dynamic per-plan names, local/converted minimums, separate US prices, first-screen qualification, exact single-fragment keyboard/touch return, no overflow and reduced motion; screenshots were visually reviewed in four states. Same-fixture baseline confirms every tested title/description/H1/canonical/robots/JSON-LD unchanged, plus unchanged fixed content/links for Chinese Claude, Chinese Plus, English ChatGPT/Grok Super/Gemini Ultra/YouTube Family. Selector tests cover invalid/stale/pending/wrong channel/period/currency/date and missing US; fallback/empty layout is structurally checked, not separately visually exercised. No production data is copied into the isolated fixture.

Exact-SHA CI and origin/public acceptance remain required before calling this deployed.
