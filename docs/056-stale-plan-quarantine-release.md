# 056: confirmed-absent stale App Store prices

Bug / L3 database migration. Approved work continues the independent 056 closeout,
separate from growth collection and dashboard releases. Users should not see an
old published price when newer evidence confirms that exact plan is absent.

The migration replaces quarantine_unconfirmed_stale_app_store_prices(integer,
integer). It adds the matching product/plan/country/platform confirmed_absent
branch, only with evidence newer than the price's last check (or creation when
last_checked_at is null). The existing 14-day threshold, stale-job country scope,
product-level evidence and three-successful-refresh fallback remain intact.
Installing the function does not call it. Existing maintenance later changes
eligible published iOS prices to review/pending_review; it does not delete prices.
Reason text now checks the same evidence timestamps, so old absence evidence
cannot falsely explain a decision actually made by the retry fallback.

## Evidence before release, 2026-09-05

Current production read-only candidates: zero. The verified production backup
from 09:33:16 UTC was restored into an isolated local database. Old and new rules
both changed zero records, repeat invocation changed zero, non-candidate changes
were zero, published summaries were identical, and transaction rollback restored
both data and the original function. The two frozen ChatGPT plans had no effects.

25 transactional fixture cases passed, covering fresh/exactly-14-day prices,
older/equal/missing/pending/available evidence, identity and platform mismatches,
review/Web rows, archived/missing/out-of-scope jobs, original retry and product
absence branches, null check times, idempotency and reason attribution. The old
056 draft failed the stale-evidence/retry-reason case before the repair; the final
SQL passed it. These fixtures are not claimed as production anomalies.

There is no UI template, price/FX threshold, SEO policy or source-spec change.
No current row changes means no current rendered-layout change; acceptance uses
real source candidates, shadow output summaries, existing canonical rendering
checks and before/after production page checks. Historical 3-row simulations
remain historical evidence and are not an instruction to hide those rows again.

## Release gate and production procedure

Run the formal release gate against the current main baseline and this isolated
patch, then push one commit and require all CI checks. Re-read production
candidates before deployment. If new candidates affect frozen experiments or
change the reviewed impact, stop and reassess that concrete list.

Use standard upgrade.sh with GEOSUB_RUN_BACKFILLS=false. It must create and verify
a new backup, apply the schema migration through the existing ledger, and pass
all post-deploy checks before recording success. Do not manually call quarantine
on production as a test. Verify the function definition matches the reviewed SQL,
the migration ledger contains 056, and the web service and collection timers work.
Check representative price pages and the frozen ChatGPT metadata after release.

## Rollback

The previous application commit is fc9a3dde0aaa23ad4a37358f5054fabf37d92143.
Use the corresponding standard rollback release record for application code.
Code rollback alone does not restore this database function. Retain the original
pg_get_functiondef from the verified backup and use a separately tracked database
repair/forward migration if the function must be reverted. The local transaction
rollback has been rehearsed and restores the exact original function.

Do not restore the entire database over subsequent production writes or
automatically republish quarantined prices. Any proven mistaken row needs a
separate current-state repair list. Record final deployed SHA, backup, ledger,
health and page evidence in the release handoff after execution.
