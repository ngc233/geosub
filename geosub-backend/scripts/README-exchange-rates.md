# Exchange Rate Sync

This sync is designed for daily scheduled updates. The frontend should read
`latest_exchange_rates` or `get_latest_exchange_rate(...)` from the database,
not call the exchange-rate provider directly.

## Default sync

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-exchange-rates.ps1
```

Default behavior:

- Base currency: `USD`
- Quote currencies: `CNY`
- Provider: `frankfurter`
- Database target: Docker container `geosub-postgres`
- Database name: `geosub_app`

## Add more currencies later

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-exchange-rates.ps1 -BaseCurrency USD -QuoteCurrencies CNY,JPY,SGD,EUR
```

## Scheduling recommendation

Run once per day, for example shortly after midnight server time. If the
provider request fails, the previous latest active rate remains available.

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
