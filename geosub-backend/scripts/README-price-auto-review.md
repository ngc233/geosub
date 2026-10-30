# GeoSub price auto-review

This step decides whether pending price observations can be promoted automatically.

## V1 default rule

V1 uses App Store as the primary official price source. The default
auto-review rule is App Store stability:

- Group by product + plan + country + billing platform + price type.
- Look at the latest 3 App Store observations.
- Compare the original local `raw_price + currency`, not USD conversion,
  because exchange rates move independently from the product price.
- If all 3 samples match, and the minimum confidence is at least 80, pending
  observations in that group are approved automatically.
- If there are fewer than 3 samples, mixed prices, low confidence, incomplete
  fields, or samples older than 14 days, the group remains pending for further automated evidence.

If a group passes the rule, the script calls `approve_price_observation(...)`
and writes the approved price into `region_prices`.

The database function is:

```text
run_app_store_stability_auto_review(...)
```

## Strict multi-source rule

The strict multi-source rule is conservative and is kept for later:

- A product + plan + country + price type group needs at least 3 different sources.
- The sources should normally be App Store, Web, and Google Play.
- Prices must be close enough after USD conversion.
- Low-confidence observations stay pending.
- Large changes against an existing published price stay pending.

## Dry run

```powershell
.\scripts\run-price-auto-review.ps1
```

Dry run shows the decision without changing review status.

## Execute

```powershell
.\scripts\run-price-auto-review.ps1 -Execute
```

Execute mode approves only groups that satisfy the rule. The legacy `manual_review` decision means that automatic evidence is not sufficient yet; it does not require an operator or payment screenshot.

Run the old strict multi-source rule explicitly:

```powershell
.\scripts\run-price-auto-review.ps1 -Rule StrictMultiSource -Execute
```

## Defaults

- App Store required samples: `3`
- App Store minimum confidence: `80`
- App Store maximum sample age: `14 days`
- Strict minimum sources: `3`
- Absolute USD tolerance: `$0.50`
- Percent tolerance: `1%`
- Maximum change against existing published price: `15%`

The strict database function is `run_price_auto_review(...)`, created by:

```text
sql/schema/010_price_auto_review_rules.sql
```

## Automatic identity lifecycle (schema:058)

After the existing auto-review, a successfully collected product is checked for
recurring identity ambiguity. Three successive official iOS observations after
its last verified price, within 14 days and spanning at least 24 hours, must all
carry the collector's explicit same-plan/multiple-price ambiguity. Samples with
the same observation timestamp count once. A network failure, one anomaly,
short retry burst, different platform/source, or a newer clean sample cannot
quarantine a published price. Exhausted/ignored anomalies remain evidence.

A qualifying price moves to `review / pending_review`, retaining its historical
amount/date. The audit records the three observation IDs; derived affordability
is refreshed. Only products completed in this batch are changed, matching the
existing cache invalidation scope. No new timer or permanent manual hold is added.
Regular collection and existing stability approval restore clean prices
automatically. Identity tracking tickets close only on fresh matching automatic
approval; unrelated review tickets stay untouched. The read-only function
`recurring_app_store_identity_ambiguities(product_slug)` previews the exact scope.
Migration installation performs no data writes. Approval thresholds and canonical
plan matching are unchanged; this automates exception handling, not proof of every
subscription's final checkout price.


## Claude Pro Web local pilot (2026-10-29)

`claude-us-pro` collects only the US Pro monthly Web price. The exact pricing-page
`pro_monthly` field must agree with the official Pro help article's explicit US
monthly statement. Annual equivalents, Max starting prices, seats, mobile prices
and other regions are excluded. Both document hashes and evidence rows are kept.
The registered source is pending-only: it has no auto_review entry and does not
activate any collector job or change the existing database.

The automatic-review candidate can only run against localhost and a dedicated
`geosub_collector_test_claude_*` database. It reuses the existing independent
three-sample/24-hour and large-change five-sample/72-hour Web gates, requires both
documents, and cannot publish a product. The normal CLI rejects an automatic
Claude source configuration before connecting to the database. Synthetic dated
test observations do not establish real elapsed-time stability. Production
activation is a separate policy and release decision; see RFC section 24.

