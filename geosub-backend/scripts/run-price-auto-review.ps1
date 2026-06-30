param(
  [switch]$Execute,
  [ValidateSet("AppStoreStability", "StrictMultiSource")]
  [string]$Rule = "AppStoreStability",
  [int]$RequiredSamples = 3,
  [int]$MinConfidence = 80,
  [int]$MaxSampleAgeDays = 14,
  [int]$MinSources = 3,
  [decimal]$AbsUsdTolerance = 0.50,
  [decimal]$PercentTolerance = 1.00,
  [decimal]$MaxChangePercent = 15.00,
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin"
)

$ErrorActionPreference = "Stop"

$dryRunSql = if ($Execute) { "FALSE" } else { "TRUE" }
$absToleranceText = $AbsUsdTolerance.ToString([Globalization.CultureInfo]::InvariantCulture)
$percentToleranceText = $PercentTolerance.ToString([Globalization.CultureInfo]::InvariantCulture)
$maxChangeText = $MaxChangePercent.ToString([Globalization.CultureInfo]::InvariantCulture)

if ($Rule -eq "AppStoreStability") {
  $sql = @"
SELECT
  decision,
  reason_code,
  product_slug,
  plan_slug,
  country_code,
  source_count,
  array_to_string(platforms, ',') AS platforms,
  observation_count,
  reason
FROM run_app_store_stability_auto_review(
  $dryRunSql,
  $RequiredSamples,
  $MinConfidence,
  $MaxSampleAgeDays
);
"@
} else {
  $sql = @"
SELECT
  decision,
  reason_code,
  product_slug,
  plan_slug,
  country_code,
  source_count,
  array_to_string(platforms, ',') AS platforms,
  observation_count,
  reason
FROM run_price_auto_review(
  $dryRunSql,
  $MinSources,
  $absToleranceText,
  $percentToleranceText,
  $maxChangeText
);
"@
}

$mode = if ($Execute) { "execute" } else { "dry-run" }
Write-Host "Running price auto-review ($mode). Rule: $Rule."
if ($Rule -eq "AppStoreStability") {
  Write-Host "Required stable App Store samples: $RequiredSamples. Min confidence: $MinConfidence. Max sample age days: $MaxSampleAgeDays."
} else {
  Write-Host "Min sources: $MinSources."
}

$sql | docker exec -i $ContainerName psql `
  -U $DbUser `
  -d $DbName `
  -v ON_ERROR_STOP=1

if ($LASTEXITCODE -ne 0) {
  throw "price auto-review failed with exit code $LASTEXITCODE."
}
