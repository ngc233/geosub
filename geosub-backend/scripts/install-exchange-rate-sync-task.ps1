param(
  [string]$TaskName = "GeoSub Exchange Rate Sync",
  [string]$RunAt = "03:15",
  [int]$IntervalHours = 12,
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

if ($IntervalHours -ne 12) {
  throw "IntervalHours must be 12 so the task stays inside the 18-hour freshness window."
}

$firstRun = [datetime]::ParseExact($RunAt, "HH:mm", $null)
$secondRun = $firstRun.AddHours($IntervalHours).ToString("HH:mm")
$triggers = @(
  New-ScheduledTaskTrigger -Daily -At $RunAt
  New-ScheduledTaskTrigger -Daily -At $secondRun
)

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
  -Trigger $triggers `
  -Settings $settings `
  -Principal $principal `
  -Description "Twice-daily GeoSub exchange-rate sync into PostgreSQL." `
  -Force | Out-Null

Write-Host "Scheduled task installed: $TaskName"
Write-Host "Daily run times: $RunAt and $secondRun"
Write-Host "Runner: $runnerScript"
