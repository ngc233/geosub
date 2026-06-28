param(
  [string]$ProductSlug = "chatgpt",
  [string[]]$CountryCodes = @("US", "CA", "JP", "PH"),
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
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
  -Name "Step 1/4: collecting App Store prices." `
  -ScriptPath (Join-Path $scriptDir "collect-app-store-prices.ps1") `
  -Arguments ($commonArgs + @("-CountryCodes", ($CountryCodes -join ",")))

Invoke-CollectorStep `
  -Name "Step 2/4: collecting Web prices." `
  -ScriptPath (Join-Path $scriptDir "collect-web-prices.ps1") `
  -Arguments ($commonArgs + @("-CountryCodes", "US"))

Invoke-CollectorStep `
  -Name "Step 3/4: collecting Google Play evidence." `
  -ScriptPath (Join-Path $scriptDir "collect-google-play-prices.ps1") `
  -Arguments ($commonArgs + @("-CountryCodes", "US"))

if ($DryRun) {
  Write-Host "Step 4/4: skipping auto-review because this is a dry run."
} else {
  Invoke-Step `
    -Name "Step 4/4: running auto-review." `
    -ScriptPath (Join-Path $scriptDir "run-price-auto-review.ps1") `
    -Arguments @(
      "-Execute",
      "-ContainerName", $ContainerName,
      "-DbName", $DbName,
      "-DbUser", $DbUser
    )
}

Write-Host "Price pipeline complete."
