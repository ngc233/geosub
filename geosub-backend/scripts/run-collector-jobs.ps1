param(
  [int]$Limit = 5,
  [string]$ContainerName = "geosub-postgres",
  [string]$DbName = "geosub_app",
  [string]$DbUser = "geosub_admin",
  [string[]]$DefaultCountryCodes = @("US", "CA", "JP", "PH"),
  [string]$ChromePath = $env:CHROME_PATH,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Quote-SqlString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return "'" + $Value.Replace("'", "''") + "'"
}

function Quote-SqlJson {
  param([object]$Value)

  $json = $Value | ConvertTo-Json -Depth 20 -Compress
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

function Invoke-PsqlJson {
  param([string]$Sql)

  $result = $Sql | docker exec -i $ContainerName psql `
    -U $DbUser `
    -d $DbName `
    -v ON_ERROR_STOP=1 `
    -q `
    -t `
    -A

  $text = ($result -join "").Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  return $text | ConvertFrom-Json
}

function Get-DueJobs {
  $forceSql = if ($Force) { "TRUE" } else { "FALSE" }

  $jobs = Invoke-PsqlJson @"
SELECT COALESCE(json_agg(row_to_json(j)), '[]'::json)
FROM (
  SELECT
    job.id,
    job.product_id,
    job.source_id,
    job.job_type,
    job.schedule,
    job.status,
    job.next_run_at,
    job.job_config,
    product.slug AS product_slug,
    product.name AS product_name,
    source.type::text AS source_type,
    source.base_url AS source_url
  FROM collector_jobs job
  JOIN products product ON product.id = job.product_id
  LEFT JOIN price_sources source ON source.id = job.source_id
  WHERE job.status = 'active'
    AND job.job_type = 'ai_pricing'
    AND (
      $forceSql
      OR job.next_run_at IS NULL
      OR job.next_run_at <= NOW()
    )
  ORDER BY job.priority DESC, job.next_run_at NULLS FIRST, job.created_at
  LIMIT $Limit
) j;
"@

  if ($null -eq $jobs) {
    return @()
  }

  return @($jobs | Where-Object { $_ -and $_.id })
}

function Get-ConfigValue {
  param([object]$Config, [string]$Name, [AllowNull()][string]$Fallback = $null)

  if ($Config -and $Config.PSObject.Properties.Name -contains $Name) {
    $value = $Config.$Name
    if ($null -ne $value -and ![string]::IsNullOrWhiteSpace([string]$value)) {
      return [string]$value
    }
  }

  return $Fallback
}

function Get-CountryCodes {
  param([object]$Config)

  if ($Config -and $Config.PSObject.Properties.Name -contains "country_codes" -and $Config.country_codes) {
    return @($Config.country_codes | ForEach-Object { [string]$_ })
  }

  return @($DefaultCountryCodes)
}

function Invoke-CollectorScript {
  param([object]$Job)

  $config = $Job.job_config
  $kind = Get-ConfigValue -Config $config -Name "collector_kind" -Fallback "unknown"
  $productSlug = [string]$Job.product_slug
  $countryCodes = Get-CountryCodes -Config $config

  if ($DryRun) {
    Write-Host "[dry-run] job $($Job.id): kind=$kind product=$productSlug countries=$($countryCodes -join ',')"
    return [pscustomobject]@{
      Status = "skipped"
      CollectorKind = $kind
      Output = "Dry run only."
      Error = $null
      RawPayload = @{ dry_run = $true; collector_kind = $kind }
    }
  }

  $scriptPath = $null
  $arguments = @()

  switch ($kind) {
    "app_store" {
      $appId = Get-ConfigValue -Config $config -Name "app_store_id"
      if ([string]::IsNullOrWhiteSpace($appId)) {
        throw "App Store collector job is missing app_store_id."
      }

      $scriptPath = Join-Path $PSScriptRoot "collect-app-store-prices.ps1"
      $arguments = @(
        "-ProductSlug", $productSlug,
        "-AppId", $appId,
        "-CountryCodes", ($countryCodes -join ","),
        "-ContainerName", $ContainerName,
        "-DbName", $DbName,
        "-DbUser", $DbUser,
        "-Force"
      )

      if (![string]::IsNullOrWhiteSpace($ChromePath)) {
        $arguments += @("-ChromePath", $ChromePath)
      }
    }
    "google_play" {
      $packageName = Get-ConfigValue -Config $config -Name "google_play_package"
      if ([string]::IsNullOrWhiteSpace($packageName)) {
        throw "Google Play collector job is missing google_play_package."
      }

      $scriptPath = Join-Path $PSScriptRoot "collect-google-play-prices.ps1"
      $arguments = @(
        "-ProductSlug", $productSlug,
        "-PackageName", $packageName,
        "-CountryCodes", ($countryCodes -join ","),
        "-ContainerName", $ContainerName,
        "-DbName", $DbName,
        "-DbUser", $DbUser,
        "-Force"
      )
    }
    "pricing_page" {
      if ($productSlug -ne "chatgpt") {
        return [pscustomobject]@{
          Status = "skipped"
          CollectorKind = $kind
          Output = "Generic pricing-page collector is not implemented yet for product '$productSlug'."
          Error = $null
          RawPayload = @{ unsupported = $true; collector_kind = $kind; product_slug = $productSlug }
        }
      }

      $pricingUrl = Get-ConfigValue -Config $config -Name "url" -Fallback "https://chatgpt.com/pricing"
      $scriptPath = Join-Path $PSScriptRoot "collect-web-prices.ps1"
      $arguments = @(
        "-ProductSlug", $productSlug,
        "-PricingUrl", $pricingUrl,
        "-CountryCodes", "US",
        "-ContainerName", $ContainerName,
        "-DbName", $DbName,
        "-DbUser", $DbUser,
        "-Force"
      )
    }
    default {
      return [pscustomobject]@{
        Status = "skipped"
        CollectorKind = $kind
        Output = "No collector is implemented for collector_kind '$kind'."
        Error = $null
        RawPayload = @{ unsupported = $true; collector_kind = $kind }
      }
    }
  }

  $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath @arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output | ForEach-Object { [string]$_ }) -join "`n"

  if ($exitCode -ne 0) {
    throw "Collector script failed with exit code $exitCode. $text"
  }

  return [pscustomobject]@{
    Status = "succeeded"
    CollectorKind = $kind
    Output = $text
    Error = $null
    RawPayload = @{ collector_kind = $kind; script = [IO.Path]::GetFileName($scriptPath) }
  }
}

