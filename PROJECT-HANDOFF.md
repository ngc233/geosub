# GeoSub Project Handoff

> 2026-08-22 更新：如需重装 Windows 或在全新机器继续，请优先阅读
> `SYSTEM-REINSTALL-HANDOFF-2026-08-22.md`。该文件记录当前 GitHub/生产提交、
> 私密资料备份清单、从零恢复步骤和可直接复制的新任务提示词。本文件保留更完整的
> 历史技术背景。

Updated: 2026-08-21 (Asia/Singapore)

This file is the source of truth for continuing GeoSub in a new Codex task or
on another development machine. Read it before changing code, running database
backfills, pushing GitHub, or deploying production.

## 1. Executive Summary

GeoSub is a global digital-subscription price intelligence product. It compares
reviewed regional subscription prices and explains exchange rates, taxes,
freshness, purchasing power and subscription conditions.

The operating priorities are fixed in this order:

1. Data authority: every public price, source, exchange rate, tax note and
   review date must be explainable and traceable.
2. Search growth: promote complete, useful pages instead of multiplying thin
   routes or sitemap entries.
3. Conversion: help visitors move from a search answer to a plan comparison,
   another useful GeoSub page or the official product source.

The current application version is `2.9.0`. The local hardening work described
below is complete and verified and is preserved by the commit containing this
handoff. It has not been pushed to GitHub and has not been deployed to the
production server.

## 2. Mandatory Checkout Boundary

Continue only in this checkout:

```text
C:\Users\lanad\Documents\Codex\2026-06-30\ngc233-geosub-https-github-com-ngc233\geosub-production-baseline
```

Primary frontend directory:

```text
C:\Users\lanad\Documents\Codex\2026-06-30\ngc233-geosub-https-github-com-ngc233\geosub-production-baseline\ai-price-site
```

Do not continue in the sibling `geosub` checkout. It contains older and dirty
UI work and is not the verified production baseline. Do not copy files between
the two trees unless a specific diff has first been reviewed.

The private backup is not a source checkout. It contains environment material
and physical PostgreSQL data. Never copy `.env`, credentials, `postgres-data`,
database volumes, logs, `.next` or `node_modules` into Git or portable archives.

## 3. Git State

```text
Remote:  https://github.com/ngc233/geosub.git
Branch:  codex/v2.9-hardening
Base:    f00b2c8cea02a53c8f7c2054ac8d1662fdea759b
Release code: f24783d (`fix(seo): improve crawlability and metadata quality`)
Version: 2.9.0
```

The base commit matches `origin/main` and
`codex/production-framework-optimization`. The release candidate is the bounded
commit containing this handoff. Do not reset, rebase or clean the tree before
confirming the branch, commit and working-tree status.

