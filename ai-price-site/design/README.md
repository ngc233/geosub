# V1 inactive public design foundation

Scope: V2 taskbook sections 2–4 and V1 acceptance; canvas boards 1, 2 and 13.
Base: `ed3ec9bb42ef9ca210b70384e64e29c5bfc45fbe` (main, including U1).
Classification: Architecture / L2. This document records the small design decision;
product behavior and data contracts remain those of the approved taskbook.

## Choice and boundaries

Retain U1's `.gs-public-unified` boundary and four-file architecture. Rewrite the
inactive palette, typography and motion tokens; preserve shared primitives and
`formatPublicDate`. No production layout imports these files and no production
component calls `usesUnifiedPublicStyle` (which still returns false everywhere).
The sample is a separate Next application under `design/preview`, not a route in
the production app. It has no database connection and is bound to loopback.
Its own app/zh/page.tsx provides /zh only in that separate app. Startup requires
GEOSUB_V1_SAMPLE=1 and next dev; production build/start always throw, even with
the flag enabled. The main app does not read this flag or import the sample.
V2 will introduce the Chinese framework with the explicit Plus-page exception;
V3–V7 own page-specific rules. Data queries, SEO, dependencies and lockfile do not
change here. Old U2 work is retained outside this branch and is not imported.
Rollback before activation: revert V1; no data or routing migration is necessary.

## Foundation API

- Edit `design-tokens.json` / `public-theme-compatibility.json`, then regenerate
  `public-tokens.css`. Dark colors follow system preference only.
- `public-base.css`: Chinese system fonts, numeric roles, focus and touch defaults.
- `public-components.css`: U1 shared controls, cards, tables, tags and states.
- `public-motion.css`: feedback 120ms, switches 220ms, data 480ms, entry 320ms /
  stagger 40ms, pulse 1200ms × 2; one cubic-bezier(0.2, 0.8, 0.2, 1). The 4500ms
  carousel token is reserved for V3. Reduced motion completes immediately.
- `PublicIcon`: named Lucide icons, stroke 1.75, sizes 16/20/24, currentColor;
  decorative by default, optional label for a semantic icon.
- `PublicPriceNumber`: already-converted numeric input, SSR final text. Only a
  changed `changeKey` from a user action rolls the value; passive refresh snaps.
  Invalid input renders nothing. No exchange-rate or substitute-value logic.
- Entry replay changes animation-name on retained DOM nodes. Use viewport entry
  once; no price opacity animation. Height transitions retain the content node.

## Font provenance

Self-hosted `@fontsource/inter-tight` 5.3.0 Latin normal 600 (22,660 bytes) and
700 (22,748 bytes): 45,408 bytes total, below the 50,000-byte budget. Source:
https://registry.npmjs.org/@fontsource/inter-tight/-/inter-tight-5.3.0.tgz
The archive's npm SHA-512 integrity was verified; the unmodified files and OFL
license are in `assets/fonts`. CSS declares Latin unicode-range, swap and
`tabular-nums`. No Google Fonts request. Noto/IBM font-face declarations are gone;
old asset files are retained because deleting historical assets is outside V1.

## Local verification

Run from `ai-price-site` with Node 22:

```sh
node scripts/public-design-tokens.cjs
node scripts/public-design-tokens.cjs --check
npm test
npm run typecheck
npm run lint
npx playwright test --config playwright.foundation.config.ts
GEOSUB_V1_SAMPLE=1 node node_modules/next/dist/bin/next dev design/preview --webpack --hostname 127.0.0.1 --port 3140
```

Open `http://127.0.0.1:3140/zh`. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed
Chrome instead of Playwright's bundled Chromium. No database is needed for these
browser tests. Production-build verification must use local test data only.

The CSS gate still checks exactly four public stylesheets. It rejects literal
colors/font sizes, non-variable shadows, scope leaks, misplaced motion/transforms,
hover resets and main-text-colored backgrounds except buttons/tags. Executable
fixtures verify cancellation failure. No component stylesheet is added in V1.
`postcss` remains an indirect dependency pinned by the existing override/lockfile;
this works with today's install but is not a stable direct-dependency contract.
Declare it directly and update the lockfile in the separately approved follow-up.

Screenshots, short recordings, font/contrast measurements and logs stay outside
Git. The approved contrast policy has three categories, without changing colors:
text >=4.5:1 (low/subtle is forbidden); standalone cheap points/lines >=3:1 using
bar-low on surface (white in light mode); redundant decoration only via the
reasoned CONTRAST_ALLOWLIST in the checker. Nav/selection state, adjacent numbers,
progress values, labelled pulse rings and labelled emphasis borders have separate
role/token/support entries. Unknown roles or absent supporting evidence fail.
The usage-policy check is not a CSS cascade/DOM audit: future page integrations
must verify the declared adjacent text/state actually exists in browser tests.

The six earlier failures classify as: low/subtle = text, forbidden;
graphic/page, graphic/surface, graphic/subtle = redundant decoration only;
bar-low/page and bar-low/subtle = standalone graphics, forbidden (use surface).
A numbered bar/progress bar may separately use category 3 only with its explicit
allowlisted role and supporting value; color alone never grants an exemption.
