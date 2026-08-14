# GeoSub Legal, Asset, Privacy, and Positioning Audit

Date: 2026-08-14

Status: Local remediation implemented and verified on 2026-08-15. Production deployment is not part of this audit batch.

This document is an engineering and product-risk review, not legal advice. Contract interpretation and commercial use of third-party content should be confirmed by qualified counsel.

## Remediation verification (2026-08-15)

| Area | Current status | Remaining boundary |
| --- | --- | --- |
| Repository license | Implemented | Proprietary `LICENSE` and `THIRD_PARTY_NOTICES.md` are present. Changes to the licensing model still require owner approval. |
| App Store collection controls | Implemented with residual external risk | The collector has an emergency stop, bounded delay, jitter, response cache, bounded retries, exponential backoff, and a transparent GeoSub User-Agent. These controls reduce load and operational risk, but they do not replace written permission or a licensed source. |
| Legal and trust routes | Implemented | About, Privacy, Terms, Data Sources, Guides, and Methodology resolve in all 12 public locales. Locale index promotion remains governed separately by the SEO policy. |
| Privacy disclosure and retention | Implemented | The public disclosure covers first-party analytics, consent, Google Analytics/Tag Manager, and a 180-day raw-event limit. The retention job now treats 180 days as a hard maximum even when an aggregation cycle is incomplete. |
| Independence statement | Implemented | The localized footer states that GeoSub is an independent comparison service and is not affiliated with, sponsored by, or endorsed by listed brands. |
| Public product logos | Safely contained, not complete | Public rendering uses rights-reviewed local files, reviewed Simple Icons mappings, or neutral GeoSub initials. Apple-hosted and unreviewed remote artwork is diagnostic-only. No permission-backed official product file is registered yet. |
| Dependency release gate | Implemented | Frontend and backend release checks audit the complete dependency trees at high severity, including development and build dependencies. |

The two open external actions are therefore: obtain a documented permission or licensed long-term price source, and acquire permission-backed official brand assets where neutral or Simple Icons fallbacks are not sufficient. Neither action can be completed by code alone.

## Executive verdict

GeoSub already presents itself mainly as an independent price-transparency and research service, and the public pages usually remind users that checkout prices, taxes, account region, and platform rules can vary. That is a sound foundation.

The current implementation is not ready to be treated as legally closed, however. Four decisions require the owner's approval before code or production changes:

1. Whether to retain the current App Store HTML collection method while seeking permission, or reduce/pause it pending a lower-risk source.
2. Whether App Store-hosted artwork may remain in the public product UI, or must be replaced by assets with explicit website/editorial-use permission.
3. Whether the repository remains proprietary and all rights reserved, or receives a named open-source license.
4. Whether to publish the proposed legal/privacy/disclaimer copy changes on already indexed pages.

### Priority summary

| Priority | Finding | Recommended action |
| --- | --- | --- |
| P0 | App Store HTML and rendered-page collection conflicts with Apple's stated restrictions on automated scraping and can issue about 39 storefront requests per product without an inter-request delay. | Seek written permission or a licensed source. Until decided, do not increase frequency. Prepare a disableable rate-limit/cache/backoff patch for approval. |
| P0 | Five public locales (`zh-tw`, `fr`, `it`, `de`, `pt`) do not have localized About, Privacy, Terms, Data Sources, Guides, or Methodology routes, although localized footer links are generated. | Add complete localized legal/trust pages before promoting those locales broadly. Keep any indexation change separate and reversible. |
| P0 | All 18 currently cached product logos were downloaded from Apple's `mzstatic.com` artwork host, but the cache metadata does not record the rights basis or use restrictions. | Build an asset-rights inventory and replace or quarantine assets without explicit permission. Do not describe an asset as official merely because it is hosted by Apple. |
| P1 | The privacy implementation records anonymous ID, session ID, page/referrer, User-Agent-derived device type, product relations, and metadata, with raw-event retention defaulting to 180 days; the public privacy copy does not fully explain these facts. | Expand the privacy notice after owner approval and name the analytics processor, cookie purposes, retention periods, contact/controller, rights, and consent withdrawal path. |
| P1 | The site lacks a consistent global independence/no-affiliation statement covering Apple and listed product brands. | Add a concise disclaimer to legal/data-source surfaces, not as repetitive promotional copy on every price card. |
| P1 | The root repository has no `LICENSE` or third-party attribution inventory, while the UI says all rights reserved. | Owner must choose proprietary or a specific open-source license. Add a third-party notices/assets manifest in either case. |

## 1. App Store collection

### Current behavior

- The App Store collector requests regional `apps.apple.com/{storefront}/app/id...` pages for a default set of 39 commonly used storefronts, excluding mainland China and Hong Kong.
- The collector presents a desktop Chrome User-Agent rather than a transparent GeoSub collector identity.
- It may fall back to a rendered Chromium page.
- No explicit delay, bounded concurrency policy, exponential backoff, or per-host cache was found in the regional request loop.
- The collector job runner processes a small number of due jobs at a time, while the full price pipeline is scheduled daily. This limits job concurrency but does not limit requests inside one product run.
- The separate iTunes Search API is used for catalog lookup. That API is suitable for discovery metadata, but it does not supply in-app subscription prices.

