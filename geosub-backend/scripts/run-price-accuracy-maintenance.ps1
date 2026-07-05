param(
  [int]$CollectorLimit = 5,
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [switch]$SkipExchangeRates,
  [switch]$SkipCollectors,
  [switch]$SkipExternalProbe,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-PowerShellHost {
  $pwsh = Get-Command "pwsh" -ErrorAction SilentlyContinue
  if ($pwsh) {
    return $pwsh.Source
  }

  $windowsPowerShell = Get-Command "powershell" -ErrorAction SilentlyContinue
  if ($windowsPowerShell) {
    return $windowsPowerShell.Source
  }

  $windowsPowerShellExe = Get-Command "powershell.exe" -ErrorAction SilentlyContinue
  if ($windowsPowerShellExe) {
    return $windowsPowerShellExe.Source
  }

  throw "PowerShell executable not found. Install PowerShell 7 or Windows PowerShell."
}

$powerShellHost = Get-PowerShellHost

function Invoke-Step {
  param(
    [string]$Name,
    [string]$Command,
    [string[]]$Arguments = @()
  )

  Write-Host ""
  Write-Host "=== $Name ==="
  & $Command @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE."
  }
}

function Invoke-Psql {
  param([string]$Sql)

  $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed with exit code $LASTEXITCODE."
  }
}

function Invoke-PsqlFile {
  param([string]$SqlPath)

  Get-Content -LiteralPath $SqlPath | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "psql file failed with exit code $LASTEXITCODE."
  }
}

Write-Host "GeoSub price accuracy maintenance"
Write-Host "Mode: layered collection, official evidence first, external probes as alerts only."

if ($SkipExchangeRates) {
  Write-Host "Exchange-rate sync skipped."
} else {
  Invoke-Step `
    -Name "1/6 Sync exchange rates" `
    -Command $powerShellHost `
    -Arguments @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", (Join-Path $scriptDir "sync-exchange-rates.ps1"),
      "-ContainerName", $ContainerName,
      "-DbName", $DbName,
      "-DbUser", $DbUser
    )
}

if ($DryRun) {
  Write-Host ""
  Write-Host "=== 2/6 Queue anomaly rechecks ==="
  Write-Host "[dry-run] Would queue recent App Store anomaly rechecks."
} else {
  Write-Host ""
  Write-Host "=== 2/6 Queue anomaly rechecks ==="
  Invoke-Psql @"
SELECT *
FROM queue_app_store_anomaly_rechecks(7, 12);
"@
}

if ($SkipCollectors) {
  Write-Host "Collector execution skipped."
} else {
  $collectorArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $scriptDir "run-collector-jobs.ps1"),
    "-Limit", [string]$CollectorLimit,
    "-ContainerName", $ContainerName,
    "-DbName", $DbName,
    "-DbUser", $DbUser
  )

  if ($DryRun) {
    $collectorArgs += "-DryRun"
  }

  if ($Force) {
    $collectorArgs += "-Force"
  }

  Invoke-Step `
    -Name "3/6 Run due collector jobs" `
    -Command $powerShellHost `
    -Arguments $collectorArgs
}

if ($DryRun) {
  Write-Host ""
  Write-Host "=== 4/6 Repair or hide anomalous App Store promotions ==="
  Write-Host "[dry-run] Would repair clean replacements and hide suspicious published prices."
} else {
  Write-Host ""
  Write-Host "=== 4/6 Repair or hide anomalous App Store promotions ==="
  Invoke-PsqlFile (Join-Path $scriptDir "..\sql\049_quarantine_app_store_anomaly_promotions.sql")
}

if ($DryRun) {
  Write-Host ""
  Write-Host "=== 5/6 Clean App Store plan-matching artifacts ==="
  Write-Host "[dry-run] Would archive unused polluted plans and hide likely annual monthly-plan prices."
} else {
  Write-Host ""
  Write-Host "=== 5/6 Clean App Store plan-matching artifacts ==="
  Invoke-PsqlFile (Join-Path $scriptDir "..\sql\050_cleanup_app_store_plan_matching_artifacts.sql")
}

if ($SkipExternalProbe) {
  Write-Host "External probe skipped."
} else {
  Invoke-Step `
    -Name "6/6 Run OpenTheRank difference probe" `
    -Command "node" `
    -Arguments @(
      (Join-Path $scriptDir "probe-opentherank-price-diffs.mjs"),
      "--container", $ContainerName,
      "--db", $DbName,
      "--user", $DbUser
    )
}

Write-Host ""
Write-Host "Price accuracy maintenance complete."
