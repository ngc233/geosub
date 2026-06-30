# GeoSub Linux ARM64 deployment plan

Target server: ARM64 Linux, 8 GB RAM, 6 vCPU.

The production deployment should not run collectors inside public page requests.
The website reads cached data from PostgreSQL. Collectors run in the background
on a timer and write observations into the database.

## Runtime layout

```text
Nginx / CDN
  -> geosub-web.service              Next.js public/admin site, port 3000

Docker Compose
  -> geosub-postgres                 PostgreSQL
  -> geosub-directus                 content/admin CMS

systemd timers
  -> geosub-price-pipeline.timer     price collectors + auto-review
  -> geosub-discovery-scan.timer     discovery source scanner
```

## Why browser rendering will not slow the website

Browser rendering is used only by the offline price collector.

The request path for visitors is:

```text
visitor -> Next.js -> PostgreSQL cached prices -> response
```

The collector path is:

```text
systemd timer -> collector -> Chromium if needed -> price_observations -> auto-review
```

These are separate processes. A visitor never waits for Chromium.

## ARM-specific decisions

- Do not depend on a Windows Chrome path.
- Use system Chromium on Linux ARM64, usually `/usr/bin/chromium`.
- Use `playwright-core`, not bundled Playwright browsers, so the server does not
  download a large browser package.
- Limit the collector service with `MemoryMax=1800M` and `CPUQuota=120%`.
- Run collectors once per day by default, not continuously.
- If App Store blocks a lightweight request, only then use Chromium rendering.

## Deployment order

1. Copy repositories to:

```text
/opt/geosub/geosub-backend
/opt/geosub/ai-price-site
```

2. Install server prerequisites:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/install-prereqs-ubuntu.sh
```

3. Create and review environment file:

```bash
sudo mkdir -p /etc/geosub
sudo cp /opt/geosub/geosub-backend/deploy/linux-arm64/env.example /etc/geosub/geosub.env
sudo nano /etc/geosub/geosub.env
```

4. Start database and Directus:

```bash
cd /opt/geosub/geosub-backend
sudo docker compose up -d
```

5. Initialize or migrate the application database:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/db-apply-sql.sh core
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/db-smoke-check.sh
```

Run content SQL only when you intentionally want to initialize Directus/content
data from repository SQL files:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/db-apply-sql.sh content
```

6. Install and start the Next.js service:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/install-web-service.sh
sudo systemctl start geosub-web.service
```

7. Install the price pipeline timer:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/install-systemd-price-pipeline.sh
sudo systemctl start geosub-price-pipeline.service
sudo systemctl start geosub-price-pipeline.timer
```

8. Install the collector job timer:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/install-systemd-collector-jobs.sh
sudo systemctl start geosub-collector-jobs.service
sudo systemctl start geosub-collector-jobs.timer
```

This runner consumes queued rows from `collector_jobs`. The admin button only
marks a task as due; this timer is what actually executes the collection work.

9. Install the discovery scanner timer:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/install-systemd-discovery-scan.sh
sudo systemctl start geosub-discovery-scan.service
sudo systemctl start geosub-discovery-scan.timer
```

## Useful checks

```bash
systemctl status geosub-web.service
systemctl status geosub-price-pipeline.timer
systemctl status geosub-collector-jobs.timer
systemctl status geosub-discovery-scan.timer
journalctl -u geosub-price-pipeline.service -n 200 --no-pager
journalctl -u geosub-collector-jobs.service -n 200 --no-pager
journalctl -u geosub-discovery-scan.service -n 200 --no-pager
docker ps
```

## Database backup and restore

Create a production backup before migrations, deployments, or manual data edits:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/db-backup.sh
```

Backups are written to `/opt/geosub/backups` by default. Each dump has a
matching `.sha256` checksum file.

Restore is intentionally explicit and destructive:

```bash
sudo systemctl stop geosub-web.service
sudo systemctl stop geosub-price-pipeline.timer
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/db-restore.sh /opt/geosub/backups/geosub_app_YYYYMMDDTHHMMSSZ.dump DROP_AND_RESTORE
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/db-smoke-check.sh
sudo systemctl start geosub-web.service
sudo systemctl start geosub-price-pipeline.timer
```

Never restore over a production database without first taking a fresh backup.

## Upgrade without redeploying from scratch

After the first deployment, routine updates should use the upgrade script
instead of reinstalling the server:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/upgrade.sh
```

The upgrade script performs the production-safe sequence:

1. Stop web and background timers.
2. Create a database backup.
3. Pull the latest backend and frontend code from the configured Git branch.
4. Install Node dependencies.
5. Build the Next.js frontend.
6. Apply core database migrations.
7. Refresh systemd unit files.
8. Run a database smoke check.
9. Restart the web service and timers.

Environment controls in `/etc/geosub/geosub.env`:

```text
GEOSUB_GIT_BRANCH=main
GEOSUB_SKIP_GIT_PULL=false
GEOSUB_RUN_CONTENT_MIGRATIONS=false
```

Use `GEOSUB_SKIP_GIT_PULL=true` only when you have already copied the newest
files to the server and want the script to rebuild, migrate, and restart from
the local filesystem state.

Keep `GEOSUB_RUN_CONTENT_MIGRATIONS=false` for normal app upgrades. Set it to
`true` only when you intentionally want to apply repository content seed SQL.

## Migration behavior

`db-apply-sql.sh` records applied SQL files in:

```text
geosub_schema_migrations
```

If an already-applied SQL file changes checksum, the script stops instead of
silently re-running it. This is intentional: production data changes should be
made with a new SQL file, not by editing an old migration.

## Current collector behavior

- App Store: plan-level prices. Uses lightweight HTML first, Chromium fallback second.
- Web: official US web baseline price.
- Google Play: public page evidence only. It does not expose plan-level prices,
  so it is stored as ignored evidence and is not eligible for auto-approval.
- Auto-review: V1 promotes App Store observations after the latest 3 samples
  for the same product, plan, country, platform, and price type have the same
  local `raw_price + currency`. The collector job runner triggers this review
  automatically after successful App Store collection. Strict multi-source
  review remains optional for later.
- Discovery center: new products and model/service leads go into
  `product_discovery_candidates` first. They are reviewed in `/admin/discovery`
  before becoming formal `products`.
- Discovery scanner: active rows in `discovery_sources` are checked on a timer.
  The first version stores page title, summary, content hash, and change status
  in `discovery_source_checks`.

## Nginx note

Put Nginx or a managed reverse proxy in front of `127.0.0.1:3000`.

The Next.js service intentionally binds to localhost. Public traffic should go
through the reverse proxy, where gzip/brotli, TLS, cache headers, and rate
limits belong.
