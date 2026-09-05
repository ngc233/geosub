# Live search sources in the growth dashboard

Improvement, L3 when deployed. The growth dashboard previously ignored the daily
Google/Bing snapshot files and kept showing imported page subsets or code
baselines. Operators could not tell whether automatic collection was working.

The server-only overview now reads the fixed Google/Bing latest filenames from
GEOSUB_GROWTH_OUTPUT_DIR (default /var/lib/geosub/growth) on each request. No
provider call, token, raw query, production SQL write or import is performed in
the request. Files are bounded to 4 MiB and pass the existing strict snapshot
contracts before contributing data. Missing/unreadable/invalid data falls back
to the existing manual import or historical baseline with explicit labels;
errors never expose filesystem paths or exception details.

Valid snapshots take precedence, including stale ones. Collection age over 48
hours is stale, independently of the source reporting dates. Future collection
timestamps beyond five minutes, empty daily data, duplicates and extra sensitive
fields are rejected. Missing daily dates are counted, not filled with zeros.

The overview v1 source adds mode=server_snapshot, totalsScope=observed_property_days
and collection metadata. Live totals sum returned daily property rows, while
manual/baseline totals retain totalsScope=captured_page_rows. Consumers must use
totalsScope and the source period; selected page rows are never substituted for
property totals. Google is Web, Bing site totals are Web+Chat and its pages are
Web. Google domain totals may include subdomains. No direct engine comparison is
introduced. The 7/30/90-day selector continues to control first-party data only;
source windows remain explicit. Status remains partial and settledThrough=null.

Acceptance: real latest snapshots reach the overview; next-file replacement is
visible without a restart; gaps, stale, missing and malformed states are tested;
authorization still precedes all reads; no credentials enter responses; admin
page is checked at desktop/mobile and light/dark. No public UI, SEO, prices,
056 migration, dependencies or collector schedules change.

Deploy using the standard release gate and upgrade.sh from the approved pushed
commit. The web process already runs as geosub, which owns snapshot files. Keep
file permissions 0600 and directory 0750. Rollback uses the prior successful
application release; collector files/timers and data remain intact. A new valid
snapshot requires no application restart. This change does not claim a complete
weekly report or unlock an experiment.

## Verification, 2026-09-05

Verified the formal release gate (601 frontend tests, lint, typecheck, audits,
checks and production build), plus 16 focused source/API tests after the bounded
read loop adjustment. Authenticated local QA used an isolated database and the
real latest snapshots: Google 4 clicks / 926 impressions over 28 days; Bing 833 /
19008 over 41 days. These are separate windows and source definitions.

Verified desktop 1280px and mobile 390px light, no horizontal overflow, keyboard
focus and 7-day filtering. Verified dark variants visually at both widths using
a temporary local-only CSS/root fixture; OS dark preference switching was not
verified because native UI permissions were unavailable. The fixture was removed
and original styles restored before commit. Missing and malformed snapshots
show labelled historical fallback; a stale snapshot missing one day shows
27/28 and the 48-hour warning. Restoring real files updates the next read.

Production deployment and post-deploy evidence are recorded separately after
release; this document alone is not a claim that deployment succeeded.
