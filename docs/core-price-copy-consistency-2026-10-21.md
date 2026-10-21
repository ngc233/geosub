# Core price page consistency repair

## Scope and boundaries

Type: Bug. Risk: L2 (shared page copy, metadata and public presentation).

Users need the same plan identity, region count, price range and eligibility scope in the introduction, metadata, price table and supporting content. This repair derives those facts from the published read model instead of maintaining another set of numbers or names in prose.

No production deployment, frontend restart, migration, collector change, price approval, URL change, index expansion or SEO experiment settlement is included. The existing read-only network observation continues separately.

## Implementation

- `getPricingPagePlan` selects the existing default platform, recomputes ranks within that selection and derives source/freshness fields from the selected rows. Plan descriptions, FAQs, price-position charts and JSON-LD receive this view, as does the price table. The published adapter and page view share `getPlanFreshness`.
- The active `/zh/ai-pricing/chatgpt/plus` experiment retains its original content input. The experiment remains locked; this repair does not claim to settle or fix its frozen copy.
- ChatGPT country pages derive plan names and counts from exactly the monthly iOS rows rendered in their tables. India and Philippines no longer repeat historical Pro 5x/20x names or editorial planning language. Region rankings are recalculated after platform filtering, preventing values such as 8/4.
- Netflix's overview, plan and country templates share one Apple billing eligibility record. The first screen explains renewal scope, new/rejoining customer restrictions, official guidance and its check date. The check date belongs to eligibility guidance, not individual price verification. Plan search descriptions also identify renewal prices.
- Eligibility facts are maintained at the product/channel level. This does not introduce individual purchase screenshots or per-price manual approval. Account eligibility and checkout tax are not inferred from a regional list price.

## Evidence and verification

Netflix source checked on 2026-10-21: [Billing through Apple](https://help.netflix.com/en/node/25097). The payment section says new/rejoining customers cannot use Apple billing; some existing members may need another method. No guarantee of continued Apple billing is implied.

Regression coverage includes mixed-platform counts and minima, selected-source dates, the active experiment exception, empty data, monthly regional filtering, dynamic names/counts, ranking after filtering, renewal eligibility and billing periods. Fixtures are synthetic and local; their prices are not production evidence.

Required local gates: typecheck, lint, full unit/static suite, SEO policy, content uniqueness, sitemap budget and production build. Browser acceptance covers ten representative routes at desktop 1280×720 and mobile 390×844, in light/dark mode, with reduced motion. It checks metadata, canonical paths, JSON-LD coverage, country table rows, overflow, runtime errors, FAQ keyboard toggles and official-source focus.

Local result on 2026-10-21: all gates above passed; 732 unit/static tests passed, including 8 new focused regression tests. All 40 browser route/theme/viewport combinations passed; 12 screenshots were retained. Screenshots were inspected for text wrapping, readability and focus visibility. This is verified local acceptance, not an online rollout.

Acceptance routes:

- `/en/ai-pricing/chatgpt/plus`
- `/en/ai-pricing/chatgpt`
- `/zh/ai-pricing/chatgpt/regions/philippines`
- `/en/ai-pricing/chatgpt/regions/philippines`
- `/en/ai-pricing/gemini/ultra`
- `/en/streaming-pricing/youtube-premium/family`
- `/en/streaming-pricing/netflix/standard`
- `/zh/streaming-pricing/netflix/standard`
- `/en/streaming-pricing/netflix`
- `/en/ai-pricing/chatgpt/pro-5x`

Raw test logs and screenshots remain in the task's private evidence directory. Local verification does not constitute production acceptance or remote CI success. Deployment, when separately scheduled, must use the standard release process and confirm these same facts against production data. Reverting this code change requires no database rollback. Network diagnosis must not trigger a release or frontend restart.
