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

## Global expansion approved 2026-10-25

User explicitly requested maximum official-country coverage and authorized push/deployment after self-checks, including the necessary Spotify job configuration. Feature / L2 implementation and L3 production activation; no schema, website, route, or indexing policy changes.

- Discover from Spotify's official country selector: 184 distinct regions. Preserve a reviewed allowlist with country, exact official path, actual charge currency, numeric separators, language and localized plan header. A reduced public pricing fixture retains source URL and original page hash for every accepted country.
- Enable 179 regions / 353 country-plan pairs. AE, ID, IN, SA and ZA expose PREMIUM_STANDARD / PLATINUM, not the existing canonical Individual / Family IDs, and remain excluded with explicit reasons. CG, KR, LY, TJ and VN expose Individual only; require only that market's explicitly reviewed plan set. No inferred Family prices.
- Family 4 and Family 6 can share plan IDs. Match the six-account card using its reviewed localized header and explicit six-account benefit, rejecting duplicate or ambiguous cards.
- Accept explicit monthly prices in 16 observed languages, with strict market-specific currency position and decimal/group grammar. Read renewal prices after promotions, cross-check legal monthly amounts, reject contradictory recurring prices, malformed numbers, nonrecurring items and country redirects.
- A source can charge USD/EUR in a country with another default currency. Keep countries.currency unchanged; validate the actual charge currency against Spotify's market allowlist and use it for observations, FX and publication. Add regression evidence for USD-priced Angola and Individual-only Korea.
- Fill 21 absent canonical country rows in the same Spotify configuration transaction, with reviewed names/default currencies; ON CONFLICT DO NOTHING preserves all existing countries. Dry-run reports additions without writing. The catalog register uses ISO 4217 currencies; Curaçao XCG follows SIX amendment 176 effective 2025-03-31. No country metadata is rewritten to match Spotify billing.
- Fetch at most four HTTP pages concurrently, isolate unavailable countries, and keep all database transactions sequential. US remains first for the published baseline. Each HTTP request retains its existing 20s/2MiB limits.
- Preserve the existing three independent samples / 24h rule, extended change window, FX freshness, US baseline, platform separation and fail-closed behavior. No synthetic production history or bulk approval.

Production acceptance: exact CI-passing collector commit, real all-country dry-run, verified backup before catalog/job activation, idempotent job readback, existing timer states, first actual production collection, and unchanged website health. New public prices remain pending until natural evidence gates pass. Before a component rollback, restore the existing Spotify job's four-country scope using the prior release's reviewed configurator; retain catalog rows and evidence, then use the standard collector rollback. Never restore the database merely to undo this expansion.

## Standard and Platinum approved 2026-10-25

User explicitly authorized adding the remaining five regions, separate Standard and Platinum plans, push and deployment after self-checks. Feature / L2 code and L3 catalog/job activation. This supersedes the five-region exclusion above: all 184 discovered regions now map to 363 region-plan pairs.

- Canonical Web plan specifications live in `spotify-official-markets.json/plan_additions`: Standard (`standard`, PREMIUM_STANDARD / premium-standard), one account, and Platinum (`platinum`, PLATINUM / platinum), up to three accounts at the same address. Preserve Individual/Family IDs, historical observations, default billing scope and the existing 179-market mappings. Student and one-time/prepaid items are excluded.
- AE/AED, ID/IDR, IN/INR, SA/SAR and ZA/ZAR use their exact English official market paths and explicit regular monthly prices; localized separators remain market-specific. Validate the account-count benefit as well as card identity and cycle. Compare the whole Platinum subscription, never per-account math.
- The US has neither of these same-name plans. Only Standard/Platinum may publish with unavailable (`NULL`) US baseline and difference. They still require complete market plan sets, three independent observations across 24 hours, extended large-change windows and current FX. Individual/Family retain mandatory same-plan US baselines. Do not invent a US price, reuse another tier, or persist 0% as an unavailable difference. Reports already preserve unavailable comparisons and page references label the actual selected country.
- Plan registration uses the existing Spotify configurator, inserting only absent monthly plans in review status and rejecting conflicting/archived identities. `--plans-only` stages metadata without changing any job, country or price. The normal configurator subsequently expands the same Spotify job to 184 countries. No SQL schema changes, backfill, direct production approval or US record insertion.
- Add independent Chinese/English public descriptions for both tiers, including account counts, whole-plan billing, known audio features and no US comparison. New plans stay pending until the existing automatic reviewer passes; no routes, sitemap promotions or unrelated layouts are added.

Rollout: verified database backup, deploy the website editorial update via the standard rolling controller, register review-only plan metadata from that exact release, deploy the collector, then update and read back its existing task. Validate first real collection, FX, new-plan review state and health. Rollback before public approval: use the retained 2.16.0 configurator to restore the 179-country task, then roll back the component; keep review plans and evidence. The old website remains capable of rendering dynamically named plans and unavailable report baselines; no database restore is required.
