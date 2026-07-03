param(
  [string]$ProductSlug = "chatgpt",
  [string[]]$CountryCodes = @("ALL"),
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [switch]$IncludeWeb,
  [switch]$IncludeGooglePlay,
  [switch]$RunStrictAutoReview,
  [switch]$SkipAppStoreStabilityAutoReview,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-Step {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string[]]$Arguments
  )

  Write-Host $Name
  & powershell -ExecutionPolicy Bypass -File $ScriptPath @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE."
  }
}

function Invoke-SqlFileStep {
  param(
    [string]$Name,
    [string]$SqlPath
  )

  Write-Host $Name
  Get-Content -LiteralPath $SqlPath | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1

  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE."
  }
}

function Invoke-CollectorStep {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string[]]$Arguments
  )

  try {
    Invoke-Step -Name $Name -ScriptPath $ScriptPath -Arguments $Arguments
  } catch {
    Write-Warning "$Name did not complete. The pipeline will continue with other sources."
    Write-Warning $_.Exception.Message
  }
}

$commonArgs = @(
  "-ProductSlug", $ProductSlug,
  "-ContainerName", $ContainerName,
  "-DbName", $DbName,
  "-DbUser", $DbUser
)

if ($DryRun) {
  $commonArgs += "-DryRun"
}

if ($Force) {
  $commonArgs += "-Force"
}

Invoke-CollectorStep `
  -Name "Step 1/2: collecting App Store prices." `
  -ScriptPath (Join-Path $scriptDir "collect-app-store-prices.ps1") `
  -Arguments ($commonArgs + @("-CountryCodes", ($CountryCodes -join ",")))

if ($IncludeWeb) {
  Invoke-CollectorStep `
    -Name "Optional: collecting Web price evidence." `
    -ScriptPath (Join-Path $scriptDir "collect-web-prices.ps1") `
    -Arguments ($commonArgs + @("-CountryCodes", "US"))
} else {
  Write-Host "Optional Web collection skipped. V1 official price flow uses App Store as the primary source."
}

if ($IncludeGooglePlay) {
  Invoke-CollectorStep `
    -Name "Optional: collecting Google Play evidence." `
    -ScriptPath (Join-Path $scriptDir "collect-google-play-prices.ps1") `
    -Arguments ($commonArgs + @("-CountryCodes", "US"))
} else {
  Write-Host "Optional Google Play collection skipped. V1 official price flow uses App Store as the primary source."
}

if ($DryRun) {
  Write-Host "Step 2/2: skipping auto-review because this is a dry run."
} elseif ($RunStrictAutoReview) {
  Invoke-Step `
    -Name "Step 2/2: running strict multi-source auto-review." `
    -ScriptPath (Join-Path $scriptDir "run-price-auto-review.ps1") `
    -Arguments @(
      "-Execute",
      "-Rule", "StrictMultiSource",
      "-ContainerName", $ContainerName,
      "-DbName", $DbName,
      "-DbUser", $DbUser
    )
} elseif ($SkipAppStoreStabilityAutoReview) {
  Write-Host "Step 2/2: App Store stability auto-review skipped. Review observations manually in the admin review center."
} else {
  Invoke-Step `
    -Name "Step 2/2: running App Store stability auto-review." `
    -ScriptPath (Join-Path $scriptDir "run-price-auto-review.ps1") `
    -Arguments @(
      "-Execute",
      "-Rule", "AppStoreStability",
      "-RequiredSamples", "3",
      "-ContainerName", $ContainerName,
      "-DbName", $DbName,
      "-DbUser", $DbUser
    )
}

if (!$DryRun) {
  Invoke-SqlFileStep `
    -Name "Post-review: repairing or hiding anomalous App Store promotions." `
    -SqlPath (Join-Path $scriptDir "..\sql\049_quarantine_app_store_anomaly_promotions.sql")

  Invoke-SqlFileStep `
    -Name "Post-review: cleaning App Store plan-matching artifacts." `
    -SqlPath (Join-Path $scriptDir "..\sql\050_cleanup_app_store_plan_matching_artifacts.sql")
}

Write-Host "Price pipeline complete."