### Canonical scheduler acceptance

`tests/claude-pro-scheduler.mjs` exports `verifyClaudeProScheduler(client, databaseUrl)`.
Run it only with a newly created, schema-only local test database named
`geosub_collector_test_claude_scheduler_*` on localhost:55433. The caller owns
creation and final deletion; the function checks the connection and empty product
catalog before seeding fixtures. Do not pass the normal preview or production URL.

The harness runs the actual canonical shell and PowerShell scheduler, database
bridge and collector CLI. Its child-only HTTP preload accepts the two reviewed
Claude URLs and serves fixed HTML without a network fallback. Assertions cover
due/paused/in-flight guards, dry-run, concurrent locking, same-day deduplication,
failure propagation, retry deadlines, periodic recovery and stale-run cleanup.
Normal source configuration remains pending-only. Existing Web/iOS prices and
lifecycle states are compared against their post-seed baseline, including the
installed published-price trigger. Simulated retry deadlines are not real
24/72-hour stability evidence. No system timer is installed. See RFC section 25.

### Local configuration preflight

Use `preflight-official-web-prices.mjs` to inspect configuration without fetching
an official page, changing jobs, creating evidence or publishing prices:

```bash
node scripts/preflight-official-web-prices.mjs --source-key claude-us-pro --product-slug claude --country-codes US
```

It requires an explicitly supplied `DATABASE_URL`; it does not load environment
files. Only localhost:55433 and the named local preview or disposable collector
test databases are accepted. The actual client parameters are checked before
connecting. Catalog/job reads run in a verified read-only transaction, followed
by rollback. Credentials and raw database errors are omitted from CLI output.

The report separates canonical collection readiness from configured task
readiness. It checks product/plan archives, cycle, country/currency, exact market
scope, scheduler-compatible job type, paused jobs and duplicate active price
jobs. `task_type_suggestion` is the collector_jobs.job_type column;
`task_config_suggestion` contains only the job_config fields. For Claude, the
suggested task type is ai_pricing and the source remains pending-only. Reuse an
appropriate existing snapshot task rather than adding a redundant third task.
The output is a proposal and never applies it. It does not check live source
health, FX, sample stability or publication readiness, and does not activate a
timer or grant permission to mutate an existing database. See RFC section 27.

### Isolated reuse of a Claude snapshot task

`lib/claude-pro-job-reuse.mjs` exports `reuseClaudeProSnapshotJob` for a single
existing Claude task. The default call previews the change in a read-only
transaction. Application requires a fingerprint from the reviewed preview and
is restricted to localhost:55433 databases named
`geosub_collector_test_claude_scheduler_*`. Existing preview and production
application are rejected before queries. The admin UI now uses a guarded local
CLI bridge; production application remains disabled.

The target must be paused, have no in-flight run and have no competing price
task. Canonical US/Pro/monthly identity, currency and lifecycle are rechecked.
Application locks the catalog/task rows, binds the maintained source, switches
the type to ai_pricing and the adapter to claude-us-pro, and keeps the same ID,
historical runs, cumulative successes, schedule and interval. It remains paused.
Unrelated task configuration is preserved; the obsolete URL and transient retry
keys are removed. Legacy consecutive errors are recorded in
job_config.official_web_conversion and reset for the new source, together with
last_error. This is a source configuration change, not a successful collection.
New source failures must start at the normal first retry rather than inherit the
old source's retry budget.

`tests/claude-pro-job-reuse.mjs` verifies actual conversion, rollback, idempotence,
source attribution and canonical scheduler collection in a fresh disposable DB.
Its only activation is an explicit test-fixture step after conversion; HTTP
responses are fixtures and no formal prices are changed. Existing databases,
real task activation and production admission remain outside this candidate.
See RFC section 28.

### Admin task reuse workbench (2026-10-29)

The Claude product scope on /admin/collector-jobs exposes an explicit task selector,
read-only preview and confirmation that keeps the job paused. Task detail links
retain filters and select the exact job in this workbench. Switching jobs discards
the previous preview. Manage permission is required on the server before invoking
the bridge; the UI uses the shared capability form. Existing preview databases
can only preview; apply still requires the dedicated disposable database prefix.

