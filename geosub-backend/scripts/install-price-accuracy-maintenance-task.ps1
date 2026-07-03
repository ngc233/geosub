param(
  [string]$TaskName = "GeoSub Price Accuracy Maintenance",
  [string]$RunAt = "03:30",
  [int]$CollectorLimit = 8,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$SkipExternalProbe
)

$ErrorActionPreference = "Stop"

$runnerScript = Join-Path $ProjectRoot "scripts\run-price-accuracy-maintenance.ps1"

if (!(Test-Path -LiteralPath $runnerScript)) {
  throw "Runner script not found: $runnerScript"
}

$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`" -CollectorLimit $CollectorLimit"
if ($SkipExternalProbe) {
  $arguments += " -SkipExternalProbe"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument $arguments

$trigger = New-ScheduledTaskTrigger -Daily -At $RunAt

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 60) `
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
  -Description "Runs daily exchange-rate sync, anomaly rechecks, due price collectors, and alert-only external price probes." `
  -Force | Out-Null

Write-Host "Scheduled task installed: $TaskName"
Write-Host "Run time: daily at $RunAt"
Write-Host "Collector limit: $CollectorLimit"
Write-Host "Runner: $runnerScript"
