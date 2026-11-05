# R2 U1 public style foundation

U1 adds an inactive, explicit `.gs-public-unified` boundary. No component calls
`usesUnifiedPublicStyle`; the function returns false for every path. U1 tests read
the four stylesheets directly from disk. U2 will import them exclusively from
`app/zh/layout.tsx`.

- `public-tokens.css`: generated colors, typography, spacing, radii and timing.
- `public-base.css`: font resources and scoped text, focus and control defaults.
- `public-components.css`: shared controls, cards, tables, tags and states.
- `public-motion.css`: the only transitions/keyframes and reduced-motion reset.

The reference is commit b7cec3232f36f425498a1a66f84554919d3d7a04. The original
14 stylesheets total 199,214 bytes. U3–U7 will add page rules to `public-components.css` as each
page migrates. Each addition requires the same CSS check and page screenshots.

Tokens are edited in `design-tokens.json`; retained dark/map values live in
`public-theme-compatibility.json`. The only timing values are 120, 200 and 400ms,
with one easing curve. Run from `ai-price-site`:

```sh
node scripts/public-design-tokens.cjs
node scripts/public-design-tokens.cjs --check
npm test
```

`--check` reads exactly the four U1 CSS files. Palette/scale literals are allowed
only in the generated token custom properties; style declarations must reference
tokens. The gate rejects literal colors/sizes, non-variable box shadows, scope
leaks, misplaced motion and hover resets to `none`. Explicit reduced-motion
guards remain permitted. Tests feed CSS fixtures to the parser and CLI, including
a failing cancellation followed by a passing repair. Browser tests render the
styles and exercise real hover, press, focus, reduced motion and isolation.

Fonts are the reference branch's Noto Sans SC 400/500/700 and IBM Plex Mono
400/600 web subsets. Their OFL licenses reside in `assets/fonts/`. Existing source
fonts and other languages' typography remain unchanged. Regenerating Noto subsets
uses the optional Python/fonttools authoring tool, not a new app dependency.

`formatPublicDate` returns a short Chinese label and a complete `dateTime` day,
or null when missing/invalid. Timestamps use Asia/Shanghai; recorded date-only
values retain their day. Existing page dates are not replaced in U1.