The bridge uses execFile without a shell and never returns raw connection errors.
Application records the authenticated admin in audit_logs within the same task
conversion transaction. Conversion keeps the task paused. See RFC section 29
for the reuse browser, disposable database and regression acceptance evidence.

### Explicit pending-only activation (2026-10-29)

The same workbench now offers an activation preflight and confirmation for a
configured Claude task. Activation uses a distinct intent-bound fingerprint and
rechecks canonical identity, source binding, paused state, competing price tasks
and in-flight runs. It keeps the existing disposable-database write boundary.
The audit actor is the authenticated administrator, and activation/audit commit
together. Repeated activation leaves the schedule and retry history unchanged.

Activation only sets active and next_run_at; the canonical scheduler performs the
collection. It never runs source HTTP inside a UI request or opens automatic
review/publication. The generic run-now entry cannot bypass this Claude preflight.
The existing pause entry remains available. Checking an active task refreshes its
actual runs; changing active/paused state clears stale form feedback.

RFC section 30 records actual UI activation, fixture-backed canonical execution,
pending observation and two evidences, followed by UI pause and zero further HTTP
requests/runs. No existing database, production task or publication rule changed.


### Isolated review admission through the canonical scheduler (2026-10-29)

The maintained Claude source remains pending-only. The operator CLI can now opt a
configured task into `claude-us-pro-local-review-v1` inside a dedicated
`localhost:55433/geosub_collector_test_claude_scheduler_*` database. This is a local
candidate, not production admission. It does not change review thresholds, permit
source replacement or publish the product.

Use `reuse-claude-pro-job.mjs` with an explicit task ID and DATABASE_URL. Operations
are paired: `review-preview` / `review-apply`, `review-enable-preview` /
`review-enable`, and `review-revoke-preview` / `review-revoke`. Every mutation
requires its matching fresh fingerprint and an active owner/admin `--actor-id`.
Preview is read-only; admission keeps the task paused. Enabling uses a new preview.
Task configuration and audit commit together. Ordinary pending-only activation
refuses an admitted candidate, including the existing admin action.

The scheduler forwards the persisted `official_web_review_policy` as
`--review-policy`. The normal collector checks the explicit URL, actual driver
connection parameters and actual database before writes. It then uses the same
stable-sample, two-document, freshness, anomaly and source-ownership gates as the
isolated algorithm. Old pending-only observations cannot qualify. The policy ID
is stored with admitted observations. No source HTTP runs in an admin request.

Revocation clears the policy and pauses the task. It retains valid prices,
evidence and history; ordinary reactivation returns to pending-only. No task
activation or database changes were applied outside disposable acceptance DBs.
RFC section 31 records 15 new canonical-execution cases, the original 18-case
regression, fixture-only source responses and explicit synthetic sample history.
The admin admission UI is described below; production/cache/report rollout
remains outside this local candidate.


### Admin review admission and revocation (2026-10-29)

The existing Claude task workbench now exposes the operator candidate controls.
After conversion, preview admission and confirm it while keeping the task paused;
then preview and explicitly enable the automatic-review candidate. Revocation has
its own preview/confirmation, pauses the task and retains evidence and valid prices.
The existing local disposable database boundary and data rules are unchanged.

The UI receives only a pending/candidate/unknown enum. Unknown policies never offer
an enable action; a previewed revoke can remove them. Empty/false configuration
keys are actually removed, and ordinary activation cannot bypass them. No raw
unknown policy is echoed. Mode changes clear stale forms and fingerprints.

Every action authorizes management on the server and uses the authenticated actor;
the underlying candidate additionally rechecks the active administrator in its DB.
The bridge accepts only fixed operations, and the UI distinguishes admission from
activation and execution. Checking status refreshes actual canonical run results.
RFC section 32 records the final desktop/mobile light/dark and disposable database
browser acceptance. Production, real elapsed stability evidence and cache/report
rollout remain unverified; the maintained source registration stays pending-only.
