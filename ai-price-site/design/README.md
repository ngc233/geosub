# Public design values

Refinement step 1 (2026-11-02): the owner's new review supersedes the uniform
8px rule for small elements. Cards and standard controls keep 8px; checkboxes,
tags and compact brand icons use 4px; flags use the specific 2px role. The
utility-name-wide rounded override is removed, with legacy component geometry
assigned by role. Public BrandIcon exposes only its existing size, with no
asset or fallback change. Other locales and admin retain their presentation.
The five reported transition:none rules were already reduce-only guards, not
normal-mode suppression. Their duplicate page guards are replaced by one
Chinese public reduced-motion guard, including the local component sheet.
The prescribed motion values are registered for subsequent step 3; this
checkpoint does not claim missing transitions or transition:all are fixed.
The owner's four-step review requires confirmation before starting step 2.

Final recovery pass (2026-11-02): all Chinese public paths, including unmatched
and unpublished 404s, now share the approved chrome. Publication and indexing
remain separate gates. A transparent Chinese segment scopes the shared recovery
card and retry boundary; snapshot/Codex-specific states keep precedence. There
is no ancestor loading boundary that could turn an existing 404 into a streamed
200. Search adds an accessible input name, contained keyboard focus, visible
loading, clear-empty and explicit retry states. Search results, endpoints and
all non-public-appearance behavior retain their existing contracts. Chinese
navigation progress uses the existing semantic accent without the legacy glow.
Other locales and admin keep their existing page and recovery templates.

Auxiliary rollout (2026-11-02): Chinese about, contact, privacy, terms and the
currency converter (including the six registered pairs) use scoped
`app/public-auxiliary.css` and the approved public controls. PublicTextarea is
the multiline form of the existing input, with the same field semantics.
Article copy, legal dates, metadata, original links and contact submission
logic stay authoritative. The Chinese converter view receives the original
computed values; parsing, rate age thresholds, source reads and calculations
are unchanged. Other locales retain their existing templates. Contact states
are verified through intercepted browser responses, never real submissions.
No tool index, unpublished category or new currency-pair URL is introduced.

Codex rollout (2026-11-02): Chinese `/zh/tools/codex-reset` uses the approved
11 color-v2 hierarchy, shared cards/tags/filters/evidence and existing native
event articles/details. PublicFilters gains only an optional accessible label;
its default price-filter label and rendering remain unchanged. Calendar tiles
describe first-recorded UTC dates, not effective times or account receipt.
Only completed automatic resets use lime; grants remain separate amber/dashed
records, and cancelled/withdrawn records never retain confirmed color. Counts
are limited to the loaded page and selected UTC month. Existing event facts,
reader, RSS, stable links and English template are retained. The two amber
palette entries are confined to Codex semantic uses: the v2 pale amber surface
and the original Codex component's brown text. They do not recolor price states.
The explicit local-only `/style-preview/codex-reset` contains labelled fixtures,
never a fallback for public data; it requires both loopback host and opt-in.

`design-tokens.json` starts from the approved R2 source at
`output/geosub-visual-review-r2-20261031/design-tokens.json`. On 2026-11-01 the
owner selected hero option B: Noto Sans SC 700, 44px desktop / 36px mobile,
tabular numerals. Only `fonts.hero` and `typography.priceHero.weight` supersede
that immutable reference. Table/data prices remain IBM Plex Mono 600.
Never sample values from the raster references or copy generated CSS back into it.

Run `npm run tokens:public` after editing a source, then
`npm run check:public-tokens`. Development and production builds check for drift.
`app/public-tokens.css` is generated; semantic names use `--gs-*`. Existing
`--color-*`, radius and font names are aliases for staged migration, not a second
set of component values.

The CSS applies only to `.gs-public-shell` and public portal/consent roots marked
`data-gs-public-surface`. Admin routes return outside that shell. Do not assign
these values to `:root`, `html`, `body`, the Tailwind global theme or admin scopes.
New public component styles must consume the semantic colors, typography,
radius and spacing variables rather than literal values.

`public-theme-compatibility.json` is a temporary inventory of existing dark/map
values and old effects. It preserves current rendering while the owner reviews
step 2. It is **not** an approved dark design or permission to retain those
effects in the step-3 components. The approved JSON declares only `mode: light`.
The local component sheet must show the dark mapping and both hero font options
for review before real page components are replaced. Do not change hero fonts,
remove the frame or roll components out during step 1.

See the owner's `output/geosub-前台样式统一开发指令-20261101.md` for the current
specification and the required confirmation after every step.

Step 2: start the local server with `GEOSUB_LOCAL_STYLE_PREVIEW=1` and open
`http://127.0.0.1:<port>/style-preview`. Without that flag, or with a non-loopback
Host, the page returns 404. It has noindex/nofollow metadata, no public links or
sitemap entry, and no analytics. Keep fixture values inside `PublicStyleReview`.
The preview uses CSS Modules for the new primitives. Only `SegmentedControl` has
an opt-in public appearance; its default appearance remains unchanged.
Both forced preview states and actual pointer/keyboard states are demonstrated.
The preview theme attribute has no effect outside `.gs-style-review`.
The shared resource stylesheet registers the same Noto files under the CSS alias
`GeoSub Review Noto Sans SC`, including a true 500 subset generated with
`scripts/subset-public-font.py --weights 500`. This prevents Next.js CSS merging
from changing font matching outside the approved rollout boundary; no font metadata or
approved font choice is changed.