function Complete-JobRun {
  param(
    [object]$Job,
    [object]$Result,
    [datetime]$StartedAt
  )

  $finishedAt = Get-Date
  $durationMs = [int]([Math]::Max(0, ($finishedAt - $StartedAt).TotalMilliseconds))
  $output = if ($Result.Output -and $Result.Output.Length -gt 2000) { $Result.Output.Substring(0, 2000) } else { $Result.Output }
  $status = [string]$Result.Status
  $errorMessage = if ($Result.Error) { [string]$Result.Error } else { $null }
  $nextRunSql = if ($status -eq "failed") { "NOW() + INTERVAL '6 hours'" } else { "NOW() + INTERVAL '24 hours'" }
  $jobStatusSql = if ($status -eq "failed") { "'failed'" } else { "'active'" }

  Invoke-Psql @"
INSERT INTO collector_job_runs (
  id,
  job_id,
  product_id,
  source_id,
  status,
  collector_kind,
  started_at,
  finished_at,
  duration_ms,
  error_message,
  output_excerpt,
  raw_payload,
  created_at
)
VALUES (
  gen_random_uuid(),
  $(Quote-SqlString $Job.id)::uuid,
  $(Quote-SqlString $Job.product_id)::uuid,
  $(if ($Job.source_id) { "$(Quote-SqlString $Job.source_id)::uuid" } else { "NULL" }),
  $(Quote-SqlString $status),
  $(Quote-SqlString $Result.CollectorKind),
  $(Quote-SqlString ($StartedAt.ToUniversalTime().ToString("o")))::timestamptz,
  $(Quote-SqlString ($finishedAt.ToUniversalTime().ToString("o")))::timestamptz,
  $durationMs,
  $(Quote-SqlString $errorMessage),
  $(Quote-SqlString $output),
  $(Quote-SqlJson $Result.RawPayload),
  NOW()
);

UPDATE collector_jobs
SET
  last_run_at = NOW(),
  next_run_at = $nextRunSql,
  success_count = success_count + $(if ($status -eq "succeeded") { 1 } else { 0 }),
  error_count = error_count + $(if ($status -eq "failed") { 1 } else { 0 }),
  last_error = $(Quote-SqlString $errorMessage),
  status = $jobStatusSql,
  updated_at = NOW()
WHERE id = $(Quote-SqlString $Job.id)::uuid;
"@
}

$jobs = @(Get-DueJobs)

if ($jobs.Count -eq 0) {
  Write-Host "No collector jobs are due."
  return
}

$summary = @{
  checked = 0
  succeeded = 0
  skipped = 0
  failed = 0
}

foreach ($job in $jobs) {
  $summary.checked += 1
  $startedAt = Get-Date
  Write-Host "Running collector job: $($job.id) product=$($job.product_slug)"

  try {
    $result = Invoke-CollectorScript -Job $job
    if ($result.Status -eq "succeeded") { $summary.succeeded += 1 }
    elseif ($result.Status -eq "skipped") { $summary.skipped += 1 }
    else { $summary.failed += 1 }
    Complete-JobRun -Job $job -Result $result -StartedAt $startedAt
  } catch {
    $summary.failed += 1
    $failedResult = [pscustomobject]@{
      Status = "failed"
      CollectorKind = Get-ConfigValue -Config $job.job_config -Name "collector_kind" -Fallback "unknown"
      Output = $null
      Error = $_.Exception.Message
      RawPayload = @{ error = $_.Exception.Message }
    }
    Complete-JobRun -Job $job -Result $failedResult -StartedAt $startedAt
    Write-Host "Failed: $($_.Exception.Message)"
  }
}

Write-Host "Collector jobs complete. Checked: $($summary.checked). Succeeded: $($summary.succeeded). Skipped: $($summary.skipped). Failed: $($summary.failed)."
