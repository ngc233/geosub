# GeoSub

GeoSub is a subscription price intelligence project. It includes a public pricing site, an internal admin system, backend SQL/scripts, and early-stage automated discovery and collection infrastructure.

## Repository Layout

- `ai-price-site/` - Next.js frontend and self-hosted admin console.
- `geosub-backend/` - database schema, SQL migrations, collector scripts, and Linux ARM deployment files.
- `PROJECT-HANDOFF.md` - current implementation status and next steps.

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

Create a local environment file:

```bash
cp .env.example .env
```

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

The project is in the "framework integration and stability hardening" phase. The automated discovery and collector pipeline has a working skeleton, but it still needs product-grade error handling, end-to-end test flows, and stronger generic pricing extraction.

