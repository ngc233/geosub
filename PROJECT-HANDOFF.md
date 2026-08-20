# GeoSub Project Handoff

Updated: 2026-08-20

## Product Direction

GeoSub is a subscription price intelligence product. Its operating priorities
are, in order:

1. Data authority: prices, sources, exchange rates, tax notes and review dates
   must be explainable and traceable.
2. Search growth: index only useful, complete pages and build demand around
   real subscription questions.
3. Conversion: help visitors move from a search answer to a plan comparison,
   official source or another useful GeoSub page.

The public site and admin console share one Next.js application. PostgreSQL,
Prisma, collection scripts and production deployment assets live in the same
repository, but real environment files and database contents are deliberately
excluded from Git.

## Current Release Candidate

Version: `2.9.0`

The current local candidate includes:

- A desktop and mobile regional-price table with a compact sticky lookup bar,
  localized region search, evidence-backed filters, synchronized currency
  controls and comparison for up to three regions.
- Expandable evidence covering listed price, converted price, reference
  difference, tax confidence, collection date, exchange-rate date, official
  source and known subscription conditions.
- A Chinese homepage built around GeoSub's own promise: explain the real local
  cost behind a subscription price. Its map uses live published product data,
  collision-safe compact labels and product switching without changing public
  pricing URLs or the database model.
- A twice-daily Windows exchange-rate task aligned with the price-page
  freshness policy.

The latest detailed release history is in `CHANGELOG.md`.

## Repository Layout

- `ai-price-site/`: Next.js public site, admin console, Prisma schema, tests and
  frontend scripts.
- `geosub-backend/`: PostgreSQL, collectors, scheduled jobs and Linux ARM64
  deployment assets.
- `docs/`: product, SEO, data-quality and release documentation.
- `scripts/`: repository release checks.

## Continue Development on macOS

Install these prerequisites first:

- Git
- Node.js 22 LTS
- Docker Desktop

Then either clone GitHub or extract the source archive generated with this
release. From the repository root:

```bash
cp geosub-backend/.env.example geosub-backend/.env
cp ai-price-site/.env.example ai-price-site/.env
```

Choose matching local PostgreSQL credentials in both files. Do not copy
production secrets into the development environment.

```bash
cd ai-price-site
npm ci
npm run db:doctor
npm run db:up
npm run db:migrate
npm run check:local
npm run dev
```

Open `http://localhost:3000/zh` and `http://localhost:3000/admin`.

If the existing Windows development data is required, transfer a private
PostgreSQL dump separately and restore it only into the local Docker database.
The source archive intentionally contains no database dump, `.env`, `.next`,
`node_modules`, logs or credentials.

## Verification Baseline

Before this handoff:

- TypeScript passed.
- ESLint passed.
- All 485 frontend tests passed.
- The Chinese homepage was checked in a real browser at 1280x720 and 390x844.
- No page-level horizontal overflow or browser console warnings/errors were
  found in the checked homepage states.
- The backend dependency audit reports zero vulnerabilities. The frontend
  audit reports three high-severity advisories through Prisma's
  `@prisma/config -> deepmerge-ts` chain. npm only offers a forced breaking
  Prisma downgrade, so this release does not apply `npm audit fix --force`;
  re-evaluate the advisory when Prisma publishes a compatible dependency fix.

Run the code gate on macOS after installing dependencies:

```bash
cd ai-price-site
npm run preflight:code
```

Run the database-backed gate only after the local PostgreSQL container and
environment are ready:

```bash
npm run preflight:full
```

## Release Boundary

This handoff covers source synchronization and a portable development archive.
It does not deploy production, transfer the production database, rotate
credentials or change Search Console settings.

## Recommended Next Prompt

```text
Continue GeoSub from PROJECT-HANDOFF.md. First verify Node 22, Docker, the local
environment and PostgreSQL on this Mac. Start the local site, check /zh and one
AI detail page at desktop and mobile widths, then report the exact current Git
commit and any platform-specific problems before making new product changes.
```
