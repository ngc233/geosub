# GeoSub frontend

Next.js public site and self-hosted admin console for GeoSub.

## Local development

Install dependencies:

```bash
npm install
```

On Windows PowerShell, if `npm` is blocked by the execution policy, use
`npm.cmd` for the same commands.

Create the local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in `DATABASE_URL`. Optional integrations and tuning
variables are documented inline in `.env.example`; keep real secrets out of
Git. Validate the configuration before starting Next.js:

```bash
npm run check:local
```

Start the website:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

The committed `.env.example` is the source of truth for frontend environment
variables. `DATABASE_URL` is required. Directus, operational notifications,
cron authorization and runtime tuning are optional and remain disabled or use
documented defaults when left blank.

Product-quality enforcement is enabled by default, so sitemap inclusion and
page robots use the same reviewed decision. Set
`SEO_PRODUCT_QUALITY_GATE=observe` to keep weak pages visible to search while
auditing or rolling back the gate.

Plans classified as legacy renewal tiers remain accessible for existing
subscribers, but are always excluded from sitemap promotion and use
`noindex, follow` in every product-quality gate mode.

The full release gate generates the database-backed sitemap and enforces a
140 URL total budget, with separate limits for product plans, guide details,
and currency pairs.

Real `.env` files must stay out of Git.

## Checks

Code-only check:

```bash
npm run preflight:code
```

Full local check with database connectivity:

```bash
npm run preflight:full
```

If `preflight:full` fails at `check:local`, start PostgreSQL first or fix
`DATABASE_URL`. The code checks can still pass while the local database is down.

## Local PostgreSQL

The local Docker Compose file lives in `../geosub-backend/docker-compose.yml`.
After Docker Desktop or the Docker daemon is running:

```bash
npm run db:doctor
npm run db:up
npm run db:status
npm run check:local
```

`db:doctor` checks whether Docker is available. `db:up` starts only the local
PostgreSQL container. Directus can still be started from `../geosub-backend`
when needed.

## Database and migrations

The Prisma schema is in:

```text
prisma/schema.prisma
```

SQL migrations are in:

```text
prisma/migrations
```

Production upgrade applies migrations through the backend deployment scripts.
Do not edit old migration files after they have been applied on a server; add a
new migration instead.

## Admin entry points

Useful local admin URLs:

```text
/admin/system      runtime health
/admin/pipeline    product-level collection pipeline
/admin/discovery   lead intake
/admin/review      price observation review
/admin/prices      official price database
```

## Release checks

From repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release-check.ps1
```

The server upgrade path is documented in:

```text
../geosub-backend/deploy/linux-arm64/README.md
```