Before doing anything in a new task, run:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
```

Expected branch: `codex/v2.9-hardening`.

## 4. Release Candidate Work

### 4.1 Stored-content and JSON-LD safety

- Added `lib/content-safety.ts` and `sanitizeArticleHtml()`.
- Added `lib/json-ld.ts` and `serializeJsonLd()`.
- Article previews, public CMS guide bodies and JSON-LD injection points now
  pass through shared safety helpers.
- External links are hardened and executable or unsafe stored markup is
  removed.
- Added focused security regression tests.

Never restore direct article HTML or JSON-LD string interpolation into
`dangerouslySetInnerHTML`.

### 4.2 Production sitemap failure policy

- `app/sitemap.ts` is dynamic and fails closed in production when database
  route generation fails.
- Development may retain a safe fallback so local UI work is not blocked.
- The ARM64 post-deploy check validates sitemap size and known dynamic pricing
  routes instead of accepting a small static-only sitemap.
- Added `app/sitemap-failure-policy.test.mts`.

Do not turn production sitemap errors back into silent partial success.

### 4.3 Brand icon bundle control

- `BrandIcon.tsx` uses explicit mapped Simple Icons imports rather than a
  namespace import of the entire library.
- Main product identity can load eagerly; ordinary list icons remain lazy.
- Local rights-reviewed assets and deterministic fallbacks remain the public
  policy.

Do not reintroduce `import * as icons from "simple-icons"`.

### 4.4 Database read-model and DTO reduction

- Homepage evidence is loaded through a dedicated aggregate query instead of
  sending complete product-plan-region graphs where only totals are needed.
- Pricing list and homepage records use compact data shapes.
- Real PostgreSQL enum values are lowercase. The homepage query was corrected
  to use mapped values such as `published`, `ai` and `streaming`.
- A regression test now protects that enum mapping.

The real local database currently contains approximately:

```text
40 products
97 plans
2697 region_prices
2693 valid published aggregate rows
```

The homepage aggregate returned 36 products, 39 regions and 2693 reviewed
prices. `EXPLAIN ANALYZE` measured about 1.8 ms execution at this scale, so no
new index was justified.

### 4.5 Exchange-rate behavior

- Public conversion paths distinguish unavailable or stale data from a valid
  rate.
- Missing or expired exchange rates must not silently create conversions.
- Localized pages degrade with an honest availability message instead of a
  hardcoded estimate.

Do not add fixed fallback exchange rates to make a selector appear available.

### 4.6 Pricing-detail client boundary

- `BrandIcon` now receives only the small identity fields it renders.
- `SharePriceModal` receives a compact `SharePriceProduct` instead of the full
  subscription product graph.
- The share modal is instantiated inside the existing pricing client boundary.
- `PricingPlatformView` no longer receives a prebuilt React-node share action.

This reduced the decompressed ChatGPT Plus response from about 1,077,272 bytes
to 944,999 bytes, a reduction of about 12.3%. Actual compressed transfer was
about 61.7 KB, so further aggressive component splitting is not recommended
without a measured user-facing problem.

### 4.7 Dependency changes

`sanitize-html` and `@types/sanitize-html` were added. `package-lock.json` has a
large diff because dependencies were re-resolved on Windows. Do not discard
the lockfile mechanically; first verify that it still matches `package.json`
with `npm ci` and the full gates.

### 4.8 Search crawlability and metadata quality

- Collapsed regional price and affordability rows now remain in server HTML
  behind native disclosure controls, using compact semantic summary rows rather
  than duplicating the full interactive row UI.
- The measured ChatGPT Plus response is about 441 KB decompressed and 44.9 KB
  gzip locally, while all 39 regional prices remain present in server HTML.
- Dataset JSON-LD no longer assigns a WebSite node to the Dataset `isPartOf`
  field. No data-reuse license was invented because the current terms do not
  grant one.
- Short static descriptions were expanded where the visible page supports the
  added detail. Known older CMS guide descriptions now fall back to the reviewed
  baseline without overriding genuinely edited CMS copy.
- Chinese and English pricing lists now link directly to every product overview,
  giving crawlers and visitors a clear list -> product -> plan path.
- No webmaster settings, indexing requests, sitemap submissions or production
  data were changed as part of this work.

## 5. Release Candidate Inventory

The release-candidate areas include:

- Public article and guide rendering.
- Root JSON-LD rendering.
- Dynamic sitemap generation and release probes.
- Homepage database evidence.
- Pricing-list and pricing-detail compact DTOs.
- Brand icons.
- Currency-converter and exchange-rate availability copy.
- Share-price modal ownership.
- Security, sitemap, homepage, detail, list, logo and exchange-rate tests.
- `package.json` and `package-lock.json`.

New source files added by the release candidate:

```text
ai-price-site/app/sitemap-failure-policy.test.mts
ai-price-site/lib/content-safety.test.mts
ai-price-site/lib/content-safety.ts
ai-price-site/lib/json-ld.ts
```

Use `git status --short` for the authoritative current state. Do not assume a
clean tree after later work.

## 6. Verification Completed

The latest complete verification on 2026-08-21 produced:

- `npm test`: 492 tests passed, 0 failed.
- `npm ci` with Node 22.23.2: passed against the committed lockfile.
- `npx prisma generate`: passed with Prisma Client 7.9.1.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- Webpack production build: passed, including 140 generated pages.
- `git diff --check`: passed; only expected Windows LF-to-CRLF notices were
  printed for several test files.
- Real PostgreSQL query plan: about 1.8 ms execution, no index added.
- Browser regression: desktop and 390 x 844 mobile passed.
- No horizontal overflow on the checked homepage or ChatGPT Plus detail page.
- No broken images in the visible checked states.
- Share-price modal opened and closed correctly; PNG and social actions were
  present.
- No new console errors were recorded for the production build on port 3010.
- `npm run preflight:full` passed under Node 22.23.2 against the healthy local
  PostgreSQL database after the SEO crawlability batch.
- Sitemap budget passed at 146/148 URLs with zero duplicate URLs and zero staged
  locale URLs.
- Desktop 1280 x 720 and mobile 390 x 844 checks passed for the final pricing
  detail build, with no horizontal overflow or console errors.
- Admin dashboard cold reads were about 134-165 ms and cached reads were 0-1
  ms; the measured navigation query plan was about 0.13 ms, so no speculative
  query or index change was made.

Measured warm production responses were approximately:

| Route | Response time | Compressed transfer |
| --- | ---: | ---: |
| `/zh` | 0.08 s | 75.5 KB |
| `/zh/ai-pricing` | 0.04 s | 20.4 KB |
| `/zh/ai-pricing/chatgpt` | 0.04 s | 32.8 KB |
| `/zh/ai-pricing/chatgpt/plus` | 0.08-0.10 s | 61.7 KB |

These are local measurements, not production latency guarantees.

## 7. Current Local Runtime

The verified production build is currently available at:

```text
http://127.0.0.1:3010/zh
```

At the time of this handoff it returned HTTP 200 in about 0.03 seconds.

Port `3000` belongs to an older development process and currently returns HTTP
500. Do not use port 3000 as evidence that the verified release candidate is
broken. A new task should either keep using 3010 or deliberately stop the old
process before starting a fresh development server. Do not kill an unknown
process without first identifying it.

Local Docker PostgreSQL and Directus were healthy during the database-backed
verification. Recheck them rather than assuming they remain running after a
restart.

Useful checks:

```powershell
npm.cmd run db:status
npm.cmd run db:doctor
curl.exe -I http://127.0.0.1:3010/zh
```

## 8. Database and Migration Boundary

Required schema and Prisma migration checks passed. Ten older content
backfills remain pending. They were intentionally not applied during this
performance/security batch because they are unrelated content mutations.

Do not run `db:backfill`, migration repair, production SQL or bulk content
updates merely to make the status look clean. First inspect the manifest and
explain the exact records and effects to the user. Production data changes need
separate explicit approval and a verified backup.

Never point local destructive or test commands at production. Database-backed
E2E helpers require an explicitly isolated local database.

## 9. Production and SEO Boundary

This batch has not:

- pushed GitHub;
- changed `origin/main`;
- deployed the production server;
- modified production PostgreSQL;
- changed Search Console or Bing settings;
- requested indexing or validation;
- changed public URL structures, canonical rules or locale promotion policy.

GeoSub's staged locales remain accessible while indexing promotion is governed
by the existing editorial-completeness policy. Do not mechanically add every
language-plan combination to the sitemap.

## 10. Known Open Work

Recommended order for the next development window:

1. Reconfirm the exact branch, release-candidate commit, working-tree status and
   local database health.
2. Collect production-like admin samples when meaningful event and daily-stat
   data exist. Optimize only a proven slow query.
3. Run `npm run preflight:code` after any new code change.
4. Run `npm run preflight:full` only with the real local database healthy.
5. Repeat desktop/mobile browser regression before any push.
6. Push GitHub only after the user explicitly approves it.
7. Deploy production only after a pushed commit, verified backup and release
   gate, and only with separate explicit approval.

Do not continue shrinking the public pricing-detail payload just because the
decompressed HTML number looks large. The measured compressed transfer and
latency are already reasonable; the next likely performance opportunity is
admin query behavior, not public-page component surgery.

## 11. Standard Local Commands

From `ai-price-site` on Windows:

```powershell
npm.cmd ci
npx.cmd prisma generate
npm.cmd run db:doctor
npm.cmd run db:up
npm.cmd run db:migrate
npm.cmd run check:local
npm.cmd run dev
```

On macOS use `npm`, `npx` and the same script names.

Fast code gates:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Full gates:

```powershell
npm.cmd run preflight:code
npm.cmd run preflight:full
```

If dependency installation hits Windows npm-cache permission errors, retry with
a project-local cache. If Prisma suddenly produces hundreds of type errors,
regenerate the Prisma client before treating them as real regressions.

## 12. macOS Continuation

Required tools:

- Git
- Node.js 22 LTS (`>=22 <23`)
- Docker Desktop

Prefer cloning the committed GitHub state and then transferring a private patch
or bundle for any uncommitted work. Do not assume Codex chat history itself can
be imported reliably between Windows and macOS; this document is the portable
continuity mechanism.

Create local environment files from examples and use local-only credentials:

```bash
cp geosub-backend/.env.example geosub-backend/.env
cp ai-price-site/.env.example ai-price-site/.env
cd ai-price-site
npm ci
npx prisma generate
npm run db:doctor
npm run db:up
npm run db:migrate
npm run check:local
npm run dev
```

Transfer development data only as a private PostgreSQL dump and restore it into
the local Docker database. Never place the dump in Git.

## 13. Recommended Prompt for the New Codex Window

```text
Continue GeoSub from geosub-production-baseline/PROJECT-HANDOFF.md. Work only in
the geosub-production-baseline checkout and preserve the release-candidate
commit. First verify branch codex/v2.9-hardening, git log -1, git status,
Node 22, Docker/PostgreSQL health, and the local production page on port 3010.
Do not push GitHub, deploy production, apply the 10 pending content backfills,
or change SEO/indexing settings without my explicit approval. Then inspect the
release-candidate commit and continue with measured admin performance work in the
recommended order. Keep a browser-verifiable local URL available and report
desktop/mobile validation after each user-visible change.
```
