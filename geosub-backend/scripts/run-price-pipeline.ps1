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
if ([string]::IsNullOrWhiteSpace($ProductSlug)) {
  throw "The compatibility entrypoint requires one explicit product slug."
}
if ($IncludeWeb -or $IncludeGooglePlay -or $RunStrictAutoReview) {
  throw "Legacy optional collection/review switches require separate configured collector jobs."
}
$runnerArgs = @(
  "-ProductSlug", $ProductSlug, "-CountryCodes", ($CountryCodes -join ","),
  "-CollectorKind", "app_store", "-PrimarySourceOnly"
)
if ($DryRun) { $runnerArgs += "-DryRun" }
if ($Force) { $runnerArgs += "-Force" }
if ($SkipAppStoreStabilityAutoReview) { $runnerArgs += "-SkipAutoReview" }
$backend = Split-Path -Parent $PSScriptRoot
if ([IO.Path]::DirectorySeparatorChar -eq '/') {
  if (@('ContainerName','DbName','DbUser') | Where-Object { $PSBoundParameters.ContainsKey($_) }) {
    throw "Linux compatibility uses the canonical collector database configuration; direct DB overrides are unsupported."
  }
  $prior = @{}
  $overrides = @{ GEOSUB_BACKEND_DIR = $backend }
  try {
    foreach ($key in $overrides.Keys) {
      $prior[$key] = [Environment]::GetEnvironmentVariable($key)
      [Environment]::SetEnvironmentVariable($key, $overrides[$key])
    }
    & /bin/bash (Join-Path $backend "deploy/linux-arm64/run-collector-jobs.sh") @runnerArgs
    if ($LASTEXITCODE -ne 0) { throw "Canonical collector runner failed with exit code $LASTEXITCODE." }
  } finally {
    foreach ($key in $overrides.Keys) { [Environment]::SetEnvironmentVariable($key, $prior[$key]) }
  }
} else {
  $parameters = @{
    ProductSlug = $ProductSlug
    CountryCodes = $CountryCodes
    CollectorKind = "app_store"
    PrimarySourceOnly = $true
    ContainerName = $ContainerName
    DbName = $DbName
    DbUser = $DbUser
    DryRun = $DryRun
    Force = $Force
    SkipAutoReview = $SkipAppStoreStabilityAutoReview
  }
  & (Join-Path $PSScriptRoot "run-collector-jobs.ps1") @parameters
  if (!$?) { throw "Canonical collector runner failed." }
}
