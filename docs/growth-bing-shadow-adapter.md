# Bing growth shadow adapter

`geosub-backend/scripts/growth-bing-shadow.mjs` is a read-only adapter for the
GeoSub growth evidence pipeline. It refreshes no production state and writes a
single provider snapshot with daily traffic totals, page aggregates, and a
query row count. Raw query text and OAuth credentials are never written to the
snapshot.

Run it locally with a private token file:

```sh
GEOSUB_BING_TOKEN_FILE=/private/path/bing-token.json \
GEOSUB_BING_OUTPUT_FILE=/private/path/bing-shadow-snapshot.json \
npm run collect:growth:bing
```

The snapshot is deliberately `partial` until the provider settlement contract
and the current REST endpoint are verified. The currently verified endpoint is
the legacy JSON service, which Bing has announced for retirement; production
deployment is shadow-only until that migration and settlement gate is closed.

The weekly report CLI can consume this snapshot directly. It converts the
provider envelope to `growth-search-evidence.v1` and labels the source
`method: "server_api"`, so a server-collected snapshot is never presented as a
browser observation:

```sh
node --experimental-strip-types scripts/report-growth-weekly.mts \
  --evidence /private/path/google-evidence.json \
  --bing-shadow /private/path/bing-shadow-snapshot.json \
  --end 2026-08-31 \
  --first-party /private/path/first-party-evidence.json \
  --out /private/path/GeoSub-Growth-Weekly-2026-08-31
```

The report cutoff remains explicit. A newer provider snapshot may contain later
observations, but it does not move the report's requested comparison window.
