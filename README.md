# GeoSub

GeoSub is a subscription price intelligence project. It includes a public pricing site, an internal admin system, backend SQL/scripts, and early-stage automated discovery and collection infrastructure.

## Repository Layout

- `ai-price-site/` - Next.js frontend and self-hosted admin console.
- `geosub-backend/` - database schema, SQL migrations, collector scripts, and Linux ARM deployment files.
- `PROJECT-HANDOFF.md` - current implementation status and next steps.
- `ROADMAP-1.0.md` - local 1.0 launch-readiness checklist.

## What Is Not Committed

The repository intentionally excludes:

- real `.env` files
- database dumps
- `node_modules`
- `.next`
- local PostgreSQL data directories
- logs, uploads, backups, and temporary files

Use the `.env.example` files as templates and keep real secrets outside GitHub.

## Local Development

Install dependencies:

```bash
cd ai-price-site
npm install
```

Create a local environment file, then fill in at least `DATABASE_URL`:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

If you use the repository PostgreSQL container, also copy
`../geosub-backend/.env.example` to `../geosub-backend/.env`, choose matching database
credentials in both files, then run:

```bash
npm run db:doctor
npm run db:up
npm run db:migrate
npm run check:local
```

`check:local` reports missing configuration and database connectivity problems
before the website is started.

Start the web app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Database

Database data is not stored in Git. Use a private dump or backup artifact when moving between machines.

## Current Status

GeoSub is in product hardening and controlled-growth development. The public
price comparison experience, internal admin workflow, collection pipeline,
data-quality checks, multilingual routing, SEO controls, and self-hosted
operations are implemented. Current work focuses on data authority, rights
governance, collector resilience, content quality, performance, and release
gates rather than adding isolated features without validation.

## Rights and licensing

GeoSub-owned code and original content are proprietary and all rights are
reserved. See [LICENSE](LICENSE) for the repository terms,
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and trademark
boundaries, and
[docs/product-brand-asset-register.md](docs/product-brand-asset-register.md)
for the logo and brand-asset publication policy.