### Source comparison

| Source | Intended capability | Subscription prices | Main constraint |
| --- | --- | --- | --- |
| Apple Search/Lookup API | Catalog metadata, links, artwork | No | Apple documents a call-rate guideline and caching expectation; artwork has promotional-use conditions. |
| App Store public HTML | Human-facing product/storefront pages | Sometimes exposed in page data | Apple's website and media-service terms restrict automated scraping/copying/monitoring. |
| Rendered App Store page | Browser-rendered fallback | Sometimes exposed | Same contractual concern as HTML, with greater resource load. |
| First-party product website | Product plans and official copy | Often, but country coverage varies | Must not be silently merged into the App Store ranking; source and tax semantics differ. |
| Licensed feed/written permission | Contractually authorized evidence | Depends on agreement | Preferred long-term route for an authoritative commercial database. |

### Risk assessment

Apple's website terms prohibit page-scraping, robots, and similar automatic access methods, and prohibit unreasonable load or misrepresentation. Apple Media Services terms separately restrict automated scraping, copying, measuring, analysis, and monitoring of services or content. The fact that an individual URL is not disallowed by `robots.txt` is not contractual permission.

The current collector therefore has material contractual risk. GeoSub's legitimate accuracy objective, low update frequency, and public-page sourcing reduce operational abuse concerns but do not remove the terms issue.

### Proposed reversible remediation

No collection code or timer was changed in this batch. After owner approval:

1. Keep catalog discovery on Apple's documented Search/Lookup API.
2. Add a per-host request budget, jittered delay, cache, conditional requests where supported, exponential backoff, and a hard stop on repeated errors.
3. Use an honest GeoSub User-Agent with a live contact/terms URL instead of browser impersonation.
4. Collect a product only when freshness, anomaly, or explicit operator demand requires it; do not increase global frequency.
5. Preserve evidence timestamps and source URLs, but avoid storing or republishing unnecessary source-page content.
6. Add a feature flag that can disable App Store HTML/rendered collection without disabling the rest of the pipeline.
7. Seek written permission or a licensed source before treating the pipeline as the permanent commercial foundation.

## 2. Product logos and third-party assets

### Current inventory

- `simple-icons` is installed and used as the local SVG fallback for a mapped set of AI and streaming brands. Its icon data is locally bundled, but each brand's trademark rights remain separate from the icon package's software/content license.
- When a cached product image is available, the product-logo API is preferred over the Simple Icons fallback.
- The product-logo cache stores image bytes and metadata outside the public repository.
- The audited local cache contained 18 product assets; every recorded source URL used Apple's `is1-ssl.mzstatic.com` host.
- Stored metadata includes slug, source URL, filename, media type, checksum, and storage date.
- Stored metadata does not include rights owner, license, permission basis, required attribution, permitted placement, or removal status.

Apple's Search API documentation treats retrieved artwork as promotional content and places conditions on its use, including association with the corresponding store content and approved store links/badges. The current general product-navigation and page-header placements do not consistently demonstrate those conditions.

### Required asset policy

Every public product asset should have an inventory record with:

- product slug and brand owner;
- exact source URL and retrieval date;
- source type: press kit, written permission, open-source library, App Store artwork, or manually supplied;
- license/permission text or reference;
- required attribution and placement restrictions;
- checksum and local storage path;
- review status: approved, restricted, replace, or removed;
- reviewer and review date.

Preferred source order:

1. Brand press kit or brand asset portal with explicit editorial/website-use terms.
2. Written permission from the brand owner.
3. An icon library, including the current Simple Icons fallback, only when both its content license and the relevant brand's trademark policy permit the intended use.
4. App Store artwork only when the exact placement complies with Apple's conditions.

Local hosting improves reliability but does not create usage rights. Existing App Store artwork should remain identifiable and replaceable until reviewed.

## 3. Positioning and public claims

### What is already sound

- Chinese and English About, Terms, Data Sources, and methodology copy generally frame GeoSub as a public price-reference and research service.
- Existing copy states that final checkout, tax, exchange rate, account region, and platform policy can change the result.
- Existing copy does not directly instruct users to bypass regional or platform controls.
- FAQ and price-detail warnings usually discourage treating the ranking as a guarantee of purchase eligibility.

### Remaining gaps

- There is no consistent global statement that GeoSub is independent and is not affiliated with, endorsed by, or sponsored by Apple or listed brands.
- Terms such as "cheapest", "lowest-price region", and localized equivalents appear frequently. They are valid factual ranking labels, but should be paired with the established eligibility/risk context instead of reading as purchase-circumvention advice.
- Phrases such as "official App Store pricing" can be read as describing the source, but should not imply that GeoSub itself is official.
- Public copy should never expose internal rule names, collection implementation details, confidence formulas, or operator instructions.

### Proposed positioning statement

Subject to owner/legal approval, legal and data-source pages should include a localized statement equivalent to:

> GeoSub is an independent price-transparency and research service. It is not affiliated with or endorsed by Apple or the brands listed on this site. Product names and trademarks belong to their respective owners. Prices are public references; availability and final charges are determined by the provider and checkout platform.

