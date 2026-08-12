# Exchange Rate Sync

This sync is designed for scheduled updates every 12 hours. The frontend should read
`latest_exchange_rates` or `get_latest_exchange_rate(...)` from the database,
not call the exchange-rate provider directly.

## Default sync

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-exchange-rates.ps1
```

Default behavior:

- Base currency: `USD`
- Quote currencies: all 36 currencies required by the current price and display-currency policy
- Provider: `frankfurter`
- Database target: Docker container `geosub-postgres`
- Database name: `geosub_app`

The PowerShell command above remains the active production implementation during D2-2.
The cross-platform Node.js replacement is available for deterministic shadow checks:

```powershell
node .\scripts\sync-exchange-rates.mjs --dry-run --json --quotes CNY,JPY,SGD,EUR --fixture .\scripts\fixtures\exchange-rates-full.json
```

Fixture-based dry runs do not access a provider or write the database. Production cutover
requires three successful scheduled shadow comparisons before the Linux wrapper changes.

On Linux, the read-only comparison is disabled by default. Enable it explicitly in
`/etc/geosub/geosub.env` only during the observation window:

```text
GEOSUB_EXCHANGE_RATE_SHADOW_VERIFY=1
```

The legacy PowerShell sync remains the only writer. The verifier replays provider payloads
stored by that completed run, writes JSONL evidence under `logs/exchange-rate-shadow`, and
cannot turn a successful legacy sync into a failed scheduled task.

The wrapper also prints the independent-cycle gate after every shadow attempt. You can
inspect it without running a sync:

```bash
node geosub-backend/scripts/check-exchange-rate-shadow-evidence.mjs --required-cycles 3
```

Repeated checks of one legacy run count once. A failed latest cycle resets the consecutive
pass count. The command returning ready is evidence for review, not permission to switch
the production writer automatically.

## Override the currency set

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-exchange-rates.ps1 -BaseCurrency USD -QuoteCurrencies CNY,JPY,SGD,EUR
```

## Scheduling recommendation

Run every 12 hours. If the provider request fails, the previous rate remains
available to the public site, but collectors reject it after 18 hours so stale
conversion data cannot silently enter the price pipeline.

## Install the Windows scheduled task

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-exchange-rate-sync-task.ps1 -RunAt "03:15"
```

Task name: `GeoSub Exchange Rate Sync`

The task runs:

```powershell
.\scripts\run-exchange-rate-sync.ps1
```

Logs are written to:

```text
.\logs\exchange-rate-sync-YYYY-MM-DD.log
```

## Check task status

```powershell
Get-ScheduledTask -TaskName "GeoSub Exchange Rate Sync"
Get-ScheduledTaskInfo -TaskName "GeoSub Exchange Rate Sync"
```
