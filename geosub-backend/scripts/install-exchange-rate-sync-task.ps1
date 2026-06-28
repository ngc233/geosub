param(
  [string]$TaskName = "GeoSub Exchange Rate Sync",
  [string]$RunAt = "03:15",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$runnerScript = Join-Path $ProjectRoot "scripts\run-exchange-rate-sync.ps1"

if (!(Test-Path -LiteralPath $runnerScript)) {
  throw "Runner script not found: $runnerScript"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`""

$trigger = New-ScheduledTaskTrigger -Daily -At $RunAt

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Daily GeoSub exchange-rate sync into PostgreSQL." `
  -Force | Out-Null

Write-Host "Scheduled task installed: $TaskName"
Write-Host "Daily run time: $RunAt"
Write-Host "Runner: $runnerScript"
