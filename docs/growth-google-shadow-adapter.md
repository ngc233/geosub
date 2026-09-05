# Google Search Console growth shadow adapter

`geosub-backend/scripts/growth-google-shadow.mjs` is the Google counterpart to
the Bing shadow collector. It requests only Search Analytics `date` and `page`
dimensions with `type=web`, `dataState=final`, and a bounded row limit. Raw
queries and OAuth credentials are never written to the snapshot.

The date window is explicit so a report cannot silently move its comparison
cutoff:

```sh
GEOSUB_GOOGLE_TOKEN_FILE=/private/path/google-token.json \
GEOSUB_GOOGLE_START_DATE=2026-08-25 \
GEOSUB_GOOGLE_END_DATE=2026-08-31 \
GEOSUB_GOOGLE_OUTPUT_FILE=/private/path/google-shadow-snapshot.json \
npm run collect:growth:google
```

The adapter keeps `status: "partial"` and `settledThrough: null` until the
provider watermark and the seven-day reporting gate are verified. Search
Console may omit dates with no rows and may return only top rows, so page
details remain separate from site totals. The weekly report consumes the
snapshot with `--google-shadow`, preserving the `server_api` provenance.

## Scheduled collection and domain properties

Work type: Improvement; L3 operational setup (OAuth credentials and a new timer).
The operator needs fresh Google data without manually exporting files. This
change adds only the Google shadow collection path; prices, migration 056,
public pages, SEO experiments and Bing collection are outside this change.

Both `https://geosub.org/` and `sc-domain:geosub.org` are accepted. The snapshot
retains the exact requested property. Domain totals include subdomains and
protocols; selected page details retain public locale paths on geosub.org and
www.geosub.org only. Do not equate their sum with the domain total.

`run-growth-google-shadow.sh` refreshes OAuth credentials on every run. Its
default window is 28 Pacific calendar days ending three days before the current
Pacific date. This lag is not a settlement assertion. An explicitly supplied
window must provide both dates. `status=partial` and `settledThrough=null` remain
unchanged. Failure preserves the last successful snapshot; replacement uses a
temporary file and atomic rename within the output directory.

Production setup uses the approved Google OAuth desktop client, obtained by
loopback authorization with PKCE and only `webmasters.readonly`. The OAuth app
must be in production mode for sustained collection; Google testing-mode refresh
tokens for this scope expire after seven days. Store client ID, client secret and
refresh token in `/etc/geosub/geosub.env` (root:geosub 0640); do not store a
short-lived access token there. Enable with `GEOSUB_GROWTH_GOOGLE_ENABLED=true`
and set `GEOSUB_GOOGLE_SITE_URL=sc-domain:geosub.org`. Snapshots are mode 0600
under `/var/lib/geosub/growth`, owned by geosub.

After standard deployment of the reviewed commit, run the dedicated
`install-systemd-growth-google-shadow.sh`, start its service once, then start its
timer. The calendar timer runs daily at 02:30 UTC plus up to 20 minutes of jitter
and catches missed runs after downtime. Verify the service result, next timer
trigger, refresh-token API call and snapshot source/window/rows. A successful
first run does not establish multi-day continuity or automatically import data
into the growth dashboard.

Before editing production credentials, create a restricted backup of the env
file and record its path privately. Rollback: disable/stop the new Google timer
and service; restore only the previous Google environment keys from that backup,
preserving any unrelated changes made later. Preserve collected evidence. Use
the standard application rollback for the code commit if needed; no price-data
restore or migration is required for this change. OAuth access can separately be
revoked in the Google account if the integration is retired.

Acceptance: existing prefix contract remains valid; domain resource is passed
unchanged to Google; unrelated properties/hosts are rejected; the report parser
accepts both GeoSub properties; Pacific windows pass year/DST tests; a simulated
failed run leaves latest unchanged; real Google collection and production timer
execution are verified separately. No user-visible UI changes are included.