This should appear on the appropriate trust/legal surfaces. It should not be repeated mechanically in every card or heading.

## 4. Locale coverage

The application currently exposes 12 locales:

`zh`, `zh-tw`, `en`, `ja`, `ko`, `es`, `tr`, `ar`, `fr`, `it`, `de`, `pt`.

Localized legal/trust route coverage found in the repository:

| Locale group | About / Privacy / Terms / Data Sources / Guides / Methodology |
| --- | --- |
| `zh`, `en`, `ja`, `ko`, `es`, `tr`, `ar` | Present |
| `zh-tw`, `fr`, `it`, `de`, `pt` | Missing |

Because footer links are localized automatically, a supported language can currently point users toward a missing same-language trust route. This is both a user-trust and SEO-quality defect.

Recommended sequence after copy approval:

1. Create source-controlled canonical Chinese and English legal meaning.
2. Produce professional, natural translations for the five missing locales.
3. Verify that every footer/legal link returns 200 and stays in the selected locale.
4. Verify Arabic right-to-left layout and legal-page readability on mobile.
5. Add route-coverage tests so a locale cannot be promoted without its required trust pages.

## 5. Privacy and analytics

### Implemented controls

- Analytics consent is required before first-party event collection when configured.
- The consent UI supports accept, reject, withdrawal, and deletion of the anonymous-ID cookie.
- Event requests are size-limited, allowlisted, rate-limited, and tolerant of analytics-database failure.
- The analytics UI is excluded from administration and API routes.
- Raw event retention defaults to 180 days and is enforced by a scheduled cleanup task.

### Data currently handled

With consent, the event endpoint can store:

- anonymous UUID and optional session ID;
- event key/name, page path/title, referrer, locale, and placement;
- related product, plan, country, or article identifiers;
- button/source metadata;
- User-Agent and a derived device type;
- allowlisted event-specific JSON metadata.

The rate limiter stores a SHA-256 hash derived from the client IP for abuse prevention, with a separate short retention window.

### Disclosure gaps

The public privacy copy should explicitly state:

- the controller/operator identity and contact method;
- first-party cookies/local identifiers and their purposes/lifetimes;
- which data is collected before and after consent;
- use of Google Analytics/Tag Manager when configured, including processor links;
- raw-event retention (currently 180 days) and shorter rate-limit retention;
- the legal basis/consent model appropriate to target jurisdictions;
- withdrawal/deletion choices and applicable user rights;
- international processing/transfer information where applicable.

These are disclosure changes to indexed pages and therefore require owner approval before implementation.

## 6. Repository licensing

The repository does not currently contain a root `LICENSE`, while application footers state that rights are reserved. The frontend and backend packages are private and do not declare a package license.

The owner must choose one of these paths:

### Option A: Proprietary, all rights reserved (recommended for the current stage)

- Add a proprietary `LICENSE`/notice describing permitted access and prohibited reuse.
- Keep source, operational scripts, collected data, and editorial content under controlled terms.
- Add third-party notices and asset-rights manifests.

### Option B: Named open-source license

- Choose a specific license only after deciding whether commercial forks, hosted copies, and redistribution are acceptable.
- Keep collected data, trademarks, logos, credentials, and editorial content outside the software license where appropriate.
- Add explicit third-party notices and contribution terms.

No license should be inferred from public repository visibility. This audit does not select a license on the owner's behalf.

## 7. Release gates to add after approval

1. Legal-route coverage: every promoted locale must have working About, Privacy, Terms, Data Sources, and Methodology routes.
2. Asset provenance: every product logo must have an approved rights record; restricted assets fail release.
3. Collection safety: request budget, delay/backoff, cache, transparent identity, and emergency-disable tests.
4. Privacy consistency: consent behavior, cookie lifetimes, event fields, and documented retention must match code and environment defaults.
5. Positioning lint: public pages must not expose internal rule identifiers or claim affiliation/official status.
6. Link verification: all localized footer/legal links must return 200 without cross-locale fallback surprises.
7. Indexing scope: incomplete legal/content locales must not be promoted in sitemap/hreflang until their release gate passes.

## 8. Human decisions required

No production or indexed-copy change should begin until these decisions are recorded:

- **Collection:** continue current HTML collection while seeking permission, temporarily reduce/disable it, or replace it with an authorized source.
- **Artwork:** conditionally retain App Store artwork, replace it with permission-backed brand assets, or seek written permission.
- **License:** proprietary/all rights reserved or a named open-source license.
- **Legal copy:** approve creation of five missing locale legal suites and the privacy/independence wording changes.

## Primary references

- Apple Website Terms of Use: <https://www.apple.com/legal/internet-services/terms/site.html>
- Apple Media Services Terms and Conditions: <https://www.apple.com/legal/internet-services/itunes/ai/terms.html>
- Apple Search API Overview: <https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/>
- Apple Search API query guidance: <https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html>
- App Store marketing guidelines: <https://developer.apple.com/app-store/marketing/guidelines/>
- Apple rights and permissions: <https://www.apple.com/legal/contact/rights-permissions.html>
