param(
  [string]$ProfileFile = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "data\country-tax-profiles.json"),
  [string]$SourceName = "local_tax_profile_file",
  [string]$SourceKind = "manual",
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = $env:POSTGRES_DB,
  [string]$DbUser = $env:POSTGRES_USER
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DbName)) {
  $DbName = "geosub_app"
}

if ([string]::IsNullOrWhiteSpace($DbUser)) {
  $DbUser = "geosub_admin"
}

function Quote-SqlString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return "'" + $Value.Replace("'", "''") + "'"
}

function Quote-SqlBoolean {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  if ([bool]$Value) {
    return "TRUE"
  }

  return "FALSE"
}

function Quote-SqlNumber {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
    return "NULL"
  }

  return ([decimal]$Value).ToString([Globalization.CultureInfo]::InvariantCulture)
}

function Quote-SqlDate {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "NULL"
  }

  return (Quote-SqlString $Value) + "::date"
}

function Quote-SqlTimestamp {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "NULL"
  }

  return (Quote-SqlString $Value) + "::timestamptz"
}

function Quote-SqlJson {
  param([AllowNull()][object]$Value)

  if ($null -eq $Value) {
    return "NULL::jsonb"
  }

  $json = $Value | ConvertTo-Json -Depth 30 -Compress
  return (Quote-SqlString $json) + "::jsonb"
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

function Invoke-PsqlScalar {
  param([string]$Sql)

  $result = $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q `
    -t `
    -A

  return ($result | Select-Object -First 1).Trim()
}

if (!(Test-Path -LiteralPath $ProfileFile)) {
  throw "Tax profile file not found: $ProfileFile"
}

$profiles = Get-Content -LiteralPath $ProfileFile -Raw | ConvertFrom-Json
if ($null -eq $profiles) {
  throw "Tax profile file is empty: $ProfileFile"
}

$profileList = @($profiles)
$payload = @{
  source_name = $SourceName
  source_kind = $SourceKind
  profile_file = $ProfileFile
  profile_count = $profileList.Count
}

$runId = Invoke-PsqlScalar @"
INSERT INTO country_tax_profile_sync_runs (
  source_name,
  source_kind,
  status,
  profile_count,
  raw_payload,
  started_at
)
VALUES (
  $(Quote-SqlString $SourceName),
  $(Quote-SqlString $SourceKind),
  'running',
  $($profileList.Count),
  $(Quote-SqlJson $payload),
  NOW()
)
RETURNING id;
"@

$updatedCount = 0
$needsReviewCount = 0

try {
  foreach ($profile in $profileList) {
    if ([string]::IsNullOrWhiteSpace([string]$profile.country_code)) {
      throw "Every tax profile must include country_code."
    }

    $reviewStatus = if ($profile.review_status) { [string]$profile.review_status } else { "needs_review" }
    $confidence = if ($profile.confidence) { [string]$profile.confidence } else { "low" }
    $sourceKind = if ($profile.source_kind) { [string]$profile.source_kind } else { $SourceKind }
    $syncStatus = if ($profile.sync_status) { [string]$profile.sync_status } else { "needs_review" }
    $taxTreatment = if ($profile.app_store_tax_treatment) { [string]$profile.app_store_tax_treatment } else { "unknown" }
    $calculationPolicy = if ($profile.price_calculation_policy) { [string]$profile.price_calculation_policy } else { "do_not_calculate" }

    if ($reviewStatus -ne "verified") {
      $needsReviewCount += 1
    }

    Invoke-Psql @"
SELECT upsert_country_tax_profile(
  $(Quote-SqlString ([string]$profile.country_code)),
  $(Quote-SqlString ([string]$profile.tax_type)),
  $(Quote-SqlNumber $profile.rate_min),
  $(Quote-SqlNumber $profile.rate_max),
  $(Quote-SqlBoolean $profile.applies_to_digital_services),
  $(Quote-SqlBoolean $profile.is_variable_by_region),
  $(Quote-SqlString ([string]$profile.display_note_zh)),
  $(Quote-SqlString ([string]$profile.display_note_en)),
  $(Quote-SqlString $confidence),
  $(Quote-SqlString ([string]$profile.source_label)),
  $(Quote-SqlString ([string]$profile.source_url)),
  $(Quote-SqlDate ([string]$profile.verified_at)),
  $(Quote-SqlString $taxTreatment),
  $(Quote-SqlString $calculationPolicy),
  $(Quote-SqlString $reviewStatus),
  $(Quote-SqlString ([string]$profile.frontend_note_zh)),
  $(Quote-SqlString ([string]$profile.frontend_note_en)),
  $(Quote-SqlString $sourceKind),
  $(Quote-SqlDate ([string]$profile.source_document_date)),
  $(Quote-SqlTimestamp ([string]$profile.next_review_at)),
  $(Quote-SqlString $syncStatus),
  $(Quote-SqlString ([string]$profile.sync_note)),
  $(Quote-SqlJson $profile)
);
"@

    $updatedCount += 1
  }

  $finalStatus = if ($updatedCount -eq $profileList.Count) { "succeeded" } else { "partial" }

  Invoke-Psql @"
UPDATE country_tax_profile_sync_runs
SET status = $(Quote-SqlString $finalStatus),
    updated_count = $updatedCount,
    needs_review_count = $needsReviewCount,
    completed_at = NOW(),
    error_message = NULL
WHERE id = $(Quote-SqlString $runId)::uuid;
"@

  Write-Host "Country tax profile sync $finalStatus. Run: $runId. Updated: $updatedCount/$($profileList.Count). Needs review: $needsReviewCount."
}
catch {
  $message = $_.Exception.Message

  Invoke-Psql @"
UPDATE country_tax_profile_sync_runs
SET status = 'failed',
    updated_count = $updatedCount,
    needs_review_count = $needsReviewCount,
    completed_at = NOW(),
    error_message = $(Quote-SqlString $message)
WHERE id = $(Quote-SqlString $runId)::uuid;
"@

  throw
}