Step 3 promotes that exact alias and the approved public primitives only inside
`.gs-public-unified` on `/zh/ai-pricing/chatgpt/plus` and explicitly marked public
overlay roots. `app/public-unified.css` holds the rollout boundary; other routes
retain legacy typography and controls. The Noto alias declarations are shared
resources, so CSS chunk merging cannot alter the other routes' font matching.

Step 4 begins with the Chinese homepage `/zh`, using `app/public-home.css` for
the approved home hierarchy. `lib/public-style-rollout.ts` is the explicit
allowlist shared by the chrome, header and consent banner. Other home locales
retain their existing layout. No loader, price computation, caching or SEO
changes accompany this component rollout.

Step 4 also promotes both Chinese category lists and their product overview
routes with `app/public-catalog.css`. The shared route predicate initially excluded plan
details (apart from the already reviewed Plus sample), other locales and admin.
Existing quote/plan facts remain in server HTML, with their explanation panels
using the reviewed evidence component. Original data loaders, canonical/SEO,
currencies, billing scopes and current/legacy plan selection stay intact.

On 2026-11-02 the owner approved the other Chinese plan details. The same R2
template and public controls now cover existing Chinese AI/streaming plan routes
(38 products, 93 existing plans; 89 linked from product overviews). This does not
add routes or promote legacy plans into navigation. Product-by-country routes,
other locales and admin remain outside this extension. Actual billing cycles
label the scope, columns and sharing card; weekly subscriptions omit the monthly
income comparison. No-US prices keep comparison filters disabled and the share
card explicitly states the missing US baseline. Data readers and SEO are unchanged.
The old adapter's formatted local quote always carries a monthly suffix. The
Chinese R2 display copy corrects that suffix for non-monthly plans using the
shared billing label helper. Amounts, currency, canonical DTOs and records are
untouched; all price views consume the same corrected display copy.

Product-country rollout (2026-11-02): `public-product-country.css` applies 06/06b
to the seven registered Chinese pairs and the owner-requested ChatGPT/Turkey
pair. Turkey uses the existing bilingual registration with no index approval;
robots remain noindex and it stays outside the sitemap. Existing English pairs
keep their old template. Regional cards show one selected monthly App Store
tier, its matching US reference and that tier's actual global maximum. The client
receives a small projection, not the full global region graph. CNY is an optional
display conversion with its own FX date; unavailable/expired CNY falls back to
the real USD quote. Stale-but-usable rates keep their warning. Formal quote FX
and display FX are distinct. The mobile summary follows the approved vertical
Plus layout to retain the confirmed 36px hero price at 390px. Evidence reuses
RegionEvidencePanel; country discovery adds only registered, data-backed pairs.
No price rules, tax rates, index approvals, SEO locks or route migrations change.

Snapshot rollout (2026-11-02): Chinese `price-records/[id]` composes the same
source/history cards, tags, evidence expansion and B price roles. Raw item names,
price strings, order, adopted flags, missing billing periods, UTC capture time
and checksum remain the canonical public snapshot values. The page carries no
live FX or currency conversion. Current plan and history links remain separate
from historical evidence. Items are rendered on the server; only the shared
checksum disclosure is interactive. The snapshot reader, 200-item cap, private
field allowlist, hash algorithm, noindex metadata and English template are
unchanged. Missing/publicly unavailable records use a scoped recovery layout.

Country rollout: `app/public-countries.css` applies only to the Chinese country
directory and the four already approved country hubs. The existing server data,
eligibility, freshness, FX and indexing logic remains authoritative. Client
controls filter/sort the same rows; unavailable FX or US comparisons stay unknown.
The country DTO carries no item-level tax profile, so the view points to the
existing real plan/source evidence instead of borrowing illustrated tax rates.
PublicEvidence's optional accessible label/responsive title preserve the DOM
of existing callers by default. History, data-source and English templates keep
their module aliases and original styles.

Guide rollout: `app/public-guides.css` and the existing collection/guide adapters
compose the approved public controls. The canonical CMS reads, core guide
publication/fallback rules, sanitized article body, metadata and stored schema
types remain unchanged. Directory filters operate on minimal display entries;
NEWS stays separate, METHODOLOGY is labelled 方法, other types keep their labels.
GuideArticleLayout caps prose at 720px, with a desktop contents rail and a
non-sticky, initially collapsed mobile contents panel. Dates and review records
are never invented. Existing technical timestamps are labelled as content-record
updates. This stage does not add live price blocks, news fact models or ads.

Source/history rollout: `app/public-evidence.css` composes the same public
controls. SourcesOverview consumes the existing four-country reader with its
unchanged eligibility/cache rules. Collection dates are distinct from unknown
job health and review status, and are shown in Asia/Singapore. HistoryExplorer
filters the original summary without rebuilding events: at most 100 changes and
12 recent public observations, with raw coverage kept separate. Missing period
identity is never inferred. The summary cannot establish a complete comparable
series; the view retains an explanation and original evidence instead of a
fabricated chart or historical FX. Existing UTC history dates remain explicit.
Canonical history SQL, snapshot rendering, indexing, other locales and admin
remain unchanged; there are no new public routes or dependencies.
