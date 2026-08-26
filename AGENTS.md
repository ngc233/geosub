# GeoSub agent rules

These rules apply to the whole repository. More specific nested `AGENTS.md` files add requirements and do not replace these rules unless they explicitly say so.

## Required reading

Before changing any file, read:

1. `docs/WORKFLOW.md`
2. `docs/PRODUCT.md`
3. `docs/ENGINEERING_RULES.md`
4. The scope-specific documents listed in `docs/README.md`

For Next.js work under `ai-price-site`, also follow `ai-price-site/AGENTS.md` and read the relevant installed Next.js documentation before relying on remembered APIs.

## Classify before implementation

Classify the request by both work type and risk level using `docs/WORKFLOW.md`.

Work type is exactly one of: Bug, Improvement, Feature, or Architecture.

- Bug: fix the confirmed defect only. Do not redesign adjacent UI.
- Improvement: state the user problem, scope, invariants, and acceptance criteria.
- Feature: use a short task brief for L1, a lightweight PRD for L2, and a durable PRD for L3.
- Architecture: use a lightweight RFC for L2; L3 also requires migration and rollback plans.

If the request conflicts with an active policy or experiment, stop implementation and report the conflict. Do not silently override the policy.

## Scope control

- Do not change layouts, SEO, data models, design tokens, dependencies, cache policy, migrations, or deployment behavior outside the approved scope.
- Do not create a page-specific variant of an existing shared component without documenting why the shared component cannot satisfy the requirement.
- Preserve unrelated user changes and never clean or reset an unknown dirty worktree.
- Record adjacent issues separately unless they block a correct implementation.

## Product and data integrity

- Visible summaries, maps, tables, metadata, structured data, and reports must use the same canonical dataset and billing-platform scope.
- Never replace unavailable, stale, or unknown data with invented fallbacks.
- Do not present unverified payment, account-region, gift-card, tax, or purchase-success claims as facts.
- Do not multiply routes, locales, sitemap entries, or structured-data offers without the required quality gates.

## UI requirements

Every user-visible UI change must be verified, as applicable, in:

- Desktop light
- Desktop dark
- Mobile 390px light
- Mobile 390px dark

Also verify keyboard focus, touch access, overflow, loading, error, empty, expanded, and reduced-motion states that the component supports. Use semantic design tokens and existing components; do not add arbitrary colors or character-based operation icons.

## Verification language

Report evidence precisely:

- `verified`: the command or interaction actually ran and passed.
- `structurally checked`: source or file shape was inspected only.
- `not verified`: environment, browser, data, account, or production evidence is still missing.

Do not call code complete when the required browser, data, SEO, or production acceptance is outstanding.

## External and destructive actions

- Push, deployment, IndexNow submission, webmaster changes, production SQL, backfills, bulk content changes, and database restore require explicit user approval.
- A local implementation request does not authorize production mutation.
- Production deployment must use `docs/RELEASE.md` and the standard scripts.
- Never expose or commit environment files, private keys, database dumps, tokens, sessions, logs containing sensitive data, or generated admin URLs.

## Minimum completion gate

Follow the risk-based gates in `docs/WORKFLOW.md` and `docs/TESTING.md`. Do not run production-scale ceremony for L0/L1 work, but do not skip the focused tests and affected-state checks that prove the requested change.

One commit should solve one clearly described problem. Keep SEO experiments isolated and do not stack changes on their target pages during the observation window.
