param(
  [string]$TaskName = "GeoSub Country Tax Profile Sync",
  [string]$RunAt = "04:30",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$runnerScript = Join-Path $ProjectRoot "scripts\run-country-tax-profile-sync.ps1"

if (!(Test-Path -LiteralPath $runnerScript)) {
  throw "Runner script not found: $runnerScript"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`""

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At $RunAt

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
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
  -Description "Weekly GeoSub country tax profile sync into PostgreSQL." `
  -Force | Out-Null

Write-Host "Scheduled task installed: $TaskName"
Write-Host "Weekly run time: Monday $RunAt"
Write-Host "Runner: $runnerScript"
