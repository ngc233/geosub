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
