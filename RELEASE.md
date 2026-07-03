# GeoSub release flow

This repository uses a simple project version in `VERSION`. The frontend and
backend package versions should match it.

## Local release sequence

1. Prepare or bump the version:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-release.ps1 -Bump patch
```

or:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-release.ps1 -Version 0.3.0
```

2. Run the release checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release-check.ps1
```

3. Publish to GitHub after checks pass:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish-release.ps1 -Remote origin -Branch main
```

The publish script commits, tags, and pushes. It does not decide the version by
itself; use `prepare-release.ps1` first.

## Server upgrade

After GitHub is updated, run this on the server:

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/upgrade.sh
```

The server upgrade script backs up the database, pulls the configured branch,
builds the frontend, applies SQL migrations, restarts services, and records the
deployed version under `/opt/geosub/releases`.
